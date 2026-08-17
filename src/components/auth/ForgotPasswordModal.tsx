import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Copy,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin,
}) => {
  const { resetPasswordLogin } = useAuth();

  // Wizard Steps: 1 = Request OTP, 2 = Verify OTP & Set New Password, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form fields
  const [identifier, setIdentifier] = useState('');
  const [targetContact, setTargetContact] = useState('');
  const [maskedContact, setMaskedContact] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [codePreview, setCodePreview] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState<number>(60);
  const [copiedCode, setCopiedCode] = useState(false);

  // OTP input refs
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer for resend OTP countdown
  useEffect(() => {
    let timer: any;
    if (step === 2 && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, resendCountdown]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setIdentifier('');
      setTargetContact('');
      setMaskedContact('');
      setOtpDigits(['', '', '', '', '', '']);
      setCodePreview(null);
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setLoading(false);
      setResendCountdown(60);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Step 1: Send OTP to contact number / email
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your contact number, User ID, or email.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.sendForgotPasswordOtp(identifier.trim());
      const displayTarget = res.target || res.email || identifier.trim();
      const masked = res.maskedTarget || res.maskedEmail || displayTarget;
      setTargetContact(displayTarget);
      setMaskedContact(masked);
      if (res.codePreview) {
        setCodePreview(res.codePreview);
      }
      setStep(2);
      setResendCountdown(60);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 200);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await api.sendForgotPasswordOtp(targetContact || identifier);
      if (res.codePreview) {
        setCodePreview(res.codePreview);
      }
      setResendCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit changes with auto-advance & paste
  const handleOtpChange = (index: number, value: string) => {
    // Handle full paste
    if (value.length > 1) {
      const cleaned = value.replace(/[^0-9]/g, '').slice(0, 6);
      if (cleaned.length > 0) {
        const newOtp = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          newOtp[i] = cleaned[i] || '';
        }
        setOtpDigits(newOtp);
        const nextFocus = Math.min(cleaned.length, 5);
        inputRefs.current[nextFocus]?.focus();
        return;
      }
    }

    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otpDigits];
    newOtp[index] = digit;
    setOtpDigits(newOtp);

    // Auto advance
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Auto-fill OTP from test preview banner
  const handleAutoFillOtp = (code: string) => {
    const chars = code.split('').slice(0, 6);
    setOtpDigits(chars);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Calculate password strength
  const getPasswordStrength = () => {
    if (!newPassword) return { score: 0, label: 'None', color: 'bg-white/20' };
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 10) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 3) return { score, label: 'Moderate', color: 'bg-amber-500' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength();
  const fullOtp = otpDigits.join('');

  // Handle Step 2: Reset Password & Auto Login
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullOtp.length !== 6) {
      setError('Please enter the complete 6-digit OTP code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await resetPasswordLogin({
        target: targetContact || identifier,
        phoneNumber: targetContact || identifier,
        contactNumber: targetContact || identifier,
        email: targetContact || identifier,
        otp: fullOtp,
        newPassword,
        confirmPassword,
      });

      setStep(3);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Password reset failed. Please verify the OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
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
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-[#00e5ff]">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-light text-white tracking-tight">Forgot Password</h2>
              <p className="text-xs font-mono text-white/40">OTP_RECOVERY_PROTOCOL</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center space-x-2 mb-6 font-mono text-[11px]">
            <div
              className={`flex-1 h-1 rounded-full transition-all ${
                step >= 1 ? 'bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]' : 'bg-white/10'
              }`}
            />
            <div
              className={`flex-1 h-1 rounded-full transition-all ${
                step >= 2 ? 'bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]' : 'bg-white/10'
              }`}
            />
            <div
              className={`flex-1 h-1 rounded-full transition-all ${
                step >= 3 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-white/10'
              }`}
            />
          </div>

          {/* Error alert */}
          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* STEP 1: Enter Phone / Identifier */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block mb-2 text-white/70">
                  Enter registered Contact Number, User ID, or Email:
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00e5ff]" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. +1 555 123 4567, 9876543210, or USR-10293"
                    className="w-full pl-9 pr-4 py-3 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white placeholder-white/30 outline-none transition-all tracking-wider"
                  />
                </div>
              </div>

              <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl text-white/60 text-[11px] leading-relaxed flex items-start space-x-2">
                <Info className="w-4 h-4 shrink-0 text-[#00e5ff] mt-0.5" />
                <span>
                  We will generate a secure 6-digit one-time verification password (OTP) and transmit it directly to your registered contact number.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="w-full py-3 px-4 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold font-mono rounded-xl shadow-[0_4px_16px_rgba(0,229,255,0.2)] flex items-center justify-center space-x-2 transition-all disabled:opacity-50 text-xs mt-2 uppercase"
              >
                {loading ? (
                  <span>DISPATCHING OTP CODE...</span>
                ) : (
                  <>
                    <span>SEND VERIFICATION OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-white/50 hover:text-white text-xs flex items-center justify-center space-x-1.5 mx-auto transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Enter OTP & Set New Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4 font-mono text-xs">
              {/* Target info */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-white/70">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-[#00e5ff]" />
                  <span>OTP sent to: <strong className="text-white font-medium">{maskedContact}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[11px] text-[#00e5ff] hover:underline"
                >
                  Change
                </button>
              </div>

              {/* In-app OTP Preview Banner for Seamless Preview Testing */}
              {codePreview && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-emerald-300 text-[11px]">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Test OTP: <strong className="tracking-widest font-mono text-emerald-200 text-xs">{codePreview}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutoFillOtp(codePreview)}
                    className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-[10px] flex items-center space-x-1 border border-emerald-500/30 transition-colors"
                  >
                    {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Filled' : 'Auto-Fill'}</span>
                  </button>
                </div>
              )}

              {/* 6-digit OTP Inputs */}
              <div>
                <label className="block mb-2 text-white/70">
                  Enter 6-Digit Verification OTP:
                </label>
                <div className="flex justify-between gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-12 text-center text-lg font-bold bg-[#0b0c10] border border-white/15 focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] rounded-xl text-white outline-none transition-all shadow-inner"
                    />
                  ))}
                </div>

                {/* Resend Timer */}
                <div className="flex items-center justify-between mt-2 text-[11px] text-white/40">
                  <span>Code expires in 10 minutes</span>
                  {resendCountdown > 0 ? (
                    <span>Resend in {resendCountdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-[#00e5ff] hover:underline flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Resend Code</span>
                    </button>
                  )}
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block mb-1.5 text-white/70">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00e5ff]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-10 py-2.5 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white placeholder-white/30 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength Meter */}
                {newPassword && (
                  <div className="mt-1.5 flex items-center space-x-2">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden flex gap-0.5">
                      <div className={`flex-1 ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                      <div className={`flex-1 ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                      <div className={`flex-1 ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
                      <div className={`flex-1 ${strength.score >= 4 ? strength.color : 'bg-transparent'}`} />
                    </div>
                    <span className="text-[10px] text-white/50">{strength.label}</span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block mb-1.5 text-white/70">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00e5ff]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm matching password"
                    className={`w-full pl-9 pr-10 py-2.5 bg-[#0b0c10] border rounded-xl text-xs text-white placeholder-white/30 outline-none transition-all ${
                      confirmPassword && confirmPassword !== newPassword
                        ? 'border-rose-500/60'
                        : 'border-white/10 focus:border-[#00e5ff]/60'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-[10px] text-rose-400 mt-1">Passwords do not match.</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || fullOtp.length !== 6 || !newPassword || newPassword !== confirmPassword}
                className="w-full py-3 px-4 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold font-mono rounded-xl shadow-[0_4px_16px_rgba(0,229,255,0.2)] flex items-center justify-center space-x-2 transition-all disabled:opacity-50 text-xs mt-3 uppercase"
              >
                {loading ? (
                  <span>UPDATING CREDENTIALS...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>RESET PASSWORD AND LOG IN</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-white/50 hover:text-white text-xs flex items-center justify-center space-x-1.5 mx-auto transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Success Confirmation */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-4 font-mono text-xs"
            >
              <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-light text-white">Password Reset Successful!</h3>
              <p className="text-white/60 text-xs max-w-xs mx-auto">
                Your password has been securely updated. Signing you into Gossip...
              </p>
              <div className="flex justify-center pt-2">
                <div className="w-6 h-6 border-2 border-[#00e5ff]/20 border-t-[#00e5ff] rounded-full animate-spin" />
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
