import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onEnter: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onEnter }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#fdfcf9] bg-paper">
      {/* Texture Overlays */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] opacity-40 pointer-events-none mix-blend-multiply" />
      <div className="absolute inset-0 bg-[#e8e4db]/20 pattern-vertical-lines pointer-events-none opacity-[0.15]" />
      
      {/* Decorative Borders */}
      <div className="absolute top-12 bottom-12 left-12 w-px bg-[#e8e4db] hidden md:block" />
      <div className="absolute top-12 bottom-12 right-12 w-px bg-[#e8e4db] hidden md:block" />
      <div className="absolute top-12 left-12 right-12 h-px bg-[#e8e4db] hidden md:block" />
      <div className="absolute bottom-12 left-12 right-12 h-px bg-[#e8e4db] hidden md:block" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-stretch gap-16 md:gap-24 w-full max-w-5xl px-8">
        
        {/* Left Side: Accent & Stamp */}
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "100%", opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="hidden md:flex flex-col items-center justify-start pt-8"
        >
          <div className="w-[1.5px] h-32 bg-[#8C2218] mb-10 opacity-80" />
          <div className="w-12 h-12 seal-stamp border-[1.5px] border-[#8C2218] flex items-center justify-center text-xl text-[#8C2218]">
            印
          </div>
          <div className="w-[1px] h-24 bg-[#a09a8e] mt-10 opacity-30" />
        </motion.div>

        {/* Right Side: Typography */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
          className="flex flex-col justify-center"
        >
          {/* Subtitle */}
          <div className="flex items-center gap-6 mb-12">
            <div className="h-px w-12 bg-[#8C2218] opacity-50" />
            <span className="text-[#a09a8e] font-serif tracking-[0.4em] text-sm md:text-base uppercase">
              AI Master Teacher Roundtable
            </span>
          </div>
          
          {/* Main Title Line 1 */}
          <h1 className="text-7xl md:text-[140px] leading-[1.1] font-bold text-[#3a352d] font-serif tracking-[0.1em] relative z-10 mb-4 md:-ml-2">
            名师
          </h1>
          
          {/* Main Title Line 2 */}
          <h1 className="text-7xl md:text-[140px] leading-[1.1] font-bold text-[#3a352d] font-serif tracking-[0.1em] relative z-10">
            议课堂
          </h1>

          {/* Description */}
          <div className="mt-16 md:mt-20 flex flex-col gap-4">
            <p className="text-[#8c8578] font-serif tracking-[0.3em] text-lg md:text-xl">
              汇聚名师智慧 · 破解教学难点
            </p>
          </div>

          {/* Action Button */}
          <div className="mt-24 md:mt-32">
            <motion.button
              whileHover={{ x: 15 }}
              onClick={onEnter}
              className="group flex items-center gap-6 text-[#8C2218] text-2xl font-serif tracking-[0.2em] hover:text-[#681610] transition-colors focus:outline-none"
            >
              立卷开题
              <ArrowRight className="w-6 h-6 stroke-[1.5] transition-transform group-hover:translate-x-2" />
            </motion.button>
          </div>
        </motion.div>
        
      </div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-6 w-full text-center px-4"
      >
        <p className="text-[#a09a8e] font-serif text-xs md:text-sm tracking-widest bg-white/50 backdrop-blur-sm inline-block px-4 py-2 rounded-sm border border-[#e8e4db] shadow-sm">
          * 本产品中的名师角色基于公开发表的教学理论和方法论构建，AI生成内容不代表名师本人观点，仅供教学参考。
        </p>
      </motion.div>
    </div>
  );
};
