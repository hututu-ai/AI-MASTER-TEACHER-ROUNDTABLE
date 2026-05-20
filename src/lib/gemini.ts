import { Expert } from '../data/experts';

export interface LessonContext {
  title: string;
  grade: string;
  text: string;
  confusion: string;
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
  const prompt = `老师的备课内容如下：
课文：《${context.title}》
年级：${context.grade}
课文原文：
${context.text}
初步设计或困惑：
${context.confusion}

【当前任务：第一轮 - 各自表态】
请从你的核心主张（${expert.coreView}）和关注视角（${expert.perspective}）出发，对这堂课给出你的初步判断和专业建议。
要求：
1. **独立发言**：本轮为独立思考时间，请【不要】提及、评价或反思其他名师的观点，只专注你自己的教学主张。
2. **实操导向**：具体到课堂操作层面，不说空话，给出具体的教学策略。
3. **字数限制**：150~300 字。
4. **风格化**：充分展现你独特的个人口吻和标志性语言。`;

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
      return `【${exp?.name} · ${exp?.coreView}】的第一轮建议：\n${m.content}`;
    })
    .join('\n\n');

  const prompt = `课文：《${context.title}》
年级：${context.grade}

=== 老师的反馈/追问 ===
${teacherFeedback || '（老师没有补充反馈，请直接开始名师间的对话）'}

=== 查阅：第一轮其他专家的观点 ===
${otherMessages}

【当前任务：第二轮 - 观点博弈】
现在进入名师圆桌的激烈讨论阶段。你已经听到了其他专家的第一轮建议。
请针对性地进行回应，你应该：
1. **展开博弈**：针对那些与你主张相左的观点（参考你的“天然张力对”），直接、犀利地提出你的不同意见。
2. **拒绝附和**：不要只是简单地说“我同意...”，要指出如果按他人的设计做，可能会失去什么你认为更重要的东西。
3. **回应老师**：如果老师有表态或追问，优先给予回应。
要求：
1. 字数 150~300 字。
2. 必须引用或反驳至少一位其他专家的核心论条。
3. 保持你鲜明的教学个性和执教风格。`;

  return await callOpenAI(expert.systemPrompt, prompt, 0.8);
}

export async function generateRound3(
  expert: Expert,
  context: LessonContext,
  allHistory: string,
  teacherFeedback: string
): Promise<string> {
  const prompt = `老师的备课内容如下：
课文：《${context.title}》
年级：${context.grade}

=== 前两轮所有发言和老师的反馈 ===
${allHistory}

=== 老师在第三轮前的最终反馈 ===
${teacherFeedback || '（无）'}

现在是第三轮：收敛结论阶段。
请在前两轮讨论和老师反馈的基础上，找到你和其他专家的共识点，收敛出结论。
要求：
1. 保留你自己独特的视角和建议，但在大方向上与其他专家对齐（例如：“从我的角度，我同意...，建议...”）。
2. 若某个问题确实无法达成一致，明确标注为“保留分歧”。
3. 给出最后对这堂课的具体建议。
4. 字数控制在 150~300 字左右。
5. 充分展现你独特的口吻和风格。`;

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

  const prompt = `你是一个小学语文教研员。刚才多位名师对一篇课文进行了备课讨论。
请根据完整的讨论记录，为老师提炼出最终的【教案草稿建议】。

基本信息：
课文：《${context.title}》
年级：${context.grade}
参与专家：${expertsList}

=== 完整讨论记录 ===
${fullHistory}

请输出结构化的教案建议，必须包含以下部分：
【教学目标建议】（综合专家的核心观点）
【教学环节建议】（分环节详细说明，并注明各个环节是由哪位专家提供的视角/建议）
【各专家特别提醒】（每位专家最核心的嘱托，简明扼要）
【共识要点】（专家们一致认同的方向）
【保留分歧】（如果有专家意见相左的地方，列出双方观点，供老师自行判断）

要求：格式清晰（使用Markdown），语言精炼，有实操性。`;

  return await callOpenAI('', prompt, 0.4);
}
