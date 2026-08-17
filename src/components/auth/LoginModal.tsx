import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Phone, User, ShieldCheck, KeyRound, AlertCircle, ArrowRight, Sparkles, Delete, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup: () => void;
  onOpenForgotPassword?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSwitchToSignup,
  onOpenForgotPassword,
}) => {
  const { login } = useAuth();
  
  // Contact / Account Identifier (Email, User ID, or Phone Number)
  const [identifier, setIdentifier] = useState('');

  // 6-digit PIN state
  const [pin, setPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const identifierInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setLoading(false);
      setTimeout(() => {
        identifierInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle global keyboard typing for PIN when modal is open and identifier is not being typed
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in the identifier input field
      if (document.activeElement === identifierInputRef.current) {
        if (e.key === 'Enter') {
          e.preventDefault();
          identifierInputRef.current?.blur();
        }
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitClick(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length === 6) {
          verifyPinLogin(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, identifier]);

  if (!isOpen) return null;

  const handleDigitClick = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 6) {
        verifyPinLogin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClearPin = () => {
    setPin('');
    setError(null);
  };

  const verifyPinLogin = async (enteredPin: string) => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your Email, User ID, or Phone Number first.');
      identifierInputRef.current?.focus();
      return;
    }

    if (enteredPin.length < 4) {
      setError('Please enter your complete security PIN.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(cleanId, { pin: enteredPin });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid Security PIN. Please try again or recover with OTP.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md p-6 overflow-hidden bg-[#0f1116] border border-[#00e5ff]/30 rounded-2xl shadow-2xl text-white font-sans"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center space-x-3 mb-5">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.15)]">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-light text-white tracking-tight">
                Login
              </h2>
            </div>
          </div>

          {/* Error alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2 font-mono"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Email / User ID / Phone Number Field */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-white/70 flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span>Email, User ID, or Phone Number</span>
              </label>
              {onOpenForgotPassword && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenForgotPassword();
                  }}
                  className="text-[11px] font-mono text-[#00e5ff] hover:underline"
                >
                  Forgot PIN?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                ref={identifierInputRef}
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. user@example.com, jay123456, or +1234567890"
                className="w-full px-3.5 py-2.5 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white placeholder-white/30 outline-none transition-all font-mono tracking-wide"
              />
            </div>
          </div>

          {/* 6-Digit PIN Visual Display */}
          <div className="my-4 text-center">
            <div className="text-[11px] font-mono text-white/50 mb-2 flex items-center justify-center space-x-1">
              <KeyRound className="w-3 h-3 text-[#00e5ff]" />
              <span>ENTER 6-DIGIT PASSCODE PIN</span>
            </div>

            <div className="flex justify-center space-x-2.5 my-2">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = pin.length > idx;
                const isCurrent = pin.length === idx;
                return (
                  <motion.div
                    key={idx}
                    animate={isFilled ? { scale: [1, 1.1, 1] } : {}}
                    className={`w-10 h-11 rounded-xl border flex items-center justify-center transition-all font-mono font-bold text-sm ${
                      isFilled
                        ? 'bg-[#00e5ff]/20 border-[#00e5ff] text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                        : isCurrent
                        ? 'border-[#00e5ff]/70 bg-white/[0.04] shadow-[0_0_8px_rgba(0,229,255,0.15)] animate-pulse'
                        : 'border-white/15 bg-white/[0.02] text-white/20'
                    }`}
                  >
                    {isFilled ? '●' : ''}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Keypad */}
          <div className="max-w-[260px] mx-auto space-y-2 font-mono">
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={loading}
                  onClick={() => handleDigitClick(digit)}
                  className="h-11 bg-white/[0.04] hover:bg-[#00e5ff]/15 hover:border-[#00e5ff]/50 active:scale-95 border border-white/10 rounded-xl text-white text-base font-bold transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                disabled={loading || pin.length === 0}
                onClick={handleBackspace}
                className="h-11 bg-white/[0.04] hover:bg-rose-500/20 hover:border-rose-500/40 active:scale-95 border border-white/10 rounded-xl text-white/60 hover:text-rose-300 text-xs font-bold transition-all disabled:opacity-30 flex items-center justify-center space-x-1"
              >
                <span>DEL</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDigitClick('0')}
                className="h-11 bg-white/[0.04] hover:bg-[#00e5ff]/15 hover:border-[#00e5ff]/50 active:scale-95 border border-white/10 rounded-xl text-white text-base font-bold transition-all disabled:opacity-50 flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                disabled={loading || !identifier.trim() || pin.length < 4}
                onClick={() => verifyPinLogin(pin)}
                className="h-11 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-bold border border-[#00e5ff] rounded-xl text-xs transition-all active:scale-95 disabled:opacity-40 disabled:hover:bg-[#00e5ff] flex items-center justify-center space-x-1 shadow-[0_0_15px_rgba(0,229,255,0.25)]"
              >
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  <>
                    <span>OK</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {pin.length > 0 && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleClearPin}
                  className="text-[10px] text-white/40 hover:text-white underline transition-colors"
                >
                  CLEAR PIN
                </button>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="mt-5 flex flex-col items-center space-y-2 text-center text-xs font-mono text-white/40 border-t border-white/10 pt-4">
            {onOpenForgotPassword && (
              <div>
                FORGOT PIN CODE?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenForgotPassword();
                  }}
                  className="text-[#00e5ff] font-medium hover:underline focus:outline-none"
                >
                  RECOVER VIA OTP CODE
                </button>
              </div>
            )}
            <div>
              DON'T HAVE AN ACCOUNT?{' '}
              <button
                onClick={() => {
                  onClose();
                  onSwitchToSignup();
                }}
                className="text-[#00e5ff] font-medium hover:underline focus:outline-none"
              >
                SIGN UP
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
