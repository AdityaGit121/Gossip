import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Mic, Video, Folder, Bell, ShieldCheck, CheckCircle2, Lock, AlertCircle, Eye } from 'lucide-react';

interface RegistrationPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsGranted: (permissions: any) => void;
}

export const RegistrationPermissionsModal: React.FC<RegistrationPermissionsModalProps> = ({
  isOpen,
  onClose,
  onPermissionsGranted,
}) => {
  const [requesting, setRequesting] = useState(false);
  const [grantedState, setGrantedState] = useState({
    camera: true,
    microphone: true,
    video: true,
    files: true,
    notifications: true,
  });

  if (!isOpen) return null;

  const handleGrantAll = async () => {
    setRequesting(true);
    try {
      // Trigger actual browser media device permission prompt in 1 unified action
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          // Stop streams right away after permission granted
          stream.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn('Browser media permission prompt finished/skipped:', e);
        }
      }

      if ('Notification' in window && Notification.permission !== 'granted') {
        try {
          await Notification.requestPermission();
        } catch (e) {
          console.warn('Notification permission finished:', e);
        }
      }

      const finalPerms = {
        ...grantedState,
        foregroundOnly: true,
        grantedAt: new Date().toISOString(),
      };

      localStorage.setItem('gossip_granted_permissions', JSON.stringify(finalPerms));
      localStorage.setItem('convo_granted_permissions', JSON.stringify(finalPerms));
      onPermissionsGranted(finalPerms);
      onClose();
    } catch (err) {
      console.error('Permissions grant error:', err);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg p-6 overflow-hidden bg-[#0a0d14] border border-[#00e5ff]/40 rounded-2xl shadow-[0_0_50px_rgba(0,229,255,0.15)] text-white font-sans space-y-5"
        >
          {/* Header */}
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#00e5ff]/10 border border-[#00e5ff]/40 rounded-xl text-[#00e5ff]">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-white tracking-tight">INITIAL PERMISSION SETUP</h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono rounded">
                  REGISTRATION_TIME_ONLY
                </span>
              </div>
              <p className="text-xs font-mono text-white/50">UNIFIED_LIVE_ACCESS_AUTHORIZATION</p>
            </div>
          </div>

          {/* Strict Foreground Notice */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 text-xs">
            <div className="flex items-center space-x-2 text-amber-300 font-semibold font-mono">
              <Eye className="w-4 h-4 text-amber-400" />
              <span>LIVE FOREGROUND-ONLY GUARANTEE</span>
            </div>
            <p className="text-white/70 text-[11px] leading-relaxed">
              All permissions requested below operate <strong className="text-amber-200">strictly while using the application live in the active viewport</strong>.
              No background access, silent recording, or covert telemetry is ever conducted.
            </p>
          </div>

          {/* List of Permissions */}
          <div className="space-y-2.5 font-mono text-xs">
            <div className="p-2.5 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/15 text-[#00e5ff] rounded-lg">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">CAMERA ACCESS</div>
                  <div className="text-[10px] text-white/40">HD Video Calls & Moment Captures</div>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
                LIVE_ONLY
              </span>
            </div>

            <div className="p-2.5 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/15 text-[#00e5ff] rounded-lg">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">MICROPHONE & AUDIO</div>
                  <div className="text-[10px] text-white/40">Voice Notes, Encrypted Audio Calls & Media</div>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
                LIVE_ONLY
              </span>
            </div>

            <div className="p-2.5 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/15 text-[#00e5ff] rounded-lg">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">VIDEO STREAMING & SCREEN SHARE</div>
                  <div className="text-[10px] text-white/40">Private Watch Party Rooms & Screen Mirroring</div>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
                LIVE_ONLY
              </span>
            </div>

            <div className="p-2.5 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/15 text-[#00e5ff] rounded-lg">
                  <Folder className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">FILES & STORAGE ACCESS</div>
                  <div className="text-[10px] text-white/40">Encrypted Document, Image & Attachment Transfers</div>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
                LIVE_ONLY
              </span>
            </div>

            <div className="p-2.5 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/15 text-[#00e5ff] rounded-lg">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">LIVE FOREGROUND NOTIFICATIONS</div>
                  <div className="text-[10px] text-white/40">Instant Message Alerts & Incoming Calls</div>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
                LIVE_ONLY
              </span>
            </div>
          </div>

          {/* Submit Action */}
          <button
            onClick={handleGrantAll}
            disabled={requesting}
            className="w-full py-3.5 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-bold font-mono rounded-xl shadow-[0_4px_24px_rgba(0,229,255,0.3)] flex items-center justify-center space-x-2 transition-all disabled:opacity-50 text-xs tracking-wider"
          >
            {requesting ? (
              <span>AUTHORIZING_PERMISSIONS...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ALLOW ALL REQUIRED PERMISSIONS (LIVE ONLY)</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
