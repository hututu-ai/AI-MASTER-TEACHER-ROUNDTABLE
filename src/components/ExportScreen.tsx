import React, { useState } from 'react';
import { Expert } from '../data/experts';
import { LessonContext } from '../lib/gemini';
import ReactMarkdown from 'react-markdown';
import { Download, RefreshCcw, FileText, CheckCircle2, FileDown, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface ChatMessage {
  id: string;
  round: number;
  role: 'expert' | 'teacher';
  expertId?: string;
  content: string;
}

interface ExportScreenProps {
  context: LessonContext;
  experts: Expert[];
  messages: ChatMessage[];
  lessonPlan: string;
  onRestart: () => void;
}

export function ExportScreen({ context, experts, messages, lessonPlan, onRestart }: ExportScreenProps) {
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingDOCX, setIsExportingDOCX] = useState(false);
  
  const getExpert = (id: string) => experts.find(e => e.id === id);

  const fullDiscussionMarkdown = [1, 2, 3].map(round => {
    const roundMessages = messages.filter(m => m.round === round);
    if (roundMessages.length === 0) return '';
    
    let md = `## 第 ${round} 轮研讨\n\n`;
    roundMessages.forEach(msg => {
      if (msg.role === 'expert') {
        const exp = getExpert(msg.expertId!);
        md += `### 【${exp?.name} · ${exp?.coreView}】\n${msg.content}\n\n`;
      } else {
        md += `### 💡 老师见解\n${msg.content}\n\n`;
      }
    });
    return md;
  }).join('\n');

  const getFullMarkdown = () => {
    return `# 教学设计研讨完整记录\n\n` +
      `**课题：** 《${context.title}》\n` +
      `**年级：** ${context.grade}\n` +
      `**参与专家：** ${experts.map(e => e.name).join('、')}\n` +
      `**课文原文及困惑：**\n\n${context.confusion || '无'}\n\n` +
      `---\n\n` +
      `# 最终教案建议\n\n${lessonPlan}\n\n` +
      `---\n\n` +
      `${fullDiscussionMarkdown}`;
  };

  const handleExportMarkdown = () => {
    const fullContent = getFullMarkdown();
    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `教案及研讨记录《${context.title}》.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const element = document.getElementById('export-content');
      if (!element) return;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`教案及研讨记录《${context.title}》.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportDOCX = async () => {
    setIsExportingDOCX(true);
    try {
      const { parse } = await import('marked');
      // @ts-ignore – html-to-docx has no bundled type declarations
      const HTMLtoDOCX = (await import('html-to-docx')).default;

      const bodyHTML = await parse(getFullMarkdown());
      // Wrap with Chinese-friendly styles so Word renders correctly
      const styledHTML = `<html><head><meta charset="utf-8">
        <style>
          body{font-family:"宋体",SimSun,serif;font-size:12pt;line-height:1.8;color:#222}
          h1{font-size:18pt;font-weight:bold;text-align:center;margin:24pt 0 12pt}
          h2{font-size:14pt;font-weight:bold;margin:16pt 0 8pt;border-bottom:1px solid #ccc;padding-bottom:4pt}
          h3{font-size:13pt;font-weight:bold;margin:12pt 0 6pt}
          table{width:100%;border-collapse:collapse;margin:8pt 0}
          td,th{border:1px solid #ccc;padding:6pt 8pt}
          th{background:#f5f5f5;font-weight:bold}
          blockquote{border-left:3px solid #8C2218;margin:8pt 0 8pt 12pt;padding-left:8pt;color:#555}
          hr{border:none;border-top:1px solid #ddd;margin:16pt 0}
        </style></head>
        <body>${bodyHTML}</body></html>`;

      const docxBlob = await HTMLtoDOCX(styledHTML, null, {
        table: { row: { cantSplit: true } },
        footer: false,
        pageNumber: false,
        margins: { top: 1440, right: 1800, bottom: 1440, left: 1800 },
      });

      const url = URL.createObjectURL(docxBlob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `教案及研讨记录《${context.title}》.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(err) {
      console.error(err);
      alert('Word 导出失败，请重试。');
    } finally {
      setIsExportingDOCX(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto py-12 px-6 animate-in fade-in zoom-in duration-700">
      <div className="text-center mb-16 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500 rounded-full blur-[100px] opacity-10 pointer-events-none" />
        <div className="inline-flex items-center justify-center w-24 h-24 bg-[#fdfaf5] bg-paper shadow-inner border border-[#d8d3c9] mb-8 relative">
          <div className="absolute inset-2 border border-[#8C2218]/30" />
          <div className="w-12 h-12 seal-stamp bg-white flex items-center justify-center text-2xl shadow-sm">
            结
          </div>
        </div>
        <h1 className="text-5xl font-bold text-[#4a453c] mb-6 tracking-widest font-serif relative z-10">备课圆桌会议已结成</h1>
        <p className="text-[#8c8578] font-medium font-serif tracking-widest text-lg">《{context.title}》的智能化教案已提炼完成，请查阅并导出。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left column: Summary Info */}
        <div className="col-span-1 space-y-6">
          <div className="bg-[#f6f4ee] bg-paper p-8 border border-[#e5e0d5] shadow-sm relative">
            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] opacity-20 pointer-events-none" />
            <h3 className="text-sm font-bold text-[#a09a8e] tracking-widest mb-8 flex items-center gap-3 font-serif border-b border-[#e5e0d5] pb-4">
               研讨要素
            </h3>
            <div className="space-y-8 relative z-10">
              <div>
                <label className="text-[12px] font-bold text-[#b0a89d] tracking-widest font-serif">课题</label>
                <div className="text-xl font-bold text-[#8C2218] mt-2 font-serif tracking-widest">《{context.title}》</div>
              </div>
              <div>
                <label className="text-[12px] font-bold text-[#b0a89d] tracking-widest font-serif">适用学段</label>
                <div className="text-base font-bold text-[#4a453c] mt-2 font-serif tracking-wider">{context.grade}</div>
              </div>
              <div>
                <label className="text-[12px] font-bold text-[#b0a89d] tracking-widest mb-3 block font-serif">执教名师团</label>
                <div className="flex flex-wrap gap-2">
                  {experts.map(expert => (
                    <div key={expert.id} className="w-10 h-10 border border-[#d8d3c9] overflow-hidden bg-white flex items-center justify-center relative">
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-serif">{expert.name.charAt(0)}</span>
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
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="w-full bg-[#fdfaf5] border border-[#d8d3c9] text-[#8C2218] hover:bg-[#8C2218] hover:text-[#f5f2eb] font-bold py-4 shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-3 font-serif tracking-widest"
            >
              {isExportingPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
              下载PDF版
            </button>
            <button
              onClick={handleExportDOCX}
              disabled={isExportingDOCX}
              className="w-full bg-[#fdfaf5] border border-[#d8d3c9] text-[#1c3f60] hover:bg-[#204a73] hover:text-[#f5f2eb] disabled:opacity-60 disabled:cursor-not-allowed font-bold py-4 shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-3 font-serif tracking-widest"
            >
              {isExportingDOCX ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
              下载Word版
            </button>
            <button 
              onClick={handleExportMarkdown}
              className="w-full bg-[#fdfaf5] border border-[#d8d3c9] text-[#4a453c] hover:bg-[#4a453c] hover:text-[#f5f2eb] font-bold py-4 shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-3 font-serif tracking-widest"
            >
              <Download className="w-5 h-5" />
              下载MD版
            </button>
            <button 
              onClick={onRestart}
              className="w-full bg-white bg-paper hover:bg-[#f6f4ee] text-[#8c8578] border border-[#d8d3c9] font-bold py-4 transition-all flex items-center justify-center gap-3 font-serif tracking-widest mt-4"
            >
              <RefreshCcw className="w-5 h-5" />
              开启新课题
            </button>
          </div>
        </div>

        {/* Right column: Content Preview */}
        <div className="col-span-1 md:col-span-3">
          <div className="bg-[#fdfcf9] bg-paper shadow-2xl overflow-hidden flex flex-col h-[800px] border border-[#e5e0d5] relative">
            <div className="absolute inset-0 bg-[#e8e4db]/20 pattern-vertical-lines pointer-events-none opacity-30" />
            <div className="p-8 border-b border-[#e5e0d5] flex items-center justify-between relative z-10 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center gap-4 border-l-2 border-[#8C2218]/50 pl-4">
                <span className="text-xl font-bold text-[#8C2218] font-serif tracking-widest">教案草案</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-12 py-16 relative z-10 scrollbar-thin scrollbar-thumb-[#d8d3c9]">
              <div id="export-content">
                <div className="mx-auto max-w-3xl prose prose-slate prose-headings:font-serif prose-headings:text-[#8C2218] prose-h1:text-center prose-h1:border-b prose-h1:border-[#e5e0d5] prose-h1:pb-6 prose-h2:border-b-2 prose-h2:border-[#e5e0d5]/50 prose-h2:pb-2 prose-h2:mt-10 prose-strong:text-[#4a453c] prose-blockquote:border-[#8C2218] prose-blockquote:bg-[#f6f4ee]/50 prose-blockquote:px-6 prose-blockquote:py-2 prose-blockquote:font-serif prose-li:marker:text-[#8C2218]">
                   <ReactMarkdown>{lessonPlan}</ReactMarkdown>
                </div>
                
                <div className="mx-auto max-w-3xl mt-24 pt-16 border-t font-serif border-[#d8d3c9]">
                  <h2 className="text-2xl font-bold text-[#4a453c] mb-12 text-center tracking-widest flex items-center justify-center gap-4">
                    <span className="w-8 h-[1px] bg-[#d8d3c9]" />
                    <span>研讨完整记录回顾</span>
                    <span className="w-8 h-[1px] bg-[#d8d3c9]" />
                  </h2>
                  <div className="prose prose-sm prose-slate max-w-none text-[#5a5245] prose-headings:font-serif prose-headings:text-[#2b2b2b] prose-h2:text-center prose-h3:text-[#8C2218] prose-p:leading-relaxed">
                     <ReactMarkdown>{fullDiscussionMarkdown}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

