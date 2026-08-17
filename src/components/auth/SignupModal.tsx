import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, User, ShieldCheck, CheckCircle2, Sparkles, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { User as UserType } from '../../types.js';
import { RegistrationPermissionsModal } from './RegistrationPermissionsModal.tsx';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    contactNumber: '',
    securityPin: '',
    confirmSecurityPin: '',
    email: '',
    captcha: '',
  });
  const [captchaValue, setCaptchaValue] = useState({ a: 0, b: 0 });
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<UserType | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  useEffect(() => {
    setCaptchaValue({
      a: Math.floor(Math.random() * 10),
      b: Math.floor(Math.random() * 10),
    });
  }, []);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parseInt(formData.captcha) !== captchaValue.a + captchaValue.b) {
      setError('Incorrect CAPTCHA result.');
      return;
    }
    
    const cleanContact = formData.contactNumber.trim();
    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!cleanContact || cleanContact.replace(/[^0-9]/g, '').length < 7) {
      setError('Please enter a valid contact number (at least 7 digits).');
      return;
    }

    const cleanPin = formData.securityPin.trim();
    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 6) {
      setError('Please enter a 4 to 6 digit Security PIN.');
      return;
    }

    if (cleanPin !== formData.confirmSecurityPin.trim()) {
      setError('Security PINs do not match.');
      return;
    }

    setLoading(true);

    try {
      localStorage.setItem('gossip_security_pin', cleanPin);
      localStorage.setItem('convo_security_pin', cleanPin);

      const user = await signup({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phoneNumber: cleanContact,
        contactNumber: cleanContact,
        password: cleanPin,
        confirmPassword: cleanPin,
        pin: cleanPin,
      });

      setCreatedUser(user);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSignup = () => {
    setShowPermissionsModal(true);
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md p-6 overflow-hidden bg-[#0f1116] border border-[#00e5ff]/30 rounded-2xl shadow-2xl text-white font-sans max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {createdUser ? (
              <div className="py-6 text-center space-y-4 font-sans">
                <div className="w-16 h-16 mx-auto bg-cyan-500/10 border border-cyan-500/30 rounded-full flex items-center justify-center text-[#00e5ff]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-light text-white tracking-tight">ACCOUNT_REGISTERED</h3>
                <p className="text-sm text-white/70">
                  Welcome, <span className="font-semibold text-[#00e5ff]">{createdUser.name}</span>. Registered with contact number{' '}
                  <span className="font-mono text-white">{createdUser.phoneNumber || createdUser.contactNumber}</span>.
                </p>

                {/* Unique User ID Display Card */}
                <div className="p-4 bg-[#0b0c10] border border-[#00e5ff]/30 rounded-xl space-y-1 text-center font-mono">
                  <span className="text-xs uppercase tracking-wider text-white/40">YOUR_UNIQUE_USER_ID</span>
                  <div className="text-2xl font-bold text-[#00e5ff] flex items-center justify-center space-x-2">
                    <Sparkles className="w-5 h-5 text-[#00e5ff] animate-pulse" />
                    <span>{createdUser.userID}</span>
                  </div>
                  <p className="text-[11px] text-white/40">You can log in anytime using your Contact Number and 6-Digit PIN.</p>
                </div>

                <button
                  onClick={handleFinishSignup}
                  className="w-full py-3 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-bold font-mono rounded-xl transition-all shadow-[0_4px_16px_rgba(0,229,255,0.2)] text-xs"
                >
                  CONTINUE TO DASHBOARD →
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center space-x-3 mb-5">
                  <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-[#00e5ff]">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-light text-white tracking-tight">Create Account</h2>
                    <p className="text-xs font-mono text-white/40">PIN_BASED_REGISTRATION</p>
                  </div>
                </div>

                {/* Error alert */}
                {error && (
                  <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono">
                    {error}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label className="block mb-1 text-xs font-mono text-white/60">Email Address</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00e5ff]" />
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="e.g. john@example.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white placeholder-white/30 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-mono text-white/60">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00e5ff]" />
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. John Doe"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white placeholder-white/30 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-mono text-white/60">Contact Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00e5ff]" />
                      <input
                        type="tel"
                        name="contactNumber"
                        required
                        value={formData.contactNumber}
                        onChange={handleChange}
                        placeholder="e.g. +1 555 123 4567 or 9876543210"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white placeholder-white/30 outline-none font-mono tracking-wider"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 text-xs font-mono text-white/60">6-Digit PIN</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00e5ff]" />
                        <input
                          type={showPin ? 'text' : 'password'}
                          name="securityPin"
                          required
                          maxLength={6}
                          value={formData.securityPin}
                          onChange={handleChange}
                          placeholder="e.g. 123456"
                          className="w-full pl-9 pr-8 py-2.5 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white placeholder-white/30 outline-none font-mono tracking-widest"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1 text-xs font-mono text-white/60">Confirm PIN</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00e5ff]" />
                        <input
                          type={showConfirmPin ? 'text' : 'password'}
                          name="confirmSecurityPin"
                          required
                          maxLength={6}
                          value={formData.confirmSecurityPin}
                          onChange={handleChange}
                          placeholder="Re-enter PIN"
                          className="w-full pl-9 pr-8 py-2.5 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white placeholder-white/30 outline-none font-mono tracking-widest"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPin(!showConfirmPin)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          {showConfirmPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-mono text-white/60">
                      CAPTCHA: {captchaValue.a} + {captchaValue.b} = ?
                    </label>
                    <input
                      type="number"
                      name="captcha"
                      required
                      value={formData.captcha}
                      onChange={handleChange}
                      placeholder="Enter result"
                      className="w-full px-3 py-2.5 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white placeholder-white/30 outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold font-mono rounded-xl shadow-[0_4px_16px_rgba(0,229,255,0.2)] transition-all disabled:opacity-50 mt-2 text-xs uppercase"
                  >
                    {loading ? 'CREATING ACCOUNT...' : 'SIGN UP'}
                  </button>
                </form>

                <div className="mt-4 text-center text-xs font-mono text-white/40">
                  ALREADY HAVE AN ACCOUNT?{' '}
                  <button
                    onClick={() => {
                      onClose();
                      onSwitchToLogin();
                    }}
                    className="text-[#00e5ff] font-medium hover:underline focus:outline-none"
                  >
                    LOG IN
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </AnimatePresence>

      <RegistrationPermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          onClose();
        }}
        onPermissionsGranted={() => {
          onClose();
        }}
      />
    </>
  );
};
