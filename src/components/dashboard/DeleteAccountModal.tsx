import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  AlertTriangle,
  RotateCw,
  Trash2,
  Lock,
  Mail,
  Phone,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose }) => {
  const { user, deleteAccount } = useAuth();
  const [identifierInput, setIdentifierInput] = useState('');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate a random 5-character alphanumeric CAPTCHA
  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput('');
    setError(null);
  };

  useEffect(() => {
    if (isOpen) {
      generateCaptcha();
      setIdentifierInput('');
      setPasscodeInput('');
      setError(null);
    }
  }, [isOpen]);

  // Render CAPTCHA on canvas with distortion and noise lines
  useEffect(() => {
    if (!isOpen || !captchaCode || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#120309');
    bgGrad.addColorStop(1, '#2a0814');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Noise background lines
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = `rgba(244, 63, 94, ${0.15 + Math.random() * 0.25})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Noise dots
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.4})`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }

    // Render characters
    ctx.font = 'bold 22px monospace';
    ctx.textBaseline = 'middle';

    const charWidth = canvas.width / (captchaCode.length + 1);
    for (let i = 0; i < captchaCode.length; i++) {
      const char = captchaCode[i];
      const x = (i + 0.8) * charWidth;
      const y = canvas.height / 2 + (Math.random() * 6 - 3);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((Math.random() - 0.5) * 0.4);

      // Color variation
      const colors = ['#f43f5e', '#fb7185', '#e11d48', '#fda4af', '#00e5ff'];
      ctx.fillStyle = colors[i % colors.length];
      ctx.shadowColor = 'rgba(244, 63, 94, 0.8)';
      ctx.shadowBlur = 8;

      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }, [captchaCode, isOpen]);

  if (!isOpen || !user) return null;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validate identifier
    const trimmedInput = identifierInput.trim();
    if (!trimmedInput) {
      setError('Please enter your contact number or email address.');
      return;
    }

    const cleanInputDigits = trimmedInput.replace(/\D/g, '');
    const cleanUserPhone = (user.phoneNumber || user.contactNumber || '').replace(/\D/g, '');
    const isPhoneMatch = cleanInputDigits.length >= 7 && cleanUserPhone && (cleanInputDigits === cleanUserPhone || cleanUserPhone.endsWith(cleanInputDigits) || cleanInputDigits.endsWith(cleanUserPhone));
    const isEmailMatch = user.email && trimmedInput.toLowerCase() === user.email.toLowerCase();
    const isUsernameMatch = user.username && trimmedInput.toLowerCase() === user.username.toLowerCase();

    if (!isPhoneMatch && !isEmailMatch && !isUsernameMatch) {
      setError('Contact Number or Email does not match your registered user account.');
      return;
    }

    // 2. Validate password or PIN
    if (!passcodeInput.trim()) {
      setError('Please enter your account password or 6-digit security PIN.');
      return;
    }

    // 3. Validate CAPTCHA
    if (!captchaInput.trim()) {
      setError('Please enter the CAPTCHA code shown in the box.');
      return;
    }
    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setError('CAPTCHA verification failed. Please check the characters and try again.');
      generateCaptcha();
      return;
    }

    try {
      setLoading(true);
      // Pass both password or pin option
      const isPin = /^\d{6}$/.test(passcodeInput.trim());
      await deleteAccount({
        email: isEmailMatch ? trimmedInput : user.email,
        phoneNumber: isPhoneMatch ? trimmedInput : user.phoneNumber,
        contactNumber: isPhoneMatch ? trimmedInput : user.contactNumber,
        password: !isPin ? passcodeInput.trim() : undefined,
        pin: isPin ? passcodeInput.trim() : passcodeInput.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user account. Check your credentials.');
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0c0d12] border border-rose-500/30 rounded-2xl shadow-[0_0_40px_rgba(244,63,94,0.2)] overflow-hidden font-sans">
        {/* Top Header Bar */}
        <div className="p-4 bg-gradient-to-r from-rose-950/40 via-black to-rose-950/20 border-b border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-rose-500">
            <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono tracking-wider">DELETE ACCOUNT</h3>
              <p className="text-[10px] text-rose-400/80 font-mono">PERMANENT DATABASE DELETION</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-4 space-y-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-3 text-xs text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-300">DANGER ZONE: Irreversible Operation</p>
              <p className="text-[11px] text-rose-200/80">
                This will permanently delete your account (<span className="font-mono text-white">{user.phoneNumber || user.contactNumber || user.email}</span>), profile details, encrypted message transmissions, moments, and media rooms from the database.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-start space-x-2 font-mono">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleDelete} className="space-y-3 font-mono text-xs">
            {/* 1. Identifier Verification Input */}
            <div>
              <label className="block text-[11px] text-white/70 mb-1 flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-rose-400" />
                <span>CONFIRM CONTACT NUMBER OR EMAIL</span>
              </label>
              <input
                type="text"
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                placeholder={user.phoneNumber || user.contactNumber || user.email}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-rose-500 text-xs font-mono"
                required
              />
            </div>

            {/* 2. Password or Security PIN Input */}
            <div>
              <label className="block text-[11px] text-white/70 mb-1 flex items-center space-x-1">
                <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                <span>ENTER PASSWORD OR SECURITY PIN</span>
              </label>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Enter password or 6-digit PIN"
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-rose-500 text-xs"
                required
              />
            </div>

            {/* 3. CAPTCHA Box & Refresh */}
            <div>
              <label className="block text-[11px] text-white/70 mb-1 flex items-center justify-between">
                <span>SECURITY CAPTCHA VERIFICATION</span>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>REFRESH CAPTCHA</span>
                </button>
              </label>

              <div className="flex items-center space-x-3 mb-2">
                <div className="relative border border-rose-500/40 rounded-xl overflow-hidden shrink-0 shadow-inner">
                  <canvas ref={canvasRef} width={130} height={40} className="block bg-black" />
                </div>
                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                  placeholder="TYPE CAPTCHA"
                  maxLength={5}
                  className="flex-1 px-3 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white tracking-widest text-sm text-center font-bold uppercase focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl font-semibold text-xs border border-white/10 transition-all"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-2.5 px-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-[0_4px_20px_rgba(225,29,72,0.4)] flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{loading ? 'DELETING DATA...' : 'PERMANENTLY DELETE ACCOUNT'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
