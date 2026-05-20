import { Expert } from '../data/experts';

export interface LessonContext {
  title: string;
  grade: string;
  text: string;
  confusion: string;
  purpose: string;
}

export interface DiscussionMessage {
  expertId: string;
  content: string;
}

/**
 * Utility for simple delay to avoid hitting rate limits too fast
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getApiConfig() {
  const baseUrl = localStorage.getItem('custom_api_base_url') || 'https://api.deepseek.com/v1';
  const apiKey = localStorage.getItem('custom_api_key') || '';
  const model = localStorage.getItem('custom_api_model') || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('未配置 API Key。请点击右上角设置图标填写您的 API Base URL 和 API Key。');
  }

  return { baseUrl, apiKey, model };
}

async function callOpenAI(systemPrompt: string, userPrompt: string, temperature: number = 0.7): Promise<string> {
  const { baseUrl, apiKey, model } = getApiConfig();

  const endpoint = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    })
  });

  if (!response.ok) {
    let errorText = '';
    try {
      const errJson = await response.json();
      errorText = errJson.error?.message || JSON.stringify(errJson);
    } catch (e) {
      errorText = await response.text();
    }
    throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function generateRound1(
  expert: Expert,
  context: LessonContext
): Promise<string> {
  const purposeNote = context.purpose || '日常教学';

  const prompt = `老师正在备课，需要你给出具体可落地的教学建议。

课文：《${context.title}》
年级：${context.grade}
备课用途：${purposeNote}
${context.text ? `课文原文：\n${context.text}\n` : ''}
老师的具体问题：
${context.confusion}

【你的任务：直接给方案，不讲理论】

请针对老师提出的具体问题，给出清晰可执行的答案。

核心要求：
1. **直接给步骤**：老师问什么就答什么。问导入怎么做，你就直接说"第一步……第二步……"；问某个词语怎么教，就说"先……再……最后……"。
2. **可以立刻用**：具体到课堂话语、活动步骤、板书设计、时间分配。老师看完就能直接用。
3. **体现你的风格**：把你的教学主张（${expert.coreView}）融入到具体做法里，而不是单独讲理论。
4. **字数**：200～300字，精炼有力。
5. **禁止**：不要大段铺垫理念，不要"可以考虑……""建议尝试……"这类模糊表述，直接说"这样做"。`;

  return await callOpenAI(expert.systemPrompt, prompt, 0.7);
}

export async function generateRound2(
  expert: Expert,
  context: LessonContext,
  round1Messages: DiscussionMessage[],
  experts: Expert[],
  teacherFeedback: string
): Promise<string> {
  const otherMessages = round1Messages
    .filter((m) => m.expertId !== expert.id)
    .map((m) => {
      const exp = experts.find((e) => e.id === m.expertId);
      return `【${exp?.name}的方案】：\n${m.content}`;
    })
    .join('\n\n');

  const prompt = `课文：《${context.title}》${context.grade}

=== 老师的追问 ===
${teacherFeedback || '（老师暂无追问）'}

=== 其他专家的第一轮建议 ===
${otherMessages}

【你的任务：直接回应，并给出你的替代方案】

你已经看了其他专家的具体方案。现在是交锋时间——说出你真实的判断。

要求：
1. **明确表态**：哪个方案你认可？哪个你不认同？直接点名，说清楚原因（一句话即可）。
2. **给替代做法**：对你不认同的部分，必须给出你自己的具体替代方案，不能只否定。
3. **回应老师**：老师有追问的，优先具体解答。
4. 字数 150～250字，保持你的个人口吻和风格。`;

  return await callOpenAI(expert.systemPrompt, prompt, 0.8);
}

export async function generateRound3(
  expert: Expert,
  context: LessonContext,
  allHistory: string,
  teacherFeedback: string
): Promise<string> {
  const prompt = `课文：《${context.title}》${context.grade}

=== 前两轮研讨记录 ===
${allHistory}

=== 老师在第三轮前的最终反馈 ===
${teacherFeedback || '（无）'}

【你的任务：给老师一个最终的明确结论】

研讨到了收尾阶段，请给老师一个清晰的最终建议。

要求：
1. **明确推荐**：直接说"我最终推荐这样做：……"，给出你认为最优的具体方案。
2. **吸收共识**：如果你认同某位同行的某个做法，说"我同意××的……，可以和我的……结合使用"。
3. **保留分歧**：若有坚持不让的立场，说"这里我仍然坚持……，因为……"。
4. **给老师一句话**：用你的风格，给上这节课的老师一句有温度的提醒或鼓励。
5. 字数 150～250字。`;

  return await callOpenAI(expert.systemPrompt, prompt, 0.5);
}

export async function generateCustomExpertProfile(
  name: string,
  uploadedContent: string
): Promise<{ title: string; coreView: string; perspective: string; systemPrompt: string }> {
  const prompt = `你是一位专业的教育AI系统设计师。
用户上传了一位教育专家（${name}）的资料文本，请你分析后，为这位专家生成一个角色扮演的配置文件，用于AI圆桌研讨模拟。

【上传的资料内容】
${uploadedContent.slice(0, 6000)}

请输出一个严格的JSON对象，格式如下（不要输出任何JSON以外的内容）：
{
  "title": "这位专家的简短职位/头衔（10字以内）",
  "coreView": "核心教学理念标签（5-10字）",
  "perspective": "在圆桌讨论中，这位专家最常从哪个角度发言（20字以内）",
  "systemPrompt": "完整的角色扮演系统提示词，要求：1.提炼出这位专家的核心理念（尽量直接引用原文语录）；2.描述其教学方法论；3.刻画其语言表达风格和标志性句式；4.说明在圆桌讨论中如何与其他老师互动。字数在500-1000字之间。"
}`;

  const result = await callOpenAI(
    '你是一位专业的教育AI系统设计师，擅长从资料中提炼专家画像。请严格按JSON格式输出，不要有任何多余内容。',
    prompt,
    0.5
  );

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      title: `${name}老师`,
      coreView: '语文教育',
      perspective: '从专业教学角度发言，提供实践建议',
      systemPrompt: `你是${name}，一位有丰富教学经验的语文教育专家。\n\n${uploadedContent.slice(0, 1000)}`,
    };
  }
}

export async function generateFinalLessonPlan(
  context: LessonContext,
  expertsMap: Record<string, Expert>,
  fullHistory: string
): Promise<string> {
  const expertsList = Object.values(expertsMap)
    .map((e) => e.name)
    .join('、');

  const purpose = context.purpose || '日常教学';

  const purposeGuide: Record<string, string> = {
    '公开课·示范课': '本次教案用于公开课/示范课：需精致完整，各环节设计意图清晰，语言表达展现教学亮点，适合展示和观摩，可适当增加板书设计和过渡语示例。',
    '日常教学': '本次教案用于日常课堂：注重实用，简洁明了，便于直接操作，不追求形式精致，重点写清楚"老师说什么、学生做什么"。',
    '教研课': '本次教案用于教研活动：突出研究性，体现教学理念，重点环节需附上设计理由，适当引用名师观点作为理论支撑。',
    '期末复习': '本次教案用于期末复习：重点梳理知识点，注重查漏补缺，适当加入练习题和巩固活动。',
  };
  const styleNote = purposeGuide[purpose] || '教案兼顾实用性与规范性。';

  const prompt = `你是一位资深小学语文教研员。请根据以下名师研讨记录，为老师生成一份教案建议。

基本信息：
- 课文：《${context.title}》${context.grade}
- 参与专家：${expertsList}
- 备课用途：${purpose}
- 老师的核心问题：${context.confusion || '完整教学设计'}

教案风格：${styleNote}

=== 完整研讨记录 ===
${fullHistory}

---

【输出原则——严格执行】
- 老师只问了某个具体环节（如"导入怎么设计"），就**只输出那个环节**，不要补充其他环节。
- 老师问了完整教案，才按完整格式输出所有环节。
- 只提炼名师在研讨中真正说过的内容，不要凭空编造。
- 教案步骤要具体到"老师说什么、学生做什么"，不要只写活动名称。
- **融会贯通**：即使老师偏好某一位专家的风格，教案也必须从所有参与专家的建议中各取精华，而不是只套用一种流派。每位专家的独特洞见都值得体现——可以是同一环节里的不同层次，也可以是不同环节里各自发挥。目标是让老师拿到的是集成智慧，而不是某一个人的复述。

请按以下Markdown格式输出：

---

# 《${context.title}》教学设计建议

**年级**：${context.grade}
**用途**：${purpose}
**执笔说明**：综合${expertsList}等名师研讨意见整理

---

## 教学目标

1. ……
2. ……
3. ……

## 教学重难点

**重点**：……
**难点**：……

---

## 教学过程

（根据老师的提问，只写对应环节；每个环节严格按以下格式）

### 【环节名称】（建议时长：X分钟）

**设计意图**：（一句话说明为什么这样设计）

**教学步骤**：

1. **教师**：……（具体说什么、做什么）
   **学生**：……（预期反应或任务）
2. ……
3. ……

**参考教师语言**：
> "……"（给老师一句可以直接用的课堂引导语）

（若多位专家给出了不同方案，格式如下：）

> **方案A（参考×××）**：……
> **方案B（参考×××）**：……
> **编者建议**：……

---

## 名师核心叮嘱

| 专家 | 最重要的一句提醒 |
|------|----------------|
| ×××  | …… |

## 保留分歧

（若专家意见有本质分歧，在此列出，供老师自行判断；无分歧则删除此节）`;

  return await callOpenAI('', prompt, 0.4);
}
