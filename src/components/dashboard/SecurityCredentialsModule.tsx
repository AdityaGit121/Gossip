import React from 'react';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface SecurityCredentialsModuleProps {
  onOpenSecuritySettings: () => void;
  className?: string;
}

export const SecurityCredentialsModule: React.FC<SecurityCredentialsModuleProps> = ({
  onOpenSecuritySettings,
  className = '',
}) => {
  const { user } = useAuth();
  if (!user) return null;

  const hasPin = Boolean(user.securityPin && user.securityPin !== '');

  return (
    <div
      className={`p-4 bg-[#08090d] border border-[#00e5ff]/30 rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.1)] space-y-3 font-sans transition-all relative overflow-hidden group ${className}`}
    >
      {/* Background Cyber Accent Glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00e5ff]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#00e5ff]/20 transition-all" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-[#00e5ff]/10 border border-[#00e5ff]/40 rounded-xl text-[#00e5ff]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white font-mono tracking-wide">
              SECURITY CREDENTIALS
            </h4>
            <p className="text-[10px] text-white/50 font-mono">
              6-digit security PIN and account authentication.
            </p>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 text-[10px] font-mono rounded-full border ${
            hasPin
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
          }`}
        >
          {hasPin ? 'PIN ACTIVE' : 'PIN NOT SET'}
        </span>
      </div>

      {/* Credential Indicators Grid */}
      <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
        {/* 1. PIN */}
        <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl flex items-center space-x-2">
          <KeyRound className={`w-4 h-4 ${hasPin ? 'text-[#00e5ff]' : 'text-white/30'}`} />
          <div className="min-w-0">
            <div className="text-white/80 font-bold truncate">6-DIGIT PIN</div>
            <div className={hasPin ? 'text-emerald-400 font-semibold' : 'text-amber-400/80'}>
              {hasPin ? 'CONFIGURED' : 'DEFAULT (123456)'}
            </div>
          </div>
        </div>

        {/* 2. Password */}
        <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl flex items-center space-x-2">
          <Lock className="w-4 h-4 text-[#00e5ff]" />
          <div className="min-w-0">
            <div className="text-white/80 font-bold truncate">PASSWORD</div>
            <div className="text-emerald-400 font-semibold">PROTECTED</div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={onOpenSecuritySettings}
        className="w-full py-2 px-3 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold text-xs font-mono rounded-xl shadow-[0_4px_15px_rgba(0,229,255,0.25)] flex items-center justify-center space-x-2 transition-all group-hover:scale-[1.01]"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>CHANGE SECURITY PIN & PASSWORD</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
