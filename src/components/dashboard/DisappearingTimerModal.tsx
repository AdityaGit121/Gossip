import React from 'react';
import { Timer, X, Check, ShieldAlert } from 'lucide-react';
import { useChat } from '../../context/ChatContext.tsx';

interface DisappearingTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIMER_OPTIONS = [
  { label: 'Off', seconds: 0, desc: 'Messages stay indefinitely' },
  { label: '10 Seconds', seconds: 10, desc: 'Self-destructs 10s after sending' },
  { label: '1 Minute', seconds: 60, desc: 'Self-destructs 1m after sending' },
  { label: '1 Hour', seconds: 3600, desc: 'Self-destructs 1h after sending' },
  { label: '24 Hours', seconds: 86400, desc: 'Self-destructs 24h after sending' },
];

export const DisappearingTimerModal: React.FC<DisappearingTimerModalProps> = ({ isOpen, onClose }) => {
  const { activeChat, setDisappearingTimer } = useChat();

  if (!isOpen || !activeChat) return null;

  const currentSeconds = activeChat.disappearingTimer || 0;

  const handleSelectTimer = async (seconds: number) => {
    await setDisappearingTimer(seconds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-sm bg-[#0f1116] border border-white/15 rounded-2xl p-6 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Disappearing Messages</h3>
            <p className="text-xs text-slate-400">Auto-delete messages in real-time</p>
          </div>
        </div>

        <div className="flex items-start space-x-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4 text-[11px] text-amber-200">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>New messages sent in this chat will self-destruct for everyone when the timer expires.</span>
        </div>

        <div className="space-y-2">
          {TIMER_OPTIONS.map((opt) => {
            const isSelected = currentSeconds === opt.seconds;
            return (
              <button
                key={opt.seconds}
                onClick={() => handleSelectTimer(opt.seconds)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-[#00e5ff]/10 border-[#00e5ff] text-white shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                    : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white">{opt.label}</div>
                  <div className="text-[10px] text-slate-400">{opt.desc}</div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#00e5ff] stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
