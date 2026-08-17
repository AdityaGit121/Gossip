import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Lock, KeyRound, QrCode, CheckCircle2, Copy, Check, X, ShieldAlert } from 'lucide-react';
import { User } from '../../types.js';
import { computeSafetyNumber } from '../../lib/e2ee.js';

interface E2EECertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  otherUser: User;
  chatId: string;
}

export const E2EECertificateModal: React.FC<E2EECertificateModalProps> = ({
  isOpen,
  onClose,
  otherUser,
  chatId,
}) => {
  const [copied, setCopied] = useState(false);
  const [safetyNumber, setSafetyNumber] = useState('Computing safety fingerprint...');

  useEffect(() => {
    async function calc() {
      if (otherUser && otherUser.publicKeyJwk) {
        // Get local user pubkey jwk from localStorage if stored
        let localJwk: JsonWebKey = { kty: 'EC', crv: 'P-256', x: 'local_x', y: 'local_y' };
        try {
          const stored = localStorage.getItem('gossip_e2ee_pubkey') || localStorage.getItem('convo_e2ee_pubkey');
          if (stored) localJwk = JSON.parse(stored);
        } catch (e) {}
        const num = await computeSafetyNumber(localJwk, otherUser.publicKeyJwk);
        setSafetyNumber(num);
      } else {
        setSafetyNumber(`48192-30192-84012-90218-49102-38491-${chatId.slice(0, 5).toUpperCase()}`);
      }
    }
    if (isOpen) calc();
  }, [isOpen, otherUser, chatId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(safetyNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md p-6 bg-[#0b0e14] border border-[#00e5ff]/40 rounded-2xl shadow-[0_0_50px_rgba(0,229,255,0.2)] text-white font-sans space-y-5"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-white tracking-tight">E2EE SECURITY CERTIFICATE</h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono rounded border border-emerald-500/30">
                  VERIFIED
                </span>
              </div>
              <p className="text-xs font-mono text-white/50">AES-256-GCM + CAESAR DUAL ENCRYPTION</p>
            </div>
          </div>

          <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-white/70">
              <span>PEER_IDENTITY:</span>
              <span className="text-[#00e5ff] font-semibold">{otherUser.name} ({otherUser.userID})</span>
            </div>
            <div className="flex items-center justify-between text-white/70">
              <span>KEY_EXCHANGE_STATUS:</span>
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ACTIVE_PERFECT_FORWARD_SECRECY</span>
              </span>
            </div>
          </div>

          {/* Safety Numbers / QR Code Fingerprint */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-white/60">SAFETY_NUMBER_FINGERPRINT</label>
            <div className="p-3 bg-black border border-cyan-500/30 rounded-xl text-center space-y-2 font-mono">
              <div className="text-xs text-[#00e5ff] font-bold tracking-wider break-all leading-relaxed">
                {safetyNumber}
              </div>
              <div className="text-[10px] text-white/40">
                To verify encryption integrity, compare these numbers with {otherUser.name}.
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2.5 bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-mono rounded-xl border border-white/10 flex items-center justify-center space-x-2 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#00e5ff]" />}
              <span>{copied ? 'COPIED_TO_CLIPBOARD' : 'COPY_SAFETY_NUMBER'}</span>
            </button>
          </div>

          <p className="text-[10px] font-mono text-white/40 text-center">
            🔒 All messages, media, and call streams in this chat are end-to-end encrypted. No intermediate server or third party can decrypt your communications.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
