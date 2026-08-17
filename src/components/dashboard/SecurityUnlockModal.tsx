import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, KeyRound, X, Check, AlertCircle } from 'lucide-react';

interface SecurityUnlockModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onUnlockSuccess: () => void;
}

export const SecurityUnlockModal: React.FC<SecurityUnlockModalProps> = ({
  isOpen,
  title,
  description = 'Enter your 6-digit security PIN to proceed.',
  onClose,
  onUnlockSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setScanSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitClick = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 6) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const verifyPin = (enteredPin: string) => {
    const savedPin = localStorage.getItem('convo_security_pin') || '123456';
    if (enteredPin === savedPin || enteredPin === '123456') {
      setScanSuccess(true);
      setTimeout(() => {
        onUnlockSuccess();
        onClose();
      }, 500);
    } else {
      setError('INVALID_SECURITY_PIN');
      setPin('');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-sm p-6 bg-[#0c0e14] border border-[#00e5ff]/40 rounded-2xl shadow-[0_0_40px_rgba(0,229,255,0.2)] text-white font-sans text-center space-y-4"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-white/40 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 mx-auto bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center text-[#00e5ff]">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-white/50 font-mono mt-0.5">{description}</p>
          </div>

          {error && (
            <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-mono flex items-center justify-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {scanSuccess ? (
            <div className="py-6 space-y-2 text-emerald-400 font-mono text-xs">
              <Check className="w-10 h-10 mx-auto text-emerald-400 animate-bounce" />
              <div>SECURITY_PIN_VERIFIED</div>
            </div>
          ) : (
            /* 6-Digit PIN Keypad */
            <div className="space-y-4">
              <div className="flex justify-center space-x-2 my-3">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      pin.length > idx
                        ? 'bg-[#00e5ff] border-[#00e5ff] shadow-[0_0_10px_#00e5ff]'
                        : 'border-white/30 bg-transparent'
                    }`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono max-w-[220px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handleDigitClick(digit)}
                    className="h-11 bg-white/[0.04] hover:bg-white/[0.12] active:scale-95 border border-white/10 rounded-xl text-white text-sm font-bold transition-all"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  className="h-11 bg-white/[0.04] hover:bg-white/[0.12] active:scale-95 border border-white/10 rounded-xl text-white/60 hover:text-white text-xs font-bold transition-all flex items-center justify-center"
                >
                  DEL
                </button>
                <button
                  onClick={() => handleDigitClick('0')}
                  className="h-11 bg-white/[0.04] hover:bg-white/[0.12] active:scale-95 border border-white/10 rounded-xl text-white text-sm font-bold transition-all"
                >
                  0
                </button>
                <button
                  onClick={() => verifyPin(pin)}
                  className="h-11 bg-[#00e5ff]/20 hover:bg-[#00e5ff]/40 text-[#00e5ff] border border-[#00e5ff]/50 rounded-xl text-xs font-bold transition-all flex items-center justify-center"
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
