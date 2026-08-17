import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, KeyRound, Lock, Unlock, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Message } from '../../types.js';
import { useChat } from '../../context/ChatContext.tsx';

interface DecryptModalProps {
  isOpen: boolean;
  message: Message | null;
  onClose: () => void;
  onSuccessDecrypt: (messageId: string, decryptedText: string) => void;
}

export const DecryptModal: React.FC<DecryptModalProps> = ({
  isOpen,
  message,
  onClose,
  onSuccessDecrypt,
}) => {
  const { verifyPasskeyAndDecrypt } = useChat();
  const [passkey, setPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !message) return null;

  const handleDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkey.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const result = await verifyPasskeyAndDecrypt(message.id, passkey.trim());

      if (result.success && result.decryptedText) {
        onSuccessDecrypt(message.id, result.decryptedText);
        setPasskey('');
        onClose();
      } else {
        setError(result.error || 'Wrong Passkey - Access Denied');
      }
    } catch (err: any) {
      setError('Wrong Passkey - Access Denied');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md p-6 overflow-hidden bg-[#0f1116] border border-[#00e5ff]/30 rounded-2xl shadow-2xl text-white font-sans"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center space-x-3 mb-5">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-[#00e5ff]">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-light text-white tracking-tight">Decrypt Transmission</h3>
              <p className="text-xs font-mono text-[#00e5ff]">ENTER_SECRET_PASSKEY</p>
            </div>
          </div>

          {/* Shift Value Badge */}
          <div className="p-3 bg-[#0b0c10] border border-white/10 rounded-xl mb-4 space-y-1 font-mono">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>SHIFT_VALUE:</span>
              <span className="text-[#00e5ff] font-bold">+{message.shiftValue || 5}</span>
            </div>
            {message.passkeyHint && (
              <p className="text-[11px] text-cyan-200/80 italic">{message.passkeyHint}</p>
            )}
            <div className="text-xs text-white/40 truncate">
              CYPHER_PAYLOAD: <span className="text-cyan-200">{message.text}</span>
            </div>
          </div>

          {/* Error alert */}
          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleDecrypt} className="space-y-4">
            <div>
              <label className="block mb-1.5 text-xs font-mono text-white/60">Enter Passkey</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00e5ff]" />
                <input
                  type={showPasskey ? 'text' : 'password'}
                  required
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Passkey (e.g. SECRET123)"
                  className="w-full pl-9 pr-10 py-2.5 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/80 rounded-xl text-sm font-mono text-white placeholder-white/30 outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 font-mono text-xs rounded-xl transition-all border border-white/10"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={loading || !passkey.trim()}
                className="flex-1 py-2.5 px-4 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold font-mono rounded-xl shadow-[0_4px_16px_rgba(0,229,255,0.2)] text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span>VERIFYING...</span>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>DECRYPT_MSG</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
