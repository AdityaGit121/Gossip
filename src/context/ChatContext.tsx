import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Chat, Message, User, CallSession } from '../types.js';
import { api } from '../services/api.js';
import { getSocket } from '../services/socket.js';
import { useAuth } from './AuthContext.tsx';

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  loadingChats: boolean;
  loadingMessages: boolean;
  typingUsers: Record<string, boolean>; // userId -> isTyping
  searchQuery: string;
  callSession: CallSession | null;
  unlockedChats: string[]; // list of chat IDs unlocked with PIN/Biometrics in current session
  blockedUserIDs: string[]; // list of blocked user IDs
  setSearchQuery: (q: string) => void;
  selectChat: (chat: Chat) => void;
  startChatWithUser: (targetUserID: string) => Promise<Chat>;
  createGroupChat: (groupName: string, participantIDs: string[]) => Promise<Chat>;
  setDisappearingTimer: (seconds: number) => Promise<void>;
  sendMessage: (payload: {
    text: string;
    encrypted?: boolean;
    passkey?: string;
    shiftValue?: number;
    mediaURL?: string;
    audioURL?: string;
    audioDuration?: number;
    locationData?: any;
    fileData?: any;
    disappearingTimer?: number;
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'location' | 'file';
    replyTo?: any;
  }) => Promise<void>;
  emitTyping: (isTyping: boolean) => void;
  togglePinChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  toggleLockChat: (chatId: string) => void;
  toggleHideChat: (chatId: string) => void;
  blockUser: (targetUserId: string) => void;
  unblockUser: (targetUserId: string) => void;
  acceptChatRequest: (chatId: string) => void;
  declineChatRequest: (chatId: string) => void;
  unlockChatWithSecurity: (chatId: string) => void;
  deleteMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  startCall: (isVideo: boolean) => void;
  answerCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  verifyPasskeyAndDecrypt: (messageId: string, passkey: string) => Promise<{ success: boolean; decryptedText?: string; error?: string }>;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChats, setLoadingChats] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [callSession, setCallSession] = useState<CallSession | null>(null);

  // Security & Chat Control States
  const [unlockedChats, setUnlockedChats] = useState<string[]>([]);
  const [blockedUserIDs, setBlockedUserIDs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gossip_blocked_users') || localStorage.getItem('convo_blocked_users');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch chats list
  const refreshChats = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getChats();
      setChats(data.chats);
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setLoadingChats(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshChats();
    }
  }, [token, refreshChats]);

  // Save blocked users
  useEffect(() => {
    localStorage.setItem('gossip_blocked_users', JSON.stringify(blockedUserIDs));
  }, [blockedUserIDs]);

  // Fetch messages when activeChat changes
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const fetchMsgs = async () => {
      setLoadingMessages(true);
      try {
        const data = await api.getMessages(activeChat.id);
        setMessages(data.messages);

        // Join socket room for active chat
        const socket = getSocket();
        if (socket) {
          socket.emit('join_chat', { chatId: activeChat.id });
          socket.emit('mark_read', { chatId: activeChat.id });
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMsgs();

    return () => {
      const socket = getSocket();
      if (socket && activeChat) {
        socket.emit('leave_chat', { chatId: activeChat.id });
      }
    };
  }, [activeChat?.id]);

  // Listen to Socket.IO real-time events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (newMsg: Message) => {
      if (activeChat && newMsg.chatId === activeChat.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        socket.emit('mark_read', { chatId: activeChat.id });
      }
      refreshChats();
    };

    const handleUserTyping = ({ chatId, userId: typingUserId, isTyping }: { chatId: string; userId: string; isTyping: boolean }) => {
      if (activeChat && chatId === activeChat.id && typingUserId !== user?.id) {
        setTypingUsers((prev) => ({
          ...prev,
          [typingUserId]: isTyping,
        }));
      }
    };

    const handleMessagesRead = ({ chatId }: { chatId: string }) => {
      if (activeChat && chatId === activeChat.id) {
        setMessages((prev) =>
          prev.map((m) => (m.senderID === user?.id ? { ...m, status: 'read' } : m))
        );
      }
    };

    const handleMessageDeleted = ({ chatId, messageId }: { chatId: string; messageId: string }) => {
      if (activeChat && chatId === activeChat.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, deleted: true, text: 'This message was deleted', encryptedMessage: undefined, mediaURL: undefined, audioURL: undefined, fileData: undefined }
              : m
          )
        );
      }
      refreshChats();
    };

    const handleMessageEdited = ({ chatId, messageId, newText }: { chatId: string; messageId: string; newText: string }) => {
      if (activeChat && chatId === activeChat.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, text: newText, edited: true } : m))
        );
      }
    };

    const handleMessageReacted = ({ chatId, messageId, reactions }: { chatId: string; messageId: string; reactions: Record<string, string> }) => {
      if (activeChat && chatId === activeChat.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
        );
      }
    };

    const handleDisappearingTimerUpdated = ({ chatId, seconds }: { chatId: string; seconds: number }) => {
      if (activeChat && activeChat.id === chatId) {
        setActiveChat((prev) => (prev ? { ...prev, disappearingTimer: seconds } : null));
      }
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, disappearingTimer: seconds } : c)));
    };

    // WebRTC call handlers
    const handleIncomingCall = (callData: { chatId: string; isVideo: boolean; caller: User }) => {
      if (callData.caller.id !== user?.id && !blockedUserIDs.includes(callData.caller.id)) {
        setCallSession({
          chatId: callData.chatId,
          isVideo: callData.isVideo,
          caller: callData.caller,
          status: 'ringing',
          isIncoming: true,
        });
      }
    };

    const handleCallAnswered = () => {
      setCallSession((prev) => (prev ? { ...prev, status: 'connected' } : null));
    };

    const handleCallRejected = () => {
      setCallSession(null);
    };

    const handleCallEnded = () => {
      setCallSession(null);
    };

    const handleUserStatusChanged = ({ userId: statusUserId, online }: { userId: string; online: boolean }) => {
      setChats((prev) =>
        (prev || []).map((c) => ({
          ...c,
          participants: (c?.participants || []).map((p) => (p && p.id === statusUserId ? { ...p, online } : p)),
        }))
      );
      if (activeChat) {
        setActiveChat((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            participants: (prev?.participants || []).map((p) => (p && p.id === statusUserId ? { ...p, online } : p)),
          };
        });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('chat_updated', refreshChats);
    socket.on('user_typing', handleUserTyping);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_reacted', handleMessageReacted);
    socket.on('disappearing_timer_updated', handleDisappearingTimerUpdated);
    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_answered', handleCallAnswered);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);
    socket.on('user_status_changed', handleUserStatusChanged);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('chat_updated', refreshChats);
      socket.off('user_typing', handleUserTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_reacted', handleMessageReacted);
      socket.off('disappearing_timer_updated', handleDisappearingTimerUpdated);
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_answered', handleCallAnswered);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      socket.off('user_status_changed', handleUserStatusChanged);
    };
  }, [activeChat, user?.id, refreshChats, blockedUserIDs]);

  const selectChat = (chat: Chat) => {
    setActiveChat(chat);
  };

  const startChatWithUser = async (targetUserID: string): Promise<Chat> => {
    const res = await api.startChat(targetUserID);
    await refreshChats();
    // Default new direct chats to pending chat request if new conversation
    const newChat: Chat = {
      ...res.chat,
      requestStatus: res.chat.requestStatus || (res.chat.lastMessage ? 'accepted' : 'pending'),
      requestedBy: user?.id,
    };
    setActiveChat(newChat);
    return newChat;
  };

  const createGroupChat = async (groupName: string, participantIDs: string[]): Promise<Chat> => {
    const res = await api.createGroupChat(groupName, participantIDs);
    await refreshChats();
    const groupChat = { ...res.chat, requestStatus: 'accepted' as const };
    setActiveChat(groupChat);
    return groupChat;
  };

  const setDisappearingTimer = async (seconds: number) => {
    if (!activeChat) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('set_disappearing_timer', { chatId: activeChat.id, seconds });
    } else {
      const res = await api.setDisappearingTimer(activeChat.id, seconds);
      if (res.chat) {
        setActiveChat(res.chat);
        setChats((prev) => prev.map((c) => (c.id === activeChat.id ? res.chat : c)));
      }
    }
  };

  const sendMessage = async (payload: {
    text: string;
    encrypted?: boolean;
    passkey?: string;
    shiftValue?: number;
    mediaURL?: string;
    audioURL?: string;
    audioDuration?: number;
    locationData?: any;
    fileData?: any;
    disappearingTimer?: number;
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'location' | 'file';
    replyTo?: any;
  }) => {
    if (!activeChat || !user) return;

    const participants = Array.isArray(activeChat.participants) ? activeChat.participants : [];
    const receiver = participants.find((p) => p && p.id !== user.id);
    const receiverID = receiver ? receiver.id : participants[0]?.id || '';

    if (blockedUserIDs.includes(receiverID)) {
      alert('Cannot send message: Contact is currently blocked.');
      return;
    }

    const socket = getSocket();
    if (socket) {
      socket.emit('send_message', {
        chatId: activeChat.id,
        receiverID,
        disappearingTimer: payload.disappearingTimer || activeChat.disappearingTimer,
        ...payload,
      });
    } else {
      await api.sendMessage({
        chatId: activeChat.id,
        receiverID,
        ...payload,
      });
      await refreshChats();
    }
  };

  // Chat Security Actions
  const toggleLockChat = (chatId: string) => {
    if (!user) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        const currentLocked = c.lockedBy || [];
        const isLocked = currentLocked.includes(user.id);
        const updatedLocked = isLocked
          ? currentLocked.filter((id) => id !== user.id)
          : [...currentLocked, user.id];
        return { ...c, lockedBy: updatedLocked };
      })
    );
    if (activeChat?.id === chatId) {
      setActiveChat((prev) => {
        if (!prev) return null;
        const currentLocked = prev.lockedBy || [];
        const isLocked = currentLocked.includes(user.id);
        const updatedLocked = isLocked
          ? currentLocked.filter((id) => id !== user.id)
          : [...currentLocked, user.id];
        return { ...prev, lockedBy: updatedLocked };
      });
    }
  };

  const toggleHideChat = (chatId: string) => {
    if (!user) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        const currentHidden = c.hiddenBy || [];
        const isHidden = currentHidden.includes(user.id);
        const updatedHidden = isHidden
          ? currentHidden.filter((id) => id !== user.id)
          : [...currentHidden, user.id];
        return { ...c, hiddenBy: updatedHidden };
      })
    );
    if (activeChat?.id === chatId) {
      setActiveChat(null);
    }
  };

  const blockUser = (targetUserId: string) => {
    setBlockedUserIDs((prev) => (prev.includes(targetUserId) ? prev : [...prev, targetUserId]));
  };

  const unblockUser = (targetUserId: string) => {
    setBlockedUserIDs((prev) => prev.filter((id) => id !== targetUserId));
  };

  const acceptChatRequest = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, requestStatus: 'accepted' } : c))
    );
    if (activeChat?.id === chatId) {
      setActiveChat((prev) => (prev ? { ...prev, requestStatus: 'accepted' } : null));
    }
  };

  const declineChatRequest = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChat?.id === chatId) {
      setActiveChat(null);
    }
  };

  const unlockChatWithSecurity = (chatId: string) => {
    setUnlockedChats((prev) => (prev.includes(chatId) ? prev : [...prev, chatId]));
  };

  const startCall = (isVideo: boolean) => {
    if (!activeChat || !user) return;
    const participants = Array.isArray(activeChat.participants) ? activeChat.participants : [];
    const targetUser = participants.find((p) => p && p.id !== user.id) || null;
    if (targetUser && blockedUserIDs.includes(targetUser.id)) {
      alert('Cannot start call: Contact is blocked.');
      return;
    }
    setCallSession({
      chatId: activeChat.id,
      isVideo,
      caller: user,
      targetUser,
      status: 'ringing',
      isIncoming: false,
    });
    const socket = getSocket();
    if (socket) {
      socket.emit('start_call', {
        chatId: activeChat.id,
        targetUserId: targetUser?.id,
        isVideo,
      });
    }
  };

  const answerCall = () => {
    if (!callSession) return;
    setCallSession((prev) => (prev ? { ...prev, status: 'connected' } : null));
    const socket = getSocket();
    if (socket) {
      socket.emit('answer_call', {
        chatId: callSession.chatId,
        callerId: callSession.caller.id,
      });
    }
  };

  const rejectCall = () => {
    if (!callSession) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('reject_call', {
        chatId: callSession.chatId,
        callerId: callSession.caller.id,
      });
    }
    setCallSession(null);
  };

  const endCall = () => {
    if (!callSession) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('end_call', { chatId: callSession.chatId });
    }
    setCallSession(null);
  };

  const emitTyping = (isTyping: boolean) => {
    if (!activeChat) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('typing', { chatId: activeChat.id, isTyping });
    }
  };

  const togglePinChat = async (chatId: string) => {
    await api.togglePinChat(chatId);
    await refreshChats();
  };

  const deleteChat = async (chatId: string) => {
    await api.deleteChat(chatId);
    if (activeChat?.id === chatId) {
      setActiveChat(null);
      setMessages([]);
    }
    await refreshChats();
  };

  const deleteMessage = async (messageId: string) => {
    if (!activeChat) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('delete_message', { chatId: activeChat.id, messageId });
    } else {
      await api.deleteMessage(messageId, activeChat.id);
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, deleted: true, text: 'This message was deleted', encryptedMessage: undefined, mediaURL: undefined }
          : m
      )
    );
  };

  const editMessage = async (messageId: string, newText: string) => {
    if (!activeChat) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('edit_message', { chatId: activeChat.id, messageId, newText });
    } else {
      await api.editMessage(messageId, activeChat.id, newText);
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, text: newText, edited: true } : m))
    );
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!activeChat || !user) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('react_message', { chatId: activeChat.id, messageId, emoji });
    } else {
      const res = await api.reactToMessage(messageId, activeChat.id, emoji);
      if (res.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: res.message.reactions } : m))
        );
      }
    }
  };

  const verifyPasskeyAndDecrypt = async (messageId: string, passkey: string) => {
    if (!activeChat) return { success: false, error: 'No active chat' };
    return await api.verifyPasskey(messageId, activeChat.id, passkey);
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        messages,
        loadingChats,
        loadingMessages,
        typingUsers,
        searchQuery,
        callSession,
        unlockedChats,
        blockedUserIDs,
        setSearchQuery,
        selectChat,
        startChatWithUser,
        createGroupChat,
        setDisappearingTimer,
        sendMessage,
        emitTyping,
        togglePinChat,
        deleteChat,
        toggleLockChat,
        toggleHideChat,
        blockUser,
        unblockUser,
        acceptChatRequest,
        declineChatRequest,
        unlockChatWithSecurity,
        deleteMessage,
        editMessage,
        reactToMessage,
        startCall,
        answerCall,
        rejectCall,
        endCall,
        verifyPasskeyAndDecrypt,
        refreshChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
};
