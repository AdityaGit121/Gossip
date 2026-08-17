import React, { useState } from 'react';
import {
  Search,
  MessageSquarePlus,
  QrCode,
  LogOut,
  Settings,
  Users,
  Pin,
  Lock,
  SlidersHorizontal,
  Tv,
  Camera,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  UserX,
  Clock,
  Trash2,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useChat } from '../../context/ChatContext.tsx';
import { SecurityUnlockModal } from './SecurityUnlockModal.tsx';
import { DeleteAccountModal } from './DeleteAccountModal.tsx';

interface SidebarProps {
  onOpenProfile: (tab?: 'profile' | 'security' | 'qrcode' | 'backup' | 'diagnostics') => void;
  onOpenNewChat: () => void;
  onOpenQRScanner: () => void;
  onOpenNewGroup: () => void;
  onOpenCipherPlayground: () => void;
  onOpenMoments: () => void;
  onOpenMediaRoom: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenProfile,
  onOpenNewChat,
  onOpenQRScanner,
  onOpenNewGroup,
  onOpenCipherPlayground,
  onOpenMoments,
  onOpenMediaRoom,
}) => {
  const { user, logout } = useAuth();
  const {
    chats,
    activeChat,
    selectChat,
    searchQuery,
    setSearchQuery,
    togglePinChat,
    deleteChat,
    unlockedChats,
    unlockChatWithSecurity,
    toggleHideChat,
  } = useChat();

  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'groups'>('all');
  const [showHiddenFolder, setShowHiddenFolder] = useState(false);
  const [unlockModalChatId, setUnlockModalChatId] = useState<string | null>(null);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  if (!user) return null;

  // Filter hidden vs non-hidden chats safely
  const userHiddenChats = (chats || []).filter((c) => (c?.hiddenBy || []).includes(user.id));
  const visibleChats = (chats || []).filter((c) => showHiddenFolder || !(c?.hiddenBy || []).includes(user.id));

  // Filter chats by search and tab
  const filteredChats = visibleChats.filter((chat) => {
    if (!chat) return false;
    const isGroup = !!chat.isGroup;
    const participantsList = Array.isArray(chat.participants) ? chat.participants : [];
    const otherUser = isGroup ? null : participantsList.find((p) => p && p.id !== user.id);
    const nameToSearch = isGroup ? (chat.groupName || 'Group Chat') : (otherUser?.name || '');
    const userIDToSearch = isGroup ? '' : otherUser?.userID || '';

    const otherPhone = (otherUser?.phoneNumber || otherUser?.contactNumber || '').replace(/\D/g, '');
    const searchDigits = searchQuery.replace(/\D/g, '');

    const matchesSearch =
      nameToSearch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userIDToSearch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (searchDigits.length >= 3 && otherPhone.includes(searchDigits));

    if (!matchesSearch) return false;

    if (filterTab === 'unread') {
      return ((chat.unreadCount || {})[user.id] || 0) > 0;
    }
    if (filterTab === 'groups') {
      return isGroup;
    }

    return true;
  });

  // Sort pinned chats to top safely
  filteredChats.sort((a, b) => {
    const aPinned = (a?.pinnedBy || []).includes(user.id) ? 1 : 0;
    const bPinned = (b?.pinnedBy || []).includes(user.id) ? 1 : 0;
    return bPinned - aPinned;
  });

  const handleChatClick = (chat: any) => {
    const isLocked = chat.lockedBy?.includes(user.id);
    const isUnlocked = unlockedChats.includes(chat.id);

    if (isLocked && !isUnlocked) {
      setUnlockModalChatId(chat.id);
    } else {
      selectChat(chat);
    }
  };

  return (
    <aside className="w-full md:w-80 h-full bg-[#0b0c10] border-r border-[#00e5ff]/20 flex flex-col shrink-0 font-sans select-none overflow-hidden">
      {/* User Header Profile Bar */}
      <div className="p-3 bg-transparent border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={
                user.profilePicture ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
              }
              alt={user.name}
              className="w-9 h-9 rounded-2xl object-cover bg-white/[0.03] border border-[#00e5ff]/40 p-0.5"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0b0c10] rounded-full" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-1">
              <h3 className="text-xs font-semibold text-white truncate max-w-[100px] sm:max-w-[120px]">{user.name}</h3>
              <ShieldCheck className="w-3.5 h-3.5 text-[#00e5ff] shrink-0" />
            </div>
            <button
              onClick={() => onOpenProfile()}
              className="text-[10px] font-mono text-[#00e5ff]/80 hover:text-[#00e5ff] flex items-center space-x-1 truncate"
              title="Click to view QR Code & Account"
            >
              <QrCode className="w-3 h-3 text-[#00e5ff] shrink-0" />
              <span className="truncate">View Profile</span>
            </button>
          </div>
        </div>

        {/* Action icons - scrollable/wrap gracefully without overlap */}
        <div className="flex items-center space-x-1 text-white/60 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <button
            onClick={onOpenMediaRoom}
            className="p-1.5 hover:text-[#00e5ff] hover:bg-white/[0.06] rounded-xl transition-all relative group shrink-0"
            title="Room - Private Media Sessions"
          >
            <Tv className="w-4 h-4 text-[#00e5ff]" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#00e5ff] rounded-full animate-pulse" />
          </button>
          <button
            onClick={onOpenMoments}
            className="p-1.5 hover:text-[#00e5ff] hover:bg-white/[0.06] rounded-xl transition-all relative group shrink-0"
            title="Moments (Status & Stories)"
          >
            <Camera className="w-4 h-4 text-purple-400" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-purple-400 rounded-full animate-ping" />
          </button>
          <button
            onClick={onOpenNewGroup}
            className="p-1.5 hover:text-[#00e5ff] hover:bg-white/[0.06] rounded-xl transition-all shrink-0"
            title="Create Multi-User Group"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenCipherPlayground}
            className="p-1.5 hover:text-[#00e5ff] hover:bg-white/[0.06] rounded-xl transition-all shrink-0"
            title="Caesar Cipher Playground"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenNewChat}
            className="p-1.5 hover:text-[#00e5ff] hover:bg-white/[0.06] rounded-xl transition-all shrink-0"
            title="New Chat by User ID or QR"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenQRScanner}
            className="p-1.5 hover:text-purple-400 hover:bg-white/[0.06] rounded-xl transition-all shrink-0 text-purple-300"
            title="Scan User QR Code"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenProfile()}
            className="p-1.5 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all shrink-0"
            title="Profile & QR Pass"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={logout}
            className="p-1.5 hover:text-amber-400 hover:bg-white/[0.06] rounded-xl transition-all shrink-0"
            title="Logout Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsDeleteAccountOpen(true)}
            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl transition-all shrink-0"
            title="Delete Account & Database Records"
          >
            <UserX className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3.5 bg-transparent border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, contact #, or User ID..."
            className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/10 focus:border-[#00e5ff]/50 rounded-xl text-xs text-white placeholder-white/30 outline-none transition-all font-sans"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 mt-2.5">
          <button
            onClick={() => setFilterTab('all')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium font-mono transition-all ${
              filterTab === 'all'
                ? 'bg-cyan-500/15 border border-cyan-500/40 text-[#00e5ff]'
                : 'text-white/40 hover:bg-white/[0.04]'
            }`}
          >
            All Chats
          </button>
          <button
            onClick={() => setFilterTab('unread')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium font-mono transition-all ${
              filterTab === 'unread'
                ? 'bg-cyan-500/15 border border-cyan-500/40 text-[#00e5ff]'
                : 'text-white/40 hover:bg-white/[0.04]'
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilterTab('groups')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium font-mono transition-all ${
              filterTab === 'groups'
                ? 'bg-cyan-500/15 border border-cyan-500/40 text-[#00e5ff]'
                : 'text-white/40 hover:bg-white/[0.04]'
            }`}
          >
            Groups
          </button>
        </div>

        {/* Hidden Chats Vault Toggle */}
        {userHiddenChats.length > 0 && (
          <button
            onClick={() => setShowHiddenFolder(!showHiddenFolder)}
            className="mt-2.5 w-full py-1.5 px-3 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 rounded-xl text-[11px] font-mono flex items-center justify-between transition-all"
          >
            <span className="flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>HIDDEN CHATS VAULT ({userHiddenChats.length})</span>
            </span>
            {showHiddenFolder ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 mx-auto bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-[#00e5ff]">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono tracking-widest text-cyan-400/60 uppercase block">
              NO TRANSMISSIONS
            </span>
            <p className="text-xs text-white/40">Start a new encrypted chat session</p>
             <div className="flex items-center justify-center space-x-2 mt-2">
               <button
                 onClick={onOpenNewChat}
                 className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-[#00e5ff] font-semibold rounded-xl text-xs transition-all font-mono"
               >
                 + NEW PERSON
               </button>
               <button
                 onClick={onOpenQRScanner}
                 className="px-3 py-2 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-300 font-semibold rounded-xl text-xs transition-all font-mono flex items-center space-x-1"
                 title="Scan User QR"
               >
                 <QrCode className="w-3.5 h-3.5" />
                 <span>SCAN QR</span>
               </button>
             </div>
          </div>
        ) : (
          filteredChats.map((chat) => {
            if (!chat) return null;
            const isGroup = !!chat.isGroup;
            const participantsList = Array.isArray(chat.participants) ? chat.participants : [];
            const otherUser = isGroup ? null : participantsList.find((p) => p && p.id !== user.id);
            if (!isGroup && !otherUser) return null;

            const isSelected = activeChat?.id === chat.id;
            const isPinned = (chat.pinnedBy || []).includes(user.id);
            const isLocked = (chat.lockedBy || []).includes(user.id);
            const isUnlocked = unlockedChats.includes(chat.id);
            const isHidden = (chat.hiddenBy || []).includes(user.id);
            const isPendingRequest = chat.requestStatus === 'pending';

            const unreadCount = (chat.unreadCount || {})[user.id] || 0;
            const lastMsg = chat.lastMessage;

            const displayName = isGroup ? (chat.groupName || 'Group Chat') : (otherUser?.name || 'User');
            const displaySub = isGroup ? `${participantsList.length} Members` : '';

            return (
              <div
                key={chat.id}
                onClick={() => handleChatClick(chat)}
                className={`group p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white/[0.08] border-l-2 border-[#00e5ff]'
                    : 'hover:bg-white/[0.04] border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {/* Recipient or Group Avatar */}
                  <div className="relative shrink-0">
                    {isGroup ? (
                      <div className="w-11 h-11 rounded-2xl bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center text-[#00e5ff]">
                        <Users className="w-5 h-5" />
                      </div>
                    ) : (
                      <>
                        <img
                          src={
                            otherUser?.profilePicture ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.username}`
                          }
                          alt={otherUser?.name}
                          className="w-11 h-11 rounded-2xl object-cover bg-white/[0.03] border border-white/10"
                        />
                        {otherUser?.online ? (
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0f1116] rounded-full" />
                        ) : (
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-600 border-2 border-[#0f1116] rounded-full" />
                        )}
                      </>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <h4 className="text-xs font-medium text-white truncate">{displayName}</h4>
                        <span className="text-[10px] font-mono text-[#00e5ff] font-medium truncate shrink-0">
                          {displaySub}
                        </span>
                      </div>
                      {lastMsg && (
                        <span className="text-[10px] text-white/40 shrink-0 ml-1 font-mono">
                          {new Date(lastMsg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    {/* Last message preview or Locked badge */}
                    <div className="flex items-center justify-between">
                      {isLocked && !isUnlocked ? (
                        <p className="text-xs text-cyan-300 font-mono flex items-center space-x-1">
                          <Lock className="w-3.5 h-3.5 text-[#00e5ff]" />
                          <span>LOCKED CHAT (PIN REQUIRED)</span>
                        </p>
                      ) : (
                        <p className="text-xs text-white/50 truncate flex items-center space-x-1">
                          {isPendingRequest ? (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-mono rounded border border-amber-500/30 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>CHAT REQUEST PENDING</span>
                            </span>
                          ) : lastMsg?.encrypted ? (
                            <>
                              <Lock className="w-3 h-3 text-[#00e5ff] shrink-0 inline" />
                              <span className="text-cyan-200 font-mono text-[11px]">
                                🔒 Encrypted Transmission
                              </span>
                            </>
                          ) : (
                            <span>{lastMsg ? lastMsg.text : 'Start transmission...'}</span>
                          )}
                        </p>
                      )}

                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        {isLocked && <Lock className="w-3 h-3 text-[#00e5ff]" />}
                        {isPinned && <Pin className="w-3 h-3 text-[#00e5ff] fill-[#00e5ff]/20" />}
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-[#00e5ff] text-black font-semibold text-[10px] rounded-full min-w-4 text-center">
                            {unreadCount}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinChat(chat.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-[#00e5ff] transition-opacity"
                          title={isPinned ? 'Unpin Chat' : 'Pin Chat'}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this chat?')) {
                              deleteChat(chat.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-opacity"
                          title="Delete Chat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Start New Chat & Group Buttons */}
      <div className="p-4 bg-transparent border-t border-white/10 space-y-2">
        <button
          onClick={onOpenNewChat}
          className="w-full py-2.5 px-4 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold text-xs rounded-xl shadow-[0_8px_24px_rgba(0,229,255,0.2)] flex items-center justify-center space-x-2 transition-all font-mono tracking-wider"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Person</span>
        </button>
        <button
          onClick={onOpenNewGroup}
          className="w-full py-2 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border border-white/10 font-mono text-xs rounded-xl flex items-center justify-center space-x-2 transition-all"
        >
          <Users className="w-3.5 h-3.5 text-[#00e5ff]" />
          <span>CREATE_GROUP_CHAT</span>
        </button>
      </div>

      {/* Unlock Security Modal */}
      {unlockModalChatId && (
        <SecurityUnlockModal
          isOpen={!!unlockModalChatId}
          title="UNLOCK PROTECTED CHAT"
          onClose={() => setUnlockModalChatId(null)}
          onUnlockSuccess={() => {
            if (unlockModalChatId) {
              unlockChatWithSecurity(unlockModalChatId);
              const chatToSelect = chats.find((c) => c.id === unlockModalChatId);
              if (chatToSelect) selectChat(chatToSelect);
            }
          }}
        />
      )}

      {/* Delete Account & Database Records Modal */}
      <DeleteAccountModal
        isOpen={isDeleteAccountOpen}
        onClose={() => setIsDeleteAccountOpen(false)}
      />
    </aside>
  );
};
