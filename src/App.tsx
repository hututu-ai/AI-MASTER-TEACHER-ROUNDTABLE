import React, { useState } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { DiscussionScreen } from './components/DiscussionScreen';
import { ExportScreen, ChatMessage } from './components/ExportScreen';
import { Expert } from './data/experts';
import { LessonContext, generateFinalLessonPlan } from './lib/gemini';
import { Loader2, Settings } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';

import { WelcomeScreen } from './components/WelcomeScreen';

type AppState = 'welcome' | 'setup' | 'discussing' | 'generating_plan' | 'export';

function App() {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [context, setContext] = useState<LessonContext | null>(null);
  const [selectedExperts, setSelectedExperts] = useState<Expert[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lessonPlan, setLessonPlan] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleStart = (ctx: LessonContext, experts: Expert[]) => {
    setContext(ctx);
    setSelectedExperts(experts);
    setAppState('discussing');
  };

  const handleDiscussionFinish = async (finalMessages: ChatMessage[]) => {
    setMessages(finalMessages);
    setAppState('generating_plan');
    
    try {
      const expertMap = selectedExperts.reduce((acc, exp) => {
        acc[exp.id] = exp;
        return acc;
      }, {} as Record<string, Expert>);
      
      let fullHistory = '';
      finalMessages.forEach(m => {
        if (m.role === 'expert') {
          const exp = expertMap[m.expertId!];
          fullHistory += `【${exp?.name} · 第${m.round}轮发言】\n${m.content}\n\n`;
        } else {
          fullHistory += `【老师 · 第${m.round}轮反馈】\n${m.content}\n\n`;
        }
      });
      
      const plan = await generateFinalLessonPlan(context!, expertMap, fullHistory);
      setLessonPlan(plan);
      setAppState('export');
    } catch (error) {
      console.error(error);
      alert('生成教案时发生错误。');
      setAppState('discussing');
    }
  };

  const handleRestart = () => {
    setContext(null);
    setSelectedExperts([]);
    setMessages([]);
    setLessonPlan('');
    setAppState('setup');
  };

  return (
    <div className="min-h-screen bg-[#f5f2eb] text-[#333333] font-sans selection:bg-[#efebe3] relative">
      {/* Global Settings Button */}
      {appState !== 'welcome' && (
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="fixed top-6 right-6 z-[150] p-2 bg-white/50 border border-[#e8e4db] rounded-full text-[#a09a8e] hover:text-[#4a453c] hover:bg-white shadow-sm transition-all"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}
      
      {appState === 'welcome' && (
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="fixed top-8 right-8 z-[150] p-3 rounded-full text-black/50 hover:text-black hover:bg-black/5 transition-all"
        >
          <Settings className="w-6 h-6" />
        </button>
      )}

      {/* Main Content */}
      <main className={appState === 'discussing' || appState === 'welcome' ? "p-0" : "p-4 md:p-8"}>
        {appState === 'welcome' && (
          <WelcomeScreen onEnter={() => setAppState('setup')} />
        )}

        {appState === 'setup' && (
          <SetupScreen onStart={handleStart} />
        )}
        
        {appState === 'discussing' && context && (
          <DiscussionScreen 
            context={context} 
            experts={selectedExperts} 
            onFinish={handleDiscussionFinish} 
          />
        )}

        {appState === 'generating_plan' && (
          <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-6">
            <Loader2 className="w-12 h-12 animate-spin text-[#8c7b65]" />
            <h2 className="text-2xl font-bold text-[#4a453c]">正在整理专家共识并生成教案...</h2>
            <p className="text-[#8c8578] text-lg">这可能需要几十秒的时间</p>
          </div>
        )}

        {appState === 'export' && context && (
          <ExportScreen 
            context={context} 
            experts={selectedExperts} 
            messages={messages} 
            lessonPlan={lessonPlan} 
            onRestart={handleRestart} 
          />
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}

export default App;
