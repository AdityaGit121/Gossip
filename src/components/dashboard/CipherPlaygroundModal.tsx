import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Unlock, SlidersHorizontal, Sparkles, RefreshCw, KeyRound, Copy, Check } from 'lucide-react';
import { caesarCipherEncrypt, caesarCipherDecrypt } from '../../utils/caesarCipher.js';

interface CipherPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CipherPlaygroundModal: React.FC<CipherPlaygroundModalProps> = ({ isOpen, onClose }) => {
  const [inputText, setInputText] = useState('ATTACK AT DAWN 123!');
  const [shift, setShift] = useState(5);
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const outputText =
    mode === 'encrypt' ? caesarCipherEncrypt(inputText, shift) : caesarCipherDecrypt(inputText, shift);

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate character transformation preview table for first 8 characters
  const charTransformations = inputText.slice(0, 10).split('').map((char) => {
    const transformed =
      mode === 'encrypt' ? caesarCipherEncrypt(char, shift) : caesarCipherDecrypt(char, shift);
    return { original: char, transformed };
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg p-6 overflow-hidden bg-[#0f1116] border border-[#00e5ff]/30 rounded-2xl shadow-2xl text-white font-sans"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center space-x-3 mb-5">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-[#00e5ff]">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-light text-white tracking-tight flex items-center space-x-2">
                <span>Caesar Cipher Playground</span>
                <Sparkles className="w-4 h-4 text-[#00e5ff]" />
              </h3>
              <p className="text-xs font-mono text-white/40">CRYPTOGRAPHIC_ALGORITHM_SUITE</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 mb-4 font-mono">
            <button
              onClick={() => setMode('encrypt')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center space-x-2 ${
                mode === 'encrypt'
                  ? 'bg-[#00e5ff] text-black shadow-[0_4px_16px_rgba(0,229,255,0.2)]'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>ENCRYPT_MODE</span>
            </button>
            <button
              onClick={() => setMode('decrypt')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center space-x-2 ${
                mode === 'decrypt'
                  ? 'bg-amber-400 text-black shadow'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>DECRYPT_MODE</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* Input Text */}
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-300">
                {mode === 'encrypt' ? 'Plaintext Message:' : 'Encrypted Cipher Text:'}
              </label>
              <textarea
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type text to shift..."
                className="w-full px-3 py-2 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs font-mono text-white outline-none resize-none"
              />
            </div>

            {/* Shift Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-white/60 mb-1">
                <span>Shift Value (1 - 25):</span>
                <span className="text-[#00e5ff] font-bold text-sm font-mono">+{shift}</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={shift}
                onChange={(e) => setShift(Number(e.target.value))}
                className="w-full accent-[#00e5ff] cursor-pointer"
              />
            </div>

            {/* Output Result Card */}
            <div className="p-4 bg-[#0b0c10] border border-[#00e5ff]/30 rounded-xl space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#00e5ff]">
                  {mode === 'encrypt' ? '🔒 CIPHERTEXT_RESULT:' : '🔓 DECRYPTED_PLAINTEXT:'}
                </span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border border-white/10 text-[11px] font-mono rounded flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3 h-3 text-[#00e5ff]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>

              <div className="p-3 bg-white/[0.02] rounded-lg font-mono text-cyan-200 text-sm font-semibold break-all border border-[#00e5ff]/20">
                {outputText || '...'}
              </div>
            </div>

            {/* Character-by-Character Transformation Matrix */}
            <div>
              <span className="block text-[11px] font-mono text-white/40 mb-1.5">
                TRANSFORMATION_MATRIX:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {charTransformations.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-2 py-1 bg-[#0b0c10] border border-white/10 rounded text-center text-[10px] font-mono"
                  >
                    <span className="text-white/40">{item.original === ' ' ? '␣' : item.original}</span>
                    <span className="text-[#00e5ff] mx-1">→</span>
                    <span className="text-cyan-200 font-bold">{item.transformed === ' ' ? '␣' : item.transformed}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-white/10 text-right">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold rounded-xl text-xs transition-all font-mono tracking-wider shadow-[0_4px_16px_rgba(0,229,255,0.2)]"
            >
              DONE
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
