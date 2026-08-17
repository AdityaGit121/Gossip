import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useChat } from '../../context/ChatContext.tsx';
import { Message } from '../../types.js';
import { MessageItem } from './MessageItem.tsx';
import { DecryptModal } from './DecryptModal.tsx';
import { AudioRecorder } from './AudioRecorder.tsx';
import { CallOverlayModal } from './CallOverlayModal.tsx';
import { DisappearingTimerModal } from './DisappearingTimerModal.tsx';
import { E2EECertificateModal } from './E2EECertificateModal.tsx';
import { caesarCipherEncrypt } from '../../utils/caesarCipher.js';
import {
  Send,
  Lock,
  Unlock,
  KeyRound,
  Paperclip,
  Smile,
  X,
  Search,
  Sliders,
  Sparkles,
  ShieldCheck,
  PhoneCall,
  Video,
  Info,
  ChevronDown,
  Mic,
  MapPin,
  FileText,
  Users,
  Timer,
  UploadCloud,
  ArrowLeft,
  MoreVertical,
  UserX,
  EyeOff,
  UserCheck,
  Clock,
  ShieldAlert
} from 'lucide-react';

interface ChatAreaProps {
  onOpenSecuritySettings?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onOpenSecuritySettings }) => {
  const { user } = useAuth();
  const {
    activeChat,
    selectChat,
    messages,
    loadingMessages,
    typingUsers,
    sendMessage,
    emitTyping,
    deleteMessage,
    editMessage,
    reactToMessage,
    startCall,
    toggleLockChat,
    toggleHideChat,
    blockUser,
    unblockUser,
    blockedUserIDs,
    acceptChatRequest,
    declineChatRequest,
  } = useChat();

  const [inputMessage, setInputMessage] = useState('');
  const [encryptEnabled, setEncryptEnabled] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [shiftValue, setShiftValue] = useState(5);
  const [showEncryptPanel, setShowEncryptPanel] = useState(false);

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const [decryptModalMsg, setDecryptModalMsg] = useState<Message | null>(null);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});

  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inChatSearch, setInChatSearch] = useState('');
  const [showInChatSearch, setShowInChatSearch] = useState(false);

  // Security modals and menus
  const [showCertModal, setShowCertModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Real-time feature states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const isGroup = Boolean(activeChat?.isGroup);
  const participantsList = Array.isArray(activeChat?.participants) ? activeChat.participants : [];
  const otherUser = isGroup ? null : participantsList.find((p) => p && p.id !== user.id) || null;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers, decryptedCache]);

  if (!activeChat || (!isGroup && !otherUser)) {
    return (
      <main className="hidden md:flex flex-1 w-full bg-[#0b0c10] flex-col items-center justify-center p-8 text-center select-none relative overflow-hidden">
        {/* Ambient Liquid Orbs */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute -bottom-60 -left-60 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[180px] pointer-events-none" />

        <div className="max-w-xl space-y-8 relative z-10 flex flex-col items-center">
          {/* Hero Visual Icon */}
          <div className="w-28 h-28 rounded-3xl bg-white/[0.02] border border-white/10 flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative group">
            <div className="absolute -inset-0.5 rounded-[26px] bg-gradient-to-tr from-[#00e5ff] via-transparent to-[#00e5ff] opacity-20 group-hover:opacity-40 transition-opacity -z-10" />
            <Lock className="w-10 h-10 text-[#00e5ff] animate-pulse" />
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-mono tracking-[0.25em] text-[#00e5ff] uppercase block">
              SECURE NODE v2.04
            </span>
            <h1 className="text-4xl sm:text-5xl font-light text-white tracking-tight">
              Welcome to Convo
            </h1>
            <p className="text-white/50 text-sm max-w-md leading-relaxed mx-auto font-sans">
              Select a conversation from the left sidebar or start a new chat using a unique User ID (e.g. <span className="text-[#00e5ff] font-mono">USR-10293</span>).
            </p>
          </div>
        </div>
      </main>
    );
  }

  const isBlocked = otherUser ? (blockedUserIDs || []).includes(otherUser.id) : false;
  const isChatLocked = (activeChat.lockedBy || []).includes(user.id);
  const isPendingRequest = activeChat.requestStatus === 'pending';
  const isRequestRecipient = activeChat.requestedBy !== user.id;

  // Handle Typing indicator socket emission
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);

    emitTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1500);
  };

  // Voice Audio Send Handler
  const handleSendAudio = async (audioDataUrl: string, durationSec: number) => {
    setIsRecordingAudio(false);
    await sendMessage({
      text: '🎙️ Voice note',
      audioURL: audioDataUrl,
      audioDuration: durationSec,
      messageType: 'audio',
    });
  };

  // Document/File Upload Handler with Progress Bar
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (!prev || prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 150);

    const reader = new FileReader();
    reader.onload = async () => {
      setUploadProgress(100);
      setTimeout(async () => {
        setUploadProgress(null);
        await sendMessage({
          text: `📁 Attachment: ${file.name}`,
          messageType: 'file',
          fileData: {
            fileURL: reader.result as string,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          },
        });
      }, 300);
    };
    reader.readAsDataURL(file);
  };

  // Live Location Share Handler
  const handleShareLocation = () => {
    setShowAttachMenu(false);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await sendMessage({
          text: `📍 Shared Live GPS Location`,
          messageType: 'location',
          locationData: {
            latitude,
            longitude,
            address: `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`,
          },
        });
      },
      (err) => {
        console.error('Geolocation error:', err);
        sendMessage({
          text: `📍 Shared GPS Location (Pinned)`,
          messageType: 'location',
          locationData: {
            latitude: 37.7749,
            longitude: -122.4194,
            address: 'San Francisco, CA (Pinned Location)',
          },
        });
      },
      { timeout: 5000 }
    );
  };

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const isVideo = file.type.startsWith('video/');

    reader.onload = () => {
      setMediaPreview({
        url: reader.result as string,
        type: isVideo ? 'video' : 'image',
      });
    };
    reader.readAsDataURL(file);
  };

  // Submit Send Message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && !mediaPreview) return;

    if (editingMessage) {
      await editMessage(editingMessage.id, inputMessage.trim());
      setEditingMessage(null);
      setInputMessage('');
      return;
    }

    let msgText = inputMessage.trim();
    let isEncrypted = false;

    if (encryptEnabled && msgText) {
      msgText = caesarCipherEncrypt(msgText, shiftValue);
      isEncrypted = true;
    }

    await sendMessage({
      text: msgText || (mediaPreview?.type === 'video' ? '🎥 Video transmission' : '📷 Image transmission'),
      encrypted: isEncrypted,
      passkey: passkey || undefined,
      shiftValue: encryptEnabled ? shiftValue : undefined,
      mediaURL: mediaPreview?.url,
      messageType: mediaPreview ? mediaPreview.type : 'text',
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderID === user.id ? 'You' : otherUser.name } : undefined,
    });

    setInputMessage('');
    setMediaPreview(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);
    emitTyping(false);
  };

  const handleDecryptedSuccess = (messageId: string, decryptedText: string) => {
    setDecryptedCache((prev) => ({
      ...prev,
      [messageId]: decryptedText,
    }));
  };

  // Live Caesar cipher output calculation for preview
  const liveEncryptedPreview =
    encryptEnabled && inputMessage.trim()
      ? caesarCipherEncrypt(inputMessage.trim(), shiftValue)
      : '';

  const isOtherUserTyping = Boolean(typingUsers[otherUser.id]);

  // Filter messages for search
  const displayedMessages = inChatSearch.trim()
    ? messages.filter((m) => m.text.toLowerCase().includes(inChatSearch.toLowerCase()))
    : messages;

  const quickEmojis = ['😀', '🔒', '🔑', '❤️', '👍', '🔥', '🎉', '⚡'];

  return (
    <div className="flex-1 w-full bg-[#0b0c10] flex flex-col h-full overflow-hidden relative">
      {/* Real-time Call, Disappearing Timer, and E2EE Certificate Modals */}
      <CallOverlayModal />
      <DisappearingTimerModal isOpen={showTimerModal} onClose={() => setShowTimerModal(false)} />
      <E2EECertificateModal
        isOpen={showCertModal}
        onClose={() => setShowCertModal(false)}
        otherUser={otherUser}
        chatId={activeChat.id}
      />

      {/* Top Chat Header */}
      <div className="p-2.5 sm:p-3.5 bg-[#0f1116]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between shrink-0 z-20 gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          {/* Back Button for Mobile View */}
          <button
            onClick={() => selectChat(null)}
            className="md:hidden p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all shrink-0"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5 text-[#00e5ff]" />
          </button>

          <div className="relative shrink-0">
            {isGroup ? (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center text-[#00e5ff]">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            ) : (
              <img
                src={
                  otherUser?.profilePicture ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.username || 'contact'}`
                }
                alt={otherUser?.name || 'Contact'}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl object-cover bg-white/[0.03] border border-white/10"
              />
            )}
            {otherUser?.online ? (
              <span className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 bg-emerald-500 border-2 border-[#0b0c10] rounded-full" />
            ) : (
              <span className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 bg-slate-600 border-2 border-[#0b0c10] rounded-full" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight truncate max-w-[100px] sm:max-w-[180px]">
                {isGroup ? (activeChat.groupName || 'Group Chat') : (otherUser?.name || 'Contact')}
              </h3>
              <span className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-[#00e5ff] font-mono text-[9px] sm:text-[10px] font-medium rounded-md shrink-0">
                {isGroup ? `${participantsList.length} Members` : (otherUser?.userID || 'OPERATIVE')}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-white/40 font-mono flex items-center space-x-1.5 truncate">
              {isOtherUserTyping ? (
                <span className="text-[#00e5ff] font-medium animate-pulse">TRANSMITTING...</span>
              ) : isGroup ? (
                <span className="text-emerald-400">ENCRYPTED GROUP</span>
              ) : otherUser?.online ? (
                <span className="text-emerald-400">ONLINE</span>
              ) : (
                <span className="truncate">
                  LAST_SEEN {otherUser?.lastSeen ? new Date(otherUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'RECENTLY'}
                </span>
              )}

              {/* Active Disappearing Timer Indicator in Header */}
              {Boolean(activeChat.disappearingTimer) && (
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[9px] font-mono font-semibold shrink-0">
                  <Timer className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">{activeChat.disappearingTimer}s Timer</span>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Header Actions: Calls, E2EE Badge, Options Menu */}
        <div className="flex items-center space-x-0.5 sm:space-x-1 text-white/60 shrink-0">
          <button
            onClick={() => setShowCertModal(true)}
            className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 rounded-xl transition-all text-xs font-mono"
            title="Inspect End-to-End Encryption Certificate"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>E2EE ACTIVE</span>
          </button>

          <button
            onClick={() => startCall(false)}
            className="p-1.5 sm:p-2 hover:text-[#00e5ff] hover:bg-white/[0.06] rounded-xl transition-all"
            title="Start Military Grade Audio Call"
          >
            <PhoneCall className="w-4 h-4" />
          </button>
          <button
            onClick={() => startCall(true)}
            className="p-1.5 sm:p-2 hover:text-emerald-400 hover:bg-white/[0.06] rounded-xl transition-all"
            title="Start Military Grade Video Call"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowTimerModal(true)}
            className={`p-1.5 sm:p-2 rounded-xl transition-all ${
              activeChat.disappearingTimer
                ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                : 'hover:text-amber-400 hover:bg-white/[0.06]'
            }`}
            title="Disappearing Messages Timer"
          >
            <Timer className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowInChatSearch(!showInChatSearch)}
            className="p-1.5 sm:p-2 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all"
            title="Search in Chat"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Options Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-2 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all"
              title="Chat Options & Security"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showOptionsMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0f1116] border border-white/10 rounded-xl shadow-2xl p-1 z-50 text-xs font-mono text-white space-y-0.5">
                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    setShowCertModal(true);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-white/[0.06] rounded-lg flex items-center space-x-2 text-emerald-300"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>VIEW E2EE CERTIFICATE</span>
                </button>

                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    toggleLockChat(activeChat.id);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-white/[0.06] rounded-lg flex items-center space-x-2 text-[#00e5ff]"
                >
                  <Lock className="w-4 h-4 text-[#00e5ff]" />
                  <span>{isChatLocked ? 'UNLOCK CHAT' : 'LOCK CHAT (PIN / FACE)'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    toggleHideChat(activeChat.id);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-white/[0.06] rounded-lg flex items-center space-x-2 text-amber-300"
                >
                  <EyeOff className="w-4 h-4 text-amber-400" />
                  <span>HIDE CHAT FROM LIST</span>
                </button>

                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    if (isBlocked) unblockUser(otherUser.id);
                    else blockUser(otherUser.id);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-white/[0.06] rounded-lg flex items-center space-x-2 ${
                    isBlocked ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  <UserX className="w-4 h-4" />
                  <span>{isBlocked ? 'UNBLOCK CONTACT' : 'BLOCK CONTACT'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-Chat Search Bar Overlay */}
      {showInChatSearch && (
        <div className="px-4 py-2 bg-[#0f1116] border-b border-white/10 flex items-center space-x-2 z-10">
          <Search className="w-4 h-4 text-[#00e5ff]" />
          <input
            type="text"
            value={inChatSearch}
            onChange={(e) => setInChatSearch(e.target.value)}
            placeholder="Search messages in this channel..."
            className="flex-1 bg-transparent text-xs text-white placeholder-white/40 outline-none font-mono"
          />
          <button onClick={() => setShowInChatSearch(false)} className="p-1 text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Blocked User Banner */}
      {isBlocked && (
        <div className="p-3 bg-rose-500/20 border-b border-rose-500/30 text-rose-300 text-xs font-mono flex items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>YOU HAVE BLOCKED THIS CONTACT. TRANSMISSIONS ARE RESTRICTED.</span>
          </div>
          <button
            onClick={() => unblockUser(otherUser.id)}
            className="px-3 py-1 bg-rose-500/30 hover:bg-rose-500/50 text-white rounded-lg font-bold transition-all text-[11px]"
          >
            UNBLOCK
          </button>
        </div>
      )}

      {/* Chat Request Authorization Banner */}
      {isPendingRequest && isRequestRecipient && (
        <div className="p-4 bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-xs font-mono space-y-3 px-6 shadow-xl">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-300">INCOMING CHAT REQUEST:</span>{' '}
              <span className="text-white font-semibold">{otherUser.name} ({otherUser.userID})</span> wants to establish a direct messaging session with you.
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => acceptChatRequest(activeChat.id)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow"
            >
              <UserCheck className="w-4 h-4" />
              <span>ACCEPT CHAT REQUEST</span>
            </button>
            <button
              onClick={() => {
                declineChatRequest(activeChat.id);
                blockUser(otherUser.id);
              }}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl transition-all flex items-center space-x-1.5"
            >
              <UserX className="w-4 h-4" />
              <span>DECLINE & BLOCK</span>
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploadProgress !== null && (
        <div className="w-full bg-black/40 h-1.5">
          <div
            className="bg-[#00e5ff] h-full transition-all duration-300 shadow-[0_0_10px_#00e5ff]"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full text-xs font-mono text-white/40 space-x-2">
            <div className="w-4 h-4 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
            <span>LOADING_DECRYPTED_TRANSMISSIONS...</span>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 text-white/30 font-mono">
            <Lock className="w-8 h-8 text-[#00e5ff]/40" />
            <p className="text-xs">No transmissions yet in this secure session.</p>
          </div>
        ) : (
          displayedMessages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              decryptedTextCache={decryptedCache[msg.id]}
              onOpenDecryptModal={(m) => setDecryptModalMsg(m)}
              onDeleteMessage={(mId) => deleteMessage(mId)}
              onEditMessage={(m) => {
                setEditingMessage(m);
                setInputMessage(m.text);
              }}
              onReactMessage={(mId, emoji) => reactToMessage(mId, emoji)}
              onReplyMessage={(m) => setReplyingTo(m)}
            />
          ))
        )}

        {/* Typing indicator */}
        {isOtherUserTyping && (
          <div className="flex items-center space-x-2 text-xs text-[#00e5ff] font-mono animate-pulse">
            <div className="w-2 h-2 bg-[#00e5ff] rounded-full" />
            <span>{otherUser.name} is typing a message...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Caesar Encryption Control Drawer */}
      {showEncryptPanel && (
        <div className="p-3 bg-[#0d0f15] border-t border-[#00e5ff]/30 space-y-2 font-mono text-xs text-white">
          <div className="flex items-center justify-between">
            <span className="text-[#00e5ff] font-semibold flex items-center space-x-1.5">
              <Sliders className="w-4 h-4" />
              <span>CAESAR CIPHER PARAMETERS</span>
            </span>
            <button
              onClick={() => setShowEncryptPanel(false)}
              className="p-1 text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-white/50 mb-1">Passkey (Optional)</label>
              <div className="relative">
                <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#00e5ff]" />
                <input
                  type="text"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="e.g. SECRET123"
                  className="w-full pl-8 pr-2 py-1.5 bg-black border border-white/10 rounded-lg text-xs font-mono text-white outline-none focus:border-[#00e5ff]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-white/50 mb-1">Caesar Shift ({shiftValue})</label>
              <input
                type="range"
                min={1}
                max={25}
                value={shiftValue}
                onChange={(e) => setShiftValue(Number(e.target.value))}
                className="w-full accent-[#00e5ff] cursor-pointer mt-2"
              />
            </div>
          </div>

          {liveEncryptedPreview && (
            <div className="p-2 bg-cyan-950/20 border border-cyan-500/20 rounded-lg text-[11px] text-cyan-200 truncate">
              Preview: <span className="text-[#00e5ff]">{liveEncryptedPreview}</span>
            </div>
          )}
        </div>
      )}

      {/* Replying or Editing Bar */}
      {(replyingTo || editingMessage) && (
        <div className="px-4 py-2 bg-[#12151e] border-t border-white/10 flex items-center justify-between font-mono text-xs text-white">
          <div className="truncate">
            <span className="text-[#00e5ff] font-bold">
              {editingMessage ? 'EDITING_MESSAGE: ' : 'REPLYING_TO: '}
            </span>
            <span className="text-white/70">
              {editingMessage ? editingMessage.text : replyingTo?.text}
            </span>
          </div>
          <button
            onClick={() => {
              setReplyingTo(null);
              setEditingMessage(null);
              setInputMessage('');
            }}
            className="p-1 text-white/40 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Media Preview Thumbnail before sending */}
      {mediaPreview && (
        <div className="p-3 bg-[#12151e] border-t border-white/10 flex items-center space-x-3">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#00e5ff]">
            {mediaPreview.type === 'image' ? (
              <img src={mediaPreview.url} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <video src={mediaPreview.url} className="w-full h-full object-cover" />
            )}
            <button
              onClick={() => setMediaPreview(null)}
              className="absolute top-1 right-1 p-0.5 bg-black/70 text-white rounded-full hover:bg-black"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <span className="text-xs font-mono text-white/60">Ready to transmit media</span>
        </div>
      )}

      {/* Attachments Drawer (Document, Location, Photo) */}
      {showAttachMenu && (
        <div className="p-3 bg-[#0d0f15] border-t border-white/10 grid grid-cols-3 gap-2 font-mono text-xs z-30">
          <button
            onClick={() => {
              setShowAttachMenu(false);
              fileInputRef.current?.click();
            }}
            className="p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-xl flex flex-col items-center space-y-1 text-white/80 hover:text-white transition-all"
          >
            <Paperclip className="w-5 h-5 text-[#00e5ff]" />
            <span className="text-[10px]">IMAGE / VIDEO</span>
          </button>

          <button
            onClick={() => {
              setShowAttachMenu(false);
              docInputRef.current?.click();
            }}
            className="p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-xl flex flex-col items-center space-y-1 text-white/80 hover:text-white transition-all"
          >
            <FileText className="w-5 h-5 text-purple-400" />
            <span className="text-[10px]">DOCUMENT</span>
          </button>

          <button
            onClick={handleShareLocation}
            className="p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-xl flex flex-col items-center space-y-1 text-white/80 hover:text-white transition-all"
          >
            <MapPin className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px]">GPS LOCATION</span>
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.zip,.png,.jpg"
        onChange={handleDocumentChange}
        className="hidden"
      />

      {/* Bottom Message Input Bar */}
      <div className="p-3.5 bg-[#0f1116] border-t border-white/10 shrink-0 z-10">
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          {/* Caesar Cipher Toggle */}
          <button
            type="button"
            onClick={() => {
              setEncryptEnabled(!encryptEnabled);
              setShowEncryptPanel(!encryptEnabled);
            }}
            className={`p-2.5 rounded-xl border transition-all ${
              encryptEnabled
                ? 'bg-[#00e5ff] text-black border-[#00e5ff] font-bold shadow-[0_0_12px_#00e5ff]'
                : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white'
            }`}
            title="Toggle Caesar Cipher Encryption"
          >
            {encryptEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>

          {/* Attachment button */}
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2.5 bg-white/[0.03] border border-white/10 hover:border-white/20 text-white/60 hover:text-white rounded-xl transition-all"
            title="Attach Document or Location"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Audio Voice Note Recorder */}
          {isRecordingAudio ? (
            <AudioRecorder onSendAudio={handleSendAudio} onCancel={() => setIsRecordingAudio(false)} />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsRecordingAudio(true)}
                className="p-2.5 bg-white/[0.03] border border-white/10 hover:border-[#00e5ff] text-white/60 hover:text-[#00e5ff] rounded-xl transition-all"
                title="Record Voice Note"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Main Input Field */}
              <div className="relative flex-1">
                <input
                  type="text"
                  disabled={isBlocked || (isPendingRequest && isRequestRecipient)}
                  value={inputMessage}
                  onChange={handleInputChange}
                  placeholder={
                    isBlocked
                      ? 'Contact is blocked...'
                      : isPendingRequest && isRequestRecipient
                      ? 'Accept chat request to enable typing...'
                      : encryptEnabled
                      ? 'Type message (will be Caesar encrypted)...'
                      : 'Transmit encrypted message...'
                  }
                  className="w-full pl-4 pr-10 py-2.5 bg-white/[0.03] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white placeholder-white/30 outline-none transition-all font-mono"
                />

                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* Emoji Bar Popup */}
                {showEmojiPicker && (
                  <div className="absolute bottom-12 right-0 bg-[#0d0f15] border border-white/10 rounded-xl p-2 flex space-x-1 shadow-2xl z-40">
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setInputMessage((prev) => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="p-1 hover:bg-white/10 rounded text-base"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isBlocked || (isPendingRequest && isRequestRecipient) || (!inputMessage.trim() && !mediaPreview)}
                className="p-2.5 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold rounded-xl shadow-[0_4px_16px_rgba(0,229,255,0.2)] transition-all disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </>
          )}
        </form>
      </div>

      {/* Decrypt Cipher Modal */}
      {decryptModalMsg && (
        <DecryptModal
          isOpen={Boolean(decryptModalMsg)}
          message={decryptModalMsg}
          onClose={() => setDecryptModalMsg(null)}
          onSuccessDecrypt={(mId, txt) => handleDecryptedSuccess(mId, txt)}
        />
      )}
    </div>
  );
};
