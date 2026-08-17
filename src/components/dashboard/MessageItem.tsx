import React, { useState, useEffect } from 'react';
import { Message } from '../../types.js';
import { useAuth } from '../../context/AuthContext.tsx';
import { AudioPlayer } from './AudioPlayer.tsx';
import {
  Lock,
  Unlock,
  Check,
  CheckCheck,
  Trash2,
  Edit2,
  Reply,
  Copy,
  KeyRound,
  Smile,
  MapPin,
  FileText,
  Download,
  Timer,
  ExternalLink,
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  onOpenDecryptModal: (message: Message) => void;
  onDeleteMessage: (messageId: string) => void;
  onEditMessage: (message: Message) => void;
  onReplyMessage: (message: Message) => void;
  onReactMessage?: (messageId: string, emoji: string) => void;
  decryptedTextCache?: string; // If decrypted in session
}

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onOpenDecryptModal,
  onDeleteMessage,
  onEditMessage,
  onReplyMessage,
  onReactMessage,
  decryptedTextCache,
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [mediaModal, setMediaModal] = useState<string | null>(null);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(null);

  if (!user) return null;

  const isSender = message.senderID === user.id;

  // Real-time ticking countdown for disappearing messages
  useEffect(() => {
    if (!message.expiresAt) {
      setTimeLeftSec(null);
      return;
    }

    const calcTimeLeft = () => {
      const expireMs = typeof message.expiresAt === 'number' ? message.expiresAt : new Date(message.expiresAt!).getTime();
      const diff = Math.max(0, Math.floor((expireMs - Date.now()) / 1000));
      setTimeLeftSec(diff);
    };

    calcTimeLeft();
    const interval = setInterval(calcTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [message.expiresAt]);

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayText = decryptedTextCache || message.text;
  const isDecryptedInSession = Boolean(decryptedTextCache);

  // Group reactions by emoji
  const reactionGroupMap: Record<string, { count: number; userIds: string[]; userReacted: boolean }> = {};
  if (message.reactions) {
    Object.entries(message.reactions as Record<string, string>).forEach(([uId, emoji]) => {
      const emojiStr = String(emoji);
      if (!reactionGroupMap[emojiStr]) {
        reactionGroupMap[emojiStr] = { count: 0, userIds: [], userReacted: false };
      }
      reactionGroupMap[emojiStr].count += 1;
      reactionGroupMap[emojiStr].userIds.push(uId);
      if (uId === user.id) {
        reactionGroupMap[emojiStr].userReacted = true;
      }
    });
  }
  const groupedReactions = Object.entries(reactionGroupMap);

  const formatTimer = (secs: number) => {
    if (secs >= 3600) {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      return `${h}h ${m}m`;
    }
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`flex flex-col my-1.5 ${isSender ? 'items-end' : 'items-start'}`}>
      {/* Disappearing Timer Badge */}
      {timeLeftSec !== null && (
        <div className="flex items-center space-x-1 px-2 py-0.5 mb-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-[10px] font-mono text-amber-300 font-semibold animate-pulse">
          <Timer className="w-3 h-3 text-amber-400" />
          <span>Disappearing in {formatTimer(timeLeftSec)}</span>
        </div>
      )}

      <div className="group relative max-w-[85%] sm:max-w-[70%]">
        {/* Reply reference preview */}
        {message.replyTo && (
          <div className="mb-1 p-2 bg-slate-900/80 border-l-2 border-emerald-400 rounded text-xs text-slate-300">
            <span className="font-bold text-emerald-400 block">{message.replyTo.senderName}</span>
            <span className="truncate block text-[#00e5ff] font-mono">{message.replyTo.text}</span>
          </div>
        )}

        {/* Message Bubble Card */}
        <div
          className={`p-3.5 rounded-2xl shadow-lg text-xs sm:text-sm leading-relaxed relative font-sans ${
            message.deleted
              ? 'bg-white/[0.02] border border-white/10 text-white/30 italic'
              : message.encrypted && !isDecryptedInSession
              ? 'bg-white/[0.03] border border-[#00e5ff]/30 text-white backdrop-blur-md shadow-[0_4px_20px_rgba(0,229,255,0.05)]'
              : isSender
              ? 'bg-[#00e5ff] text-black font-medium rounded-br-none shadow-[0_4px_20px_rgba(0,229,255,0.15)]'
              : 'bg-white/[0.06] border border-white/10 text-white rounded-bl-none'
          }`}
        >
          {/* Deleted state */}
          {message.deleted ? (
            <div className="flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-white/30" />
              <span>This transmission was deleted</span>
            </div>
          ) : message.encrypted && !isDecryptedInSession ? (
            /* Caesar Cipher ENCRYPTED State Card */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between space-x-2 border-b border-white/10 pb-2">
                <div className="flex items-center space-x-1.5 text-[#00e5ff] font-mono font-medium text-xs">
                  <Lock className="w-4 h-4 animate-pulse" />
                  <span>ENCRYPTED_PAYLOAD</span>
                </div>
                <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded-md text-[10px] font-mono text-[#00e5ff] font-medium">
                  SHIFT +{message.shiftValue || 5}
                </span>
              </div>

              {/* Scrambled Cipher Text */}
              <div className="p-2.5 bg-[#0b0c10] border border-white/10 rounded-xl font-mono text-cyan-200 tracking-wider break-all text-xs font-semibold">
                {message.text}
              </div>

              {/* Decrypt Button */}
              <button
                onClick={() => onOpenDecryptModal(message)}
                className="w-full py-2.5 px-3 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-mono font-medium rounded-xl shadow-[0_4px_16px_rgba(0,229,255,0.2)] flex items-center justify-center space-x-2 transition-all text-xs"
              >
                <KeyRound className="w-4 h-4" />
                <span>DECRYPT_WITH_PASSKEY</span>
              </button>
            </div>
          ) : (
            /* Standard or Decrypted Plaintext State */
            <div className="space-y-2">
              {/* If was encrypted and now decrypted */}
              {message.encrypted && isDecryptedInSession && (
                <div className="flex items-center space-x-1.5 px-2 py-1 bg-cyan-500/15 border border-cyan-500/30 rounded-lg text-[#00e5ff] text-[11px] font-mono font-medium w-fit">
                  <Unlock className="w-3.5 h-3.5" />
                  <span>DECRYPTED_PLAINTEXT (+{message.shiftValue})</span>
                </div>
              )}

              {/* 🎙️ Voice Message Audio Player */}
              {message.messageType === 'audio' && message.audioURL && (
                <AudioPlayer audioURL={message.audioURL} duration={message.audioDuration} isSender={isSender} />
              )}

              {/* 📍 Live Location Sharing Card */}
              {message.messageType === 'location' && message.locationData && (() => {
                const locLat = message.locationData.latitude ?? message.locationData.lat ?? 0;
                const locLng = message.locationData.longitude ?? message.locationData.lng ?? 0;
                return (
                  <div className="p-3 bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-xs space-y-2 text-white">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                      <MapPin className="w-4 h-4 animate-bounce" />
                      <span>Live GPS Location</span>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-950 h-32 relative flex items-center justify-center">
                      <iframe
                        title="GPS Map"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${locLng - 0.005}%2C${locLat - 0.005}%2C${locLng + 0.005}%2C${locLat + 0.005}&layer=mapnik&marker=${locLat}%2C${locLng}`}
                        className="pointer-events-none opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    </div>

                    <div className="text-[11px] font-mono text-slate-300 truncate">
                      {message.locationData.address || `${locLat.toFixed(4)}, ${locLng.toFixed(4)}`}
                    </div>

                    <a
                      href={`https://maps.google.com/?q=${locLat},${locLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-1 py-1.5 px-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition-colors shadow-md"
                    >
                      <span>View in Google Maps</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })()}

              {/* 📁 File Attachment Card */}
              {message.messageType === 'file' && message.fileData && (
                <div className="p-3 bg-slate-900/90 border border-cyan-500/30 rounded-2xl flex items-center justify-between space-x-3 max-w-xs text-white">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-2.5 bg-cyan-500/20 text-[#00e5ff] rounded-xl shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate text-white">{message.fileData.fileName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {message.fileData.fileSize ? `${(message.fileData.fileSize / 1024).toFixed(1)} KB` : 'File attachment'}
                      </div>
                    </div>
                  </div>

                  <a
                    href={message.fileData.fileURL}
                    download={message.fileData.fileName}
                    className="p-2 bg-[#00e5ff] text-slate-950 rounded-xl hover:bg-[#00e5ff]/90 transition-all shrink-0"
                    title="Download File"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                  </a>
                </div>
              )}

              {/* Image or Video attachments */}
              {message.mediaURL && message.messageType !== 'audio' && (
                <div className="rounded-xl overflow-hidden mb-2 max-w-xs border border-white/10 bg-black/40">
                  {message.messageType === 'video' ? (
                    <video
                      src={message.mediaURL}
                      controls
                      className="max-h-60 w-full object-cover"
                    />
                  ) : (
                    <img
                      src={message.mediaURL}
                      alt="Attachment"
                      onClick={() => setMediaModal(message.mediaURL!)}
                      className="max-h-60 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  )}
                </div>
              )}

              {/* Text content if present */}
              {displayText && <p className="break-words whitespace-pre-wrap leading-relaxed">{displayText}</p>}
            </div>
          )}

          {/* Bottom Timestamp & Read Receipts */}
          <div className="flex items-center justify-end space-x-1 mt-1.5 text-[10px] opacity-75">
            {message.edited && <span className="italic mr-1">(edited)</span>}
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {/* Checkmark receipts for sender */}
            {isSender && !message.deleted && (
              <span className="ml-1">
                {message.status === 'read' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-300 inline" />
                ) : message.status === 'delivered' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-slate-300 inline" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-slate-300 inline" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Display Emoji Reaction Badges below message bubble */}
        {groupedReactions.length > 0 && !message.deleted && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isSender ? 'justify-end' : 'justify-start'}`}>
            {groupedReactions.map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => onReactMessage && onReactMessage(message.id, emoji)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                  data.userReacted
                    ? 'bg-[#00e5ff]/20 border border-[#00e5ff] text-[#00e5ff] font-semibold shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                    : 'bg-slate-900/90 border border-white/10 text-white/80 hover:bg-slate-800'
                }`}
                title={`Reacted by ${data.userIds.length} user(s)`}
              >
                <span>{emoji}</span>
                <span className="text-[10px] font-mono">{data.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hover Action Menu Bar */}
        {!message.deleted && (
          <div
            className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 p-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20 ${
              isSender ? 'right-2' : 'left-2'
            }`}
          >
            {/* Quick reaction popover trigger */}
            <div className="relative">
              <button
                onClick={() => setShowQuickReactions(!showQuickReactions)}
                className="p-1 text-slate-400 hover:text-[#00e5ff] hover:bg-slate-800 rounded transition-colors"
                title="Add reaction"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {/* Quick Emojis Drawer */}
              {showQuickReactions && (
                <div className="absolute bottom-full mb-1 left-0 flex items-center space-x-1 p-1.5 bg-[#0f1116] border border-white/20 rounded-xl shadow-2xl z-30">
                  {QUICK_REACTION_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        onReactMessage && onReactMessage(message.id, e);
                        setShowQuickReactions(false);
                      }}
                      className="hover:scale-125 transition-transform text-base p-1"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => handleCopy(displayText)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Copy text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onReplyMessage(message)}
              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
            {isSender && !message.encrypted && (
              <button
                onClick={() => onEditMessage(message)}
                className="p-1 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                title="Edit message"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {isSender && (
              <button
                onClick={() => onDeleteMessage(message.id)}
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                title="Delete message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal for Media Preview */}
      {mediaModal && (
        <div
          onClick={() => setMediaModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <img src={mediaModal} alt="Full Preview" className="max-w-full max-h-[90vh] rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
};
