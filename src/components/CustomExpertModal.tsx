import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, Sparkles, User } from 'lucide-react';
import { Expert, saveCustomExpert } from '../data/experts';
import { generateCustomExpertProfile } from '../lib/gemini';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface CustomExpertModalProps {
  onClose: () => void;
  onCreated: (expert: Expert) => void;
}

type Step = 'input' | 'generating' | 'preview';

export function CustomExpertModal({ onClose, onCreated }: CustomExpertModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<{
    title: string;
    coreView: string;
    perspective: string;
    systemPrompt: string;
  } | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      let text = '';
      if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        text = await file.text();
      } else if (file.name.endsWith('.docx')) {
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        text = result.value;
      } else if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const parts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const tc = await page.getTextContent();
          parts.push(tc.items.map((item: any) => item.str).join(' '));
        }
        text = parts.join('\n\n');
      } else {
        alert('请上传 .txt / .docx / .pdf 文件');
        return;
      }
      setContent((prev) => (prev ? prev + '\n\n' + text : text));
    } catch (err) {
      console.error(err);
      alert('文件解析失败，请重试。');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!name.trim()) { setError('请填写名师姓名'); return; }
    if (!content.trim()) { setError('请粘贴或上传资料内容'); return; }
    setError('');
    setStep('generating');
    try {
      const result = await generateCustomExpertProfile(name.trim(), content);
      setPreview(result);
      setStep('preview');
    } catch (err) {
      console.error(err);
      setError('生成失败，请检查 API 配置后重试。');
      setStep('input');
    }
  };

  const handleConfirm = () => {
    if (!preview) return;
    const expert: Expert = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      title: preview.title,
      coreView: preview.coreView,
      perspective: preview.perspective,
      avatar: '',
      systemPrompt: preview.systemPrompt,
      isCustom: true,
    };
    saveCustomExpert(expert);
    onCreated(expert);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-[#fdfcf9] border border-[#e5e0d5] shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col font-serif">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#e5e0d5]">
          <h2 className="text-xl font-bold text-[#4a453c] flex items-center gap-3">
            <span className="w-8 h-8 seal-stamp bg-[#8C2218] text-white flex items-center justify-center text-sm shadow-sm">定</span>
            自定义名师
          </h2>
          <button onClick={onClose} className="text-[#a09a8e] hover:text-[#4a453c] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#8C2218]" />
              <p className="text-[#8c8578] text-sm">AI 正在提炼知识库，生成名师画像……</p>
            </div>
          )}

          {(step === 'input' || step === 'preview') && (
            <>
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-[#a09a8e] mb-2 uppercase tracking-wider">
                  名师姓名 <span className="text-[#8C2218]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：王晓春、钱梦龙"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={step === 'preview'}
                  className="w-full bg-white/70 border-b-2 border-t-0 border-x-0 border-[#e8e4db] focus:border-[#8C2218] focus:ring-0 px-3 py-3 text-sm font-medium text-[#4a453c] outline-none transition-all placeholder:text-[#c4bdb1] disabled:opacity-60"
                />
              </div>

              {/* Content upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-[#a09a8e] uppercase tracking-wider">
                    资料内容 <span className="text-[#8C2218]">*</span>
                  </label>
                  {step === 'input' && (
                    <label className="cursor-pointer flex items-center gap-1.5 text-xs text-[#8C2218] hover:text-[#681610] font-bold transition-colors px-2 py-1 bg-white/50 border border-[#e8e4db] rounded-sm hover:bg-white">
                      {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      上传文档
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.docx,.pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  )}
                </div>
                <textarea
                  placeholder="粘贴这位名师的著作摘录、课堂实录、论文、演讲记录等资料，或直接上传文件。内容越丰富，生成的知识库越准确。"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={step === 'preview'}
                  rows={8}
                  className="w-full bg-white/70 border-2 border-[#e8e4db] focus:border-[#8C2218] px-4 py-3 text-sm font-medium text-[#4a453c] outline-none transition-all resize-none placeholder:text-[#c4bdb1] disabled:opacity-60"
                />
                {content && (
                  <p className="text-right text-xs text-[#a09a8e] mt-1">{content.length} 字符</p>
                )}
              </div>

              {/* Preview section */}
              {step === 'preview' && preview && (
                <div className="space-y-4 bg-[#f6f4ee] border border-[#e8e4db] p-6">
                  <div className="flex items-center gap-2 text-[#8C2218] font-bold text-sm mb-4">
                    <Sparkles className="w-4 h-4" />
                    AI 已生成知识库，请确认
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#a09a8e] font-bold uppercase tracking-wider mb-1">头衔</p>
                      <p className="text-sm text-[#4a453c] font-medium">{preview.title}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#a09a8e] font-bold uppercase tracking-wider mb-1">核心理念</p>
                      <p className="text-sm text-[#4a453c] font-medium">{preview.coreView}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[#a09a8e] font-bold uppercase tracking-wider mb-1">发言视角</p>
                    <p className="text-sm text-[#4a453c]">{preview.perspective}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#a09a8e] font-bold uppercase tracking-wider mb-2">系统 Prompt 预览</p>
                    <div className="bg-white border border-[#e8e4db] p-4 max-h-48 overflow-y-auto">
                      <p className="text-xs text-[#6b6560] whitespace-pre-wrap leading-relaxed">{preview.systemPrompt}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setPreview(null); setStep('input'); }}
                    className="text-xs text-[#8c8578] hover:text-[#4a453c] underline"
                  >
                    重新生成
                  </button>
                </div>
              )}

              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-[#e5e0d5] flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-[#8c8578] border border-[#e5e0d5] hover:bg-[#f6f4ee] transition-colors tracking-wider"
          >
            取消
          </button>
          {step === 'input' && (
            <button
              onClick={handleGenerate}
              disabled={!name.trim() || !content.trim()}
              className="px-6 py-2.5 text-sm font-bold bg-[#8C2218] text-white hover:bg-[#681610] disabled:bg-[#c4bdb1] disabled:cursor-not-allowed transition-colors tracking-widest flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI 生成知识库
            </button>
          )}
          {step === 'preview' && (
            <button
              onClick={handleConfirm}
              className="px-6 py-2.5 text-sm font-bold bg-[#8C2218] text-white hover:bg-[#681610] transition-colors tracking-widest flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              加入圆桌
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
