import React from 'react';
import { Lock, KeyRound, MessageSquare, ShieldCheck, Zap, Users, ArrowRight } from 'lucide-react';

interface WelcomeViewProps {
  onOpenLogin: () => void;
  onOpenSignup: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onOpenLogin, onOpenSignup }) => {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-white flex flex-col justify-between selection:bg-[#00e5ff] selection:text-black overflow-x-hidden relative font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00e5ff]/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Navbar */}
      <nav className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between relative z-10 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#00e5ff] rounded-xl text-black font-bold shadow-[0_0_20px_rgba(0,229,255,0.3)]">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-light tracking-tight text-white">
              Gossip
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 font-mono">
          <button
            onClick={onOpenLogin}
            className="px-5 py-2.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.04] border border-white/10 rounded-xl transition-all"
          >
            LOG_IN
          </button>
          <button
            onClick={onOpenSignup}
            className="px-5 py-2.5 text-xs font-semibold text-black bg-[#00e5ff] hover:bg-[#33ebff] rounded-xl shadow-[0_4px_16px_rgba(0,229,255,0.2)] transition-all flex items-center space-x-2"
          >
            <span>SIGN_UP</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Hero Content */}
      <main className="max-w-4xl w-full mx-auto px-6 py-16 flex flex-col items-center justify-center text-center relative z-10 my-auto">
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-white leading-tight">
          Gossip - <span className="text-[#00e5ff] font-normal">Hold your Secrets</span>
        </h1>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 font-mono">
          <button
            onClick={onOpenSignup}
            className="w-full sm:w-auto px-8 py-4 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold rounded-2xl shadow-[0_4px_20px_rgba(0,229,255,0.25)] flex items-center justify-center space-x-3 transition-all text-sm"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Start</span>
          </button>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="max-w-6xl w-full mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
          <div className="p-3 bg-cyan-500/10 rounded-xl text-[#00e5ff] w-fit">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-light text-white">Manual Caesar Cipher</h3>
          <p className="text-white/50 text-xs leading-relaxed font-sans">
            Standard encryption supporting Uppercase, Lowercase, Digits, and Passkey hashing using custom pure TypeScript algorithm.
          </p>
        </div>

        <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
          <div className="p-3 bg-cyan-500/10 rounded-xl text-[#00e5ff] w-fit">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-light text-white">Real-Time Socket.IO</h3>
          <p className="text-white/50 text-xs leading-relaxed font-sans">
            Instant messaging, typing status, online indicators, read receipts, and message updates synchronized across users seamlessly.
          </p>
        </div>

        <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
          <div className="p-3 bg-cyan-500/10 rounded-xl text-[#00e5ff] w-fit">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-light text-white">Unique User IDs</h3>
          <p className="text-white/50 text-xs leading-relaxed font-sans">
            Connect using unique IDs like `USR-10293`. Search, pin chats, upload images/videos, and customize user profiles easily.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-white/10 text-center text-xs font-mono text-white/40 relative z-10">
        Gossip &copy; 2026 &bull; Liquid Intelligence Security Engine
      </footer>
    </div>
  );
};
