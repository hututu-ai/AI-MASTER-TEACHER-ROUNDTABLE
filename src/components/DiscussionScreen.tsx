import React, { useState, useEffect, useRef } from 'react';
import { Expert } from '../data/experts';
import { LessonContext, generateRound1, generateRound2, generateRound3, sleep } from '../lib/gemini';
import { cn } from '../lib/utils';
import { Send, Loader2, UserCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from './ExportScreen';

interface DiscussionScreenProps {
  context: LessonContext;
  experts: Expert[];
  onFinish: (messages: ChatMessage[]) => void;
}

export function DiscussionScreen({ context, experts, onFinish }: DiscussionScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [round, setRound] = useState(1);
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorExpertIds, setErrorExpertIds] = useState<string[]>([]);
  const [teacherInput, setTeacherInput] = useState('');
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, errorExpertIds]);

  useEffect(() => {
    startRound1();
  }, []);

  const addMessage = (msg: Omit<ChatMessage, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: Math.random().toString(36).slice(2) }]);
  };

  const processSequentially = async (
    expertList: Expert[],
    generateFn: (expert: Expert) => Promise<string>,
    roundNum: number
  ) => {
    setIsProcessing(true);
    setErrorExpertIds([]);
    
    for (const expert of expertList) {
      if (messages.some(m => m.round === roundNum && m.expertId === expert.id)) continue;

      try {
        const text = await generateFn(expert);
        addMessage({
          round: roundNum,
          role: 'expert',
          expertId: expert.id,
          content: text
        });
        await sleep(1500);
      } catch (error: any) {
        console.error(`Error generating for ${expert.name}:`, error);
        setErrorExpertIds(prev => [...prev, expert.id]);
        if (error?.message?.includes('429')) {
          await sleep(5000);
        }
      }
    }
    setIsProcessing(false);
  };

  const startRound1 = () => {
    processSequentially(experts, (e) => generateRound1(e, context), 1);
  };

  const startRound2 = async (feedback: string) => {
    setRound(2);
    const round1Msgs = messages
      .filter(m => m.round === 1 && m.role === 'expert')
      .map(m => ({ expertId: m.expertId!, content: m.content }));
    
    processSequentially(experts, (e) => generateRound2(e, context, round1Msgs, experts, feedback), 2);
  };

  const startRound3 = async (feedback: string) => {
    setRound(3);
    let history = '';
    messages.forEach(m => {
      if (m.role === 'expert') {
        const exp = experts.find(e => e.id === m.expertId);
        history += `【${exp?.name} · 第${m.round}轮发言】\n${m.content}\n\n`;
      } else {
        history += `【老师 · 第${m.round}轮反馈】\n${m.content}\n\n`;
      }
    });

    processSequentially(experts, (e) => generateRound3(e, context, history, feedback), 3);
  };

  const retryExpert = async (expertId: string) => {
    const expert = experts.find(e => e.id === expertId);
    if (!expert) return;
    setErrorExpertIds(prev => prev.filter(id => id !== expertId));
    setIsProcessing(true);
    try {
      let text = '';
      if (round === 1) {
        text = await generateRound1(expert, context);
      } else if (round === 2) {
        const round1Msgs = messages.filter(m => m.round === 1 && m.role === 'expert').map(m => ({ expertId: m.expertId!, content: m.content }));
        const teacherFeedback = messages.find(m => m.round === 1 && m.role === 'teacher')?.content || '';
        text = await generateRound2(expert, context, round1Msgs, experts, teacherFeedback);
      } else {
        let history = '';
        messages.forEach(m => {
          if (m.role === 'expert') {
            const exp = experts.find(e => e.id === m.expertId);
            history += `【${exp?.name} · 第${m.round}轮发言】\n${m.content}\n\n`;
          } else {
            history += `【老师 · 第${m.round}轮反馈】\n${m.content}\n\n`;
          }
        });
        const teacherFeedback = messages.find(m => m.round === 2 && m.role === 'teacher')?.content || '';
        text = await generateRound3(expert, context, history, teacherFeedback);
      }
      addMessage({
        round,
        role: 'expert',
        expertId: expert.id,
        content: text
      });
    } catch (error) {
      console.error(error);
      setErrorExpertIds(prev => [...prev, expertId]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTeacherSubmit = () => {
    const feedback = teacherInput.trim();
    if (feedback) {
      addMessage({ round, role: 'teacher', content: feedback });
    }
    setTeacherInput('');
    if (round === 1) startRound2(feedback);
    else if (round === 2) startRound3(feedback);
    else if (round === 3) onFinish(messages);
  };

  return (
    <div className="max-w-[1400px] h-[calc(100vh-4rem)] flex flex-col mx-auto bg-white bg-paper rounded-[20px] shadow-2xl border border-[#e8e4db] overflow-hidden animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="h-20 px-8 flex items-center justify-between border-b border-[#e8e4db] bg-white/70 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 seal-stamp flex items-center justify-center font-bold text-lg bg-white">
            <span>议</span>
          </div>
          <div className="text-xl font-bold text-[#4a453c] font-serif tracking-widest">
            名师议课堂 <span className="text-[#a09a8e] font-sans font-normal text-sm ml-2 tracking-normal">| 备课 AI 圆桌</span>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-bold text-[#a09a8e] uppercase tracking-wider font-serif">当前<br/>课文</span>
            <div className="text-sm font-black text-[#4a453c] font-serif tracking-widest border-l-2 border-[#8C2218]/50 pl-4 py-1">
              《{context.title}》 {context.grade}
            </div>
          </div>
          <button onClick={() => onFinish(messages)} className="bg-[#8C2218] hover:bg-[#681610] text-[#f5f2eb] font-serif tracking-widest text-sm font-bold px-8 py-3 rounded-none transition-all shadow-md active:scale-95 border border-[#8C2218]">
            导出教案稿
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[300px] bg-[#fdfcf9] bg-paper border-r border-[#e8e4db] flex flex-col p-6 relative">
          <div className="absolute inset-0 bg-[#e8e4db]/20 pattern-vertical-lines pointer-events-none opacity-50" />
          <h3 className="text-sm font-bold text-[#a09a8e] mb-6 tracking-widest font-serif relative z-10">参会名师 <span className="font-sans text-[10px]">({experts.length}/7)</span></h3>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[#e8e4db] relative z-10">
            {experts.map((expert, idx) => {
              const hasRepliedInCurrentRound = messages.some(m => m.round === round && m.expertId === expert.id);
              return (
                <div 
                  key={expert.id} 
                  className={cn(
                    "flex items-center gap-4 p-4 border transition-all",
                    hasRepliedInCurrentRound ? "bg-white border-[#8C2218] shadow-sm" : "bg-[#f6f4ee]/80 border-[#e8e4db]"
                  )}
                >
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center font-bold text-lg bg-white border border-[#e8e4db] text-[#4a453c] overflow-hidden relative">
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-serif">{expert.name.charAt(0)}</span>
                    <img 
                      src={expert.avatar} 
                      alt={expert.name} 
                      className="w-full h-full object-cover relative z-10 mix-blend-multiply"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className={cn("text-[15px] font-bold font-serif tracking-widest", hasRepliedInCurrentRound ? "text-[#8C2218]" : "text-[#4a453c]")}>{expert.name}</span>
                    <span className="text-[11px] text-[#8c8578] font-medium leading-tight mt-1 font-serif tracking-wider">{expert.coreView}</span>
                  </div>
                  {hasRepliedInCurrentRound && (
                    <div className="w-4 h-4 seal-stamp bg-white flex items-center justify-center text-[8px] border">言</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-[#8C2218]/20 relative z-10">
            <div className="flex justify-between items-end mb-3">
              <span className="text-[12px] font-bold text-[#8c8578] tracking-widest font-serif">讨论进度</span>
              <span className="text-[10px] font-bold text-[#8C2218] font-mono">{Math.round((round / 3) * 100)}%</span>
            </div>
            <div className="text-sm font-bold text-[#8C2218] mb-3 font-serif tracking-widest">
              {round === 1 ? '第一轮：观点阐述' : round === 2 ? '第二轮：互相回应' : '第三轮：达成共识'}
            </div>
            <div className="h-1 bg-[#e8e4db] overflow-hidden">
              <div 
                className="h-full bg-[#8C2218] transition-all duration-1000" 
                style={{ width: `${(round / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Discussion Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#fdfcf9] bg-paper">
          <div className="flex-1 overflow-y-auto px-10 py-8 space-y-10 relative">
            {messages.length === 0 && isProcessing && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#8c7b65]" />
                <p className="text-[#a09a8e] text-sm font-medium">专家正陆续就座，请稍候...</p>
              </div>
            )}
            
            {messages.map((msg, idx) => {
              if (msg.role === 'teacher') {
                return (
                  <div key={msg.id} className="flex justify-end animate-in fade-in zoom-in duration-500 relative z-10 w-full mb-4">
                    <div className="flex gap-4 max-w-[85%] flex-row-reverse">
                      <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center font-bold text-[#8C2218] text-xl bg-[#fdfcf9] border border-[#d8d3c9] shadow-sm relative seal-stamp p-0">
                        <span className="font-serif">师</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="mb-2 px-1">
                          <span className="text-[14px] font-bold text-[#8C2218] font-serif tracking-widest">您的见解</span>
                        </div>
                        <div className="p-6 shadow-sm text-[16px] leading-[1.8] font-serif border bg-[#f0ece4] border-[#d8d3c9] text-[#2b2b2b] rounded-[20px] rounded-tr-[4px]">
                          <div className="prose prose-sm font-medium prose-slate max-w-none text-left">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              const expertIndex = experts.findIndex(e => e.id === msg.expertId);
              const expert = experts[expertIndex];
              const isFirstOfRound = idx === 0 || messages[idx-1].round !== msg.round;
              
              const expertStyles = [
                "bg-white border-[#e8e4db]", 
                "bg-[#fdfaf5] border-[#eaddc4]", 
                "bg-[#f4f7f6] border-[#d5e2df]", 
                "bg-[#fbf6f6] border-[#e6d5d5]", 
                "bg-[#f6f6f9] border-[#d9dbe6]", 
                "bg-[#fbf5f9] border-[#e6d9e2]", 
                "bg-[#fafaf5] border-[#e4ecc4]"
              ];
              const currentStyle = expertStyles[expertIndex % expertStyles.length] || expertStyles[0];

              return (
                <div key={msg.id} className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
                  {isFirstOfRound && (
                    <div className="w-full flex justify-center mb-10 mt-6">
                      <div className="bg-[#8C2218] text-[#f5f2eb] text-[10px] font-bold tracking-[0.3em] font-serif px-6 py-2 shadow-sm relative">
                        {`第${msg.round === 1 ? '一' : msg.round === 2 ? '二' : '三'}轮 ${msg.round === 1 ? '观点陈述' : msg.round === 2 ? '思想交锋' : '达成共识'}`}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-6 max-w-[85%] flex-row mb-4">
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center font-bold text-[#4a453c] text-lg bg-[#e8e4db] shadow-sm overflow-hidden mt-1 relative border">
                      {expert ? (
                        <>
                          <span className="absolute inset-0 flex items-center justify-center text-lg font-serif">{expert.name.charAt(0)}</span>
                          <img 
                            src={expert.avatar} 
                            alt={expert.name} 
                            className="w-full h-full object-cover relative z-10 mix-blend-multiply"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </>
                      ) : (
                        <UserCircle2 className="w-6 h-6 text-[#8c8578]" />
                      )}
                    </div>
                    <div className="flex flex-col items-start">
                      <div className="mb-2 px-1">
                        <span className="text-[14px] font-bold text-[#8C2218] font-serif tracking-widest">{expert?.name} <span className="text-[#a09a8e] font-sans font-normal tracking-normal text-xs ml-2">· {expert?.coreView}</span></span>
                      </div>
                      <div className={cn(
                        "p-6 shadow-sm text-[16px] leading-[1.8] font-serif border text-[#333] rounded-[20px] rounded-tl-[4px]",
                        currentStyle
                      )}>
                        <div className="prose prose-sm font-medium prose-slate max-w-none">
                          <ReactMarkdown>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {isProcessing && messages.length > 0 && (
              <div className="flex items-center gap-3 px-6 py-4 bg-[#f6f4ee] border border-[#d8d3c9] w-fit mx-auto animate-pulse shadow-sm relative z-10">
                <Loader2 className="w-4 h-4 animate-spin text-[#8C2218]" />
                <span className="text-[12px] font-bold text-[#6a5f4a] tracking-widest font-serif">名师正在斟酌言辞...</span>
              </div>
            )}
            
            {errorExpertIds.map(id => (
              <div key={id} className="flex justify-center relative z-10">
                <div className="bg-red-50 border border-red-200 text-[#8C2218] text-[11px] font-bold px-4 py-2 flex items-center gap-2 shadow-sm font-serif">
                  <AlertCircle className="w-3 h-3" />
                  {experts.find(e => e.id === id)?.name} 的反馈有些迟疑，是否请先生再讲一遍？
                  <button onClick={() => retryExpert(id)} className="ml-2 underline hover:text-[#4a100c]">重新请教</button>
                </div>
              </div>
            ))}
            <div ref={bottomRef} className="h-10 relative z-10" />
          </div>

          {/* Bottom Input Area */}
          {!isProcessing && errorExpertIds.length === 0 && (
            <div className="p-6 bg-gradient-to-t from-[#f6f4ee] via-[#f6f4ee] to-transparent pt-12 z-20 border-t border-[#e8e4db]/50 relative">
              <div className="absolute inset-0 bg-[#e8e4db]/20 pattern-vertical-lines pointer-events-none opacity-50" />
              <div className="flex gap-3 mb-4 overflow-x-auto pb-2 scrollbar-hide px-2 relative z-10">
                {experts.map(e => (
                  <button 
                    key={e.id}
                    onClick={() => setTeacherInput(`针对${e.name}老师提到的观点...`)}
                    className="whitespace-nowrap bg-white border border-[#d8d3c9] text-[12px] font-bold text-[#4a453c] px-6 py-2.5 hover:bg-[#e8e4db] hover:border-[#8c7b65] transition-all hover:shadow-sm shadow-sm font-serif tracking-widest"
                  >
                    赞同 {e.name}
                  </button>
                ))}
              </div>
              <div className="relative px-2 z-10">
                <textarea
                  value={teacherInput}
                  onChange={(e) => setTeacherInput(e.target.value)}
                  placeholder="输入您的追问或感悟，引导名师进入下一轮探讨..."
                  rows={2}
                  className="w-full bg-white border border-[#d8d3c9] focus:border-[#8C2218] px-6 py-5 text-sm font-medium text-[#2b2b2b] outline-none transition-all placeholder:text-[#a09a8e] pr-[160px] resize-none font-serif shadow-inner"
                />
                <button 
                  onClick={handleTeacherSubmit}
                  className="absolute right-6 bottom-4 bg-[#8C2218] hover:bg-[#681610] text-[#f5f2eb] text-sm font-bold px-8 py-3 transition-all shadow-md active:scale-95 flex items-center gap-2 font-serif tracking-widest border border-[#8C2218]"
                >
                  {round === 3 ? "书写教案" : "推进研讨"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
