import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');

  useEffect(() => {
    if (isOpen) {
      setBaseUrl(localStorage.getItem('custom_api_base_url') || 'https://api.deepseek.com/v1');
      setApiKey(localStorage.getItem('custom_api_key') || '');
      setModel(localStorage.getItem('custom_api_model') || 'deepseek-chat');
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('custom_api_base_url', baseUrl.trim());
    localStorage.setItem('custom_api_key', apiKey.trim());
    localStorage.setItem('custom_api_model', model.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#fcfaf5] w-full max-w-md shadow-2xl relative border border-[#e8e4db]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#e8e4db] bg-white">
          <h2 className="text-xl font-bold text-[#4a453c] font-serif tracking-widest">API 设置</h2>
          <button onClick={onClose} className="text-[#a09a8e] hover:text-[#4a453c] transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#8c8578] font-serif uppercase tracking-wider block">
              API Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="例如: https://api.deepseek.com/v1"
              className="w-full border-2 border-[#e8e4db] focus:border-[#8C2218] px-4 py-3 outline-none text-sm font-medium transition-colors bg-white font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[#8c8578] font-serif uppercase tracking-wider block">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full border-2 border-[#e8e4db] focus:border-[#8C2218] px-4 py-3 outline-none text-sm font-medium transition-colors bg-white font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[#8c8578] font-serif uppercase tracking-wider block">
              Model Name
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="例如: deepseek-chat"
              className="w-full border-2 border-[#e8e4db] focus:border-[#8C2218] px-4 py-3 outline-none text-sm font-medium transition-colors bg-white font-mono"
            />
          </div>

          <div className="pt-2 text-xs text-[#a09a8e] leading-relaxed">
            * 您的 API Key 仅保存在浏览器本地，不会上传至我们的服务器。本工具默认兼容 OpenAI 格式的接口（如 DeepSeek 等）。
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#e8e4db] bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-[#8c8578] hover:bg-[#f5f2eb] transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 text-sm font-bold bg-[#8C2218] text-[#f5f2eb] hover:bg-[#681610] shadow-md transition-colors tracking-widest"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};
