import React, { useState, useEffect } from 'react';
import { EXPERTS, Expert, loadCustomExperts, deleteCustomExpert } from '../data/experts';
import { cn } from '../lib/utils';
import { Check, Upload, Loader2, Plus, Trash2 } from 'lucide-react';
import { LessonContext } from '../lib/gemini';
import { motion } from 'motion/react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { CustomExpertModal } from './CustomExpertModal';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface SetupScreenProps {
  onStart: (context: LessonContext, selectedExperts: Expert[]) => void;
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState('');
  const [text, setText] = useState('');
  const [confusion, setConfusion] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [customExperts, setCustomExperts] = useState<Expert[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [purpose, setPurpose] = useState('日常教学');

  useEffect(() => {
    setCustomExperts(loadCustomExperts());
  }, []);

  const allExperts = [...EXPERTS, ...customExperts];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let extractedText = '';

      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        extractedText = await file.text();
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.name.endsWith('.docx')
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const textParts = [];
        
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          textParts.push(pageText);
        }
        
        extractedText = textParts.join('\n\n');
      } else {
        alert('不支持的文件格式，请上传 .txt, .docx 或 .pdf 文件');
        return;
      }

      setConfusion((prev) => (prev ? prev + '\n\n' + extractedText : extractedText));
    } catch (err) {
      console.error('File parsing error:', err);
      alert('解析文件失败，请确保文件未损坏。');
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const toggleExpert = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleCustomExpertCreated = (expert: Expert) => {
    setCustomExperts((prev) => [...prev, expert]);
    setSelectedIds((prev) => new Set([...prev, expert.id]));
    setShowCustomModal(false);
  };

  const handleDeleteCustomExpert = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('确认删除这位自定义名师？')) return;
    deleteCustomExpert(id);
    setCustomExperts((prev) => prev.filter((ex) => ex.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const fillSampleLesson = () => {
    setTitle('荷花');
    setGrade('三年级（部编版）');
    setText('走到荷花池旁边，荷花已经开了不少了。荷叶挨挨挤挤的，像一个个碧绿的大圆盘。白荷花在这些大圆盘之间冒出来。有的才展开两三片花瓣儿。有的花瓣儿全展开了，露出嫩黄色的小莲蓬。有的还是花骨朵儿，看起来饱胀得马上要破裂似的。\n\n这么多的白荷花，一朵有一朵的姿势。看看这一朵，很美；看看那一朵，也很美。如果把眼前的一池荷花看作一大幅活的画，那画家的本领可真了不起。');
    setConfusion('导入环节怎么设计？我想让孩子一开始就爱上这篇文章，但不知道用什么方式切入最自然。');
    setPurpose('日常教学');
  };

  const handleStart = () => {
    if (!title || !grade || selectedIds.size < 2) {
      alert('请填写课文、年级，并至少选择2位专家');
      return;
    }
    const selectedExperts = allExperts.filter((e) => selectedIds.has(e.id));
    onStart({ title, grade, text, confusion, purpose }, selectedExperts);
  };

  return (
    <div className="max-w-[1400px] h-[calc(100vh-4rem)] flex gap-8 items-stretch justify-center mx-auto transition-all animate-in fade-in duration-500 py-6 px-10">
      {/* Left panel */}
      <div className="flex-1 max-w-[800px] bg-[#f6f4ee] bg-paper p-10 border border-[#e8e4db] shadow-sm flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] opacity-20 pointer-events-none" />
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold text-[#4a453c] flex items-center gap-4 font-serif">
            <span className="w-10 h-10 seal-stamp bg-white text-[#8C2218] flex items-center justify-center text-xl shadow-sm">壹</span>
            设定研讨课题
          </h2>
          <button
            type="button"
            onClick={fillSampleLesson}
            className="text-[11px] font-bold text-[#a09a8e] font-serif tracking-wider border border-[#e8e4db] px-3 py-1.5 hover:border-[#8C2218] hover:text-[#8C2218] transition-all bg-white/50 whitespace-nowrap"
          >
            填入示例课题
          </button>
        </div>

        <div className="space-y-8 flex-1 overflow-y-auto pr-4 scrollbar-hide relative z-10">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold text-[#a09a8e] mb-3 uppercase tracking-wider font-serif">课文名称 <span className="text-[#8C2218]">*</span></label>
              <input
                type="text"
                placeholder="如：《荷塘月色》"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/70 border-b-2 border-t-0 border-x-0 border-[#e8e4db] focus:border-[#8C2218] focus:ring-0 px-4 py-4 text-sm font-medium text-[#4a453c] outline-none transition-all placeholder:text-[#c4bdb1] shadow-sm font-serif"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#a09a8e] mb-3 uppercase tracking-wider font-serif">适用学段/年级 <span className="text-[#8C2218]">*</span></label>
              <input
                type="text"
                placeholder="如：五年级 · 散文精读"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-white/70 border-b-2 border-t-0 border-x-0 border-[#e8e4db] focus:border-[#8C2218] focus:ring-0 px-4 py-4 text-sm font-medium text-[#4a453c] outline-none transition-all placeholder:text-[#c4bdb1] shadow-sm font-serif"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#a09a8e] mb-3 uppercase tracking-wider font-serif">
              备课用途 <span className="text-[#8C2218]">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(['日常教学', '公开课·示范课', '教研课', '期末复习'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPurpose(opt)}
                  className={cn(
                    "px-4 py-2 text-sm font-bold font-serif border transition-all tracking-wider",
                    purpose === opt
                      ? "bg-[#8C2218] text-white border-[#8C2218] shadow-sm"
                      : "bg-white/70 text-[#4a453c] border-[#e8e4db] hover:border-[#8C2218] hover:text-[#8C2218]"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#a09a8e] mb-3 uppercase tracking-wider font-serif">课文原文</label>
            <textarea
              placeholder="粘贴需要研讨的课文段落或全文..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full bg-white/70 border-2 border-[#e8e4db] focus:border-[#8C2218] px-6 py-4 text-sm font-medium text-[#4a453c] outline-none transition-all resize-none placeholder:text-[#c4bdb1] shadow-sm font-serif"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-bold text-[#a09a8e] uppercase tracking-wider font-serif">
                您的具体问题
                <span className="text-[#b0a89d] text-[11px] font-normal ml-2 normal-case tracking-normal">（问什么，名师就答什么）</span>
              </label>
              <label className="cursor-pointer flex items-center gap-2 text-xs text-[#8C2218] hover:text-[#681610] font-bold font-serif transition-colors px-3 py-1 bg-white/50 border border-[#e8e4db] rounded-sm hover:bg-white shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>上传文档 (.txt, .docx, .pdf)</span>
                <input
                  type="file"
                  accept=".txt,.docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  className="hidden"
                  onChange={handleFileUpload}
                  x-webkit-ignore-capture="true"
                />
              </label>
            </div>
            {isUploading ? (
              <div className="w-full bg-white/70 border-2 border-[#e8e4db] h-[104px] flex items-center justify-center text-[#8C2218] shadow-sm">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-3 font-serif text-sm">正在解析文件...</span>
              </div>
            ) : (
              <textarea
                placeholder="您问什么，名师就答什么——可以只问「导入怎么设计？」「精读环节如何处理某个词语？」，也可以直接粘贴已有教案，请名师点评某个具体环节。"
                value={confusion}
                onChange={(e) => setConfusion(e.target.value)}
                rows={4}
                className="w-full bg-white/70 border-2 border-[#e8e4db] focus:border-[#8C2218] px-6 py-4 text-sm font-medium text-[#4a453c] outline-none transition-all resize-none placeholder:text-[#c4bdb1] shadow-sm font-serif"
              />
            )}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-[450px] bg-[#fdfcf9] bg-paper p-10 border border-[#e5e0d5] shadow-xl flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-[#4a453c] flex items-center gap-4 font-serif">
            <span className="w-10 h-10 seal-stamp bg-white text-[#8C2218] flex items-center justify-center text-xl shadow-sm">贰</span>
            邀请名师
          </h2>
          <span className="text-[12px] font-bold text-[#8C2218] tracking-[0.1em] border border-[#8C2218]/30 px-3 py-1 rounded-sm font-serif">
            已选 {selectedIds.size} / {allExperts.length}
          </span>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#e5e0d5]">
          {allExperts.map((expert) => {
            const isSelected = selectedIds.has(expert.id);
            return (
              <motion.button
                key={expert.id}
                onClick={() => toggleExpert(expert.id)}
                whileHover={{ scale: isSelected ? 1.02 : 1.01 }}
                whileTap={{ scale: 0.98 }}
                animate={{
                  scale: isSelected ? 1.02 : 1,
                  borderColor: isSelected ? '#8C2218' : '#e8e4db'
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                  "w-full text-left p-4 border transition-colors relative group flex items-start gap-5",
                  isSelected
                    ? "bg-[#8C2218] text-[#f5f2eb] shadow-md z-10"
                    : "bg-white/50 hover:bg-[#efebe3] text-[#4a453c] hover:shadow-sm"
                )}
              >
                <div className={cn(
                  "w-12 h-12 flex-shrink-0 flex items-center justify-center font-bold text-lg transition-all shadow-sm overflow-hidden relative border",
                  isSelected
                    ? "bg-white/20 border-white/30 text-white"
                    : "bg-white text-[#8c8578] border-[#e5e0d5] group-hover:bg-[#efebe3]"
                )}>
                  <span className="absolute inset-0 flex items-center justify-center text-xl font-serif">{expert.name.charAt(0)}</span>
                  {expert.avatar && (
                    <motion.img
                      src={expert.avatar}
                      alt={expert.name}
                      className="w-full h-full object-cover relative z-10 bg-transparent fallback-bg mix-blend-multiply"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                      animate={{ scale: isSelected ? 1.1 : 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("font-bold text-[17px] font-serif tracking-widest", isSelected ? "text-white" : "text-[#4a453c]")}>{expert.name}</div>
                      {expert.isCustom && (
                        <span className={cn("text-[10px] px-1.5 py-0.5 border font-bold tracking-wide", isSelected ? "border-white/40 text-white/70" : "border-[#8C2218]/40 text-[#8C2218]")}>自定义</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {expert.isCustom && !isSelected && (
                        <button
                          onClick={(e) => handleDeleteCustomExpert(e, expert.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#a09a8e] hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="w-5 h-5 bg-[#f5f2eb] flex items-center justify-center text-[#8C2218]"
                        >
                          <Check className="w-4 h-4 font-bold" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <div className={cn("text-[12px] font-bold mt-1.5 tracking-wider font-serif", isSelected ? "text-white/80" : "text-[#8c7b65]")}>
                    {expert.coreView}
                  </div>
                  <div className={cn("text-xs mt-2 line-clamp-2 leading-relaxed font-medium pr-2 font-serif", isSelected ? "text-white/70" : "text-[#8c8578]")}>
                    {expert.perspective}
                  </div>
                </div>
              </motion.button>
            );
          })}

          {/* Add custom expert button */}
          <motion.button
            onClick={() => setShowCustomModal(true)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full text-left p-4 border border-dashed border-[#d8d3c9] hover:border-[#8C2218] bg-white/30 hover:bg-[#fff9f7] text-[#a09a8e] hover:text-[#8C2218] transition-all flex items-center justify-center gap-3 group"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold font-serif tracking-wider">添加自定义名师</span>
          </motion.button>
        </div>

        <button
          onClick={handleStart}
          disabled={!title || !grade || selectedIds.size < 2}
          className="mt-6 w-full bg-[#f6f4ee] border border-[#d8d3c9] text-[#5a5245] hover:bg-[#8C2218] hover:border-[#8C2218] hover:text-[#f5f2eb] disabled:bg-[#f0ece4] disabled:text-[#c4bdb1] disabled:cursor-not-allowed text-base font-bold font-serif py-4 px-6 transition-all active:scale-[0.98] tracking-[0.3em] shadow-sm"
        >
          {selectedIds.size < 2 ? "请至少邀请 2 位名师" : "开启圆桌研讨"}
        </button>
        <p className="text-[#a09a8e] font-serif text-[10px] tracking-widest mt-4 text-center">
          * 本产品内容由AI生成，不代表名师本人观点，仅供教学参考
        </p>
      </div>

      {showCustomModal && (
        <CustomExpertModal
          onClose={() => setShowCustomModal(false)}
          onCreated={handleCustomExpertCreated}
        />
      )}
    </div>
  );
}
