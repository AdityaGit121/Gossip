import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { dbStore } from './db.js';
import { caesarCipherEncrypt, hashPasskeySync } from '../utils/caesarCipher.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gossip-secret-jwt-key-2026';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

export function setupSocketIO(io: Server) {
  // Interval for cleaning expired disappearing messages in real-time
  setInterval(() => {
    try {
      dbStore.checkAndCleanExpiredMessages(io);
    } catch (e) {
      console.error('Error in checkAndCleanExpiredMessages interval:', e);
    }
  }, 1000);

  // Middleware for socket authentication
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      next();
    } catch {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    if (!userId) return;

    // Set online
    dbStore.setUserOnline(userId, true);
    socket.join(`user_${userId}`);

    // Broadcast online status to all connected users
    io.emit('user_status_changed', { userId, online: true });

    // Handle joining chat room
    socket.on('join_chat', ({ chatId }: { chatId: string }) => {
      socket.join(`chat_${chatId}`);
    });

    // Handle leaving chat room
    socket.on('leave_chat', ({ chatId }: { chatId: string }) => {
      socket.leave(`chat_${chatId}`);
    });

    // Handle real-time send_message
    socket.on(
      'send_message',
      async (data: {
        chatId: string;
        receiverID: string;
        messageType?: 'text' | 'image' | 'video' | 'audio' | 'location' | 'file';
        text?: string;
        encrypted?: boolean;
        passkey?: string;
        shiftValue?: number;
        mediaURL?: string;
        audioURL?: string;
        audioDuration?: number;
        locationData?: any;
        fileData?: any;
        disappearingTimer?: number;
        replyTo?: any;
      }) => {
        try {
          const {
            chatId,
            receiverID,
            messageType = 'text',
            text = '',
            encrypted = false,
            passkey,
            shiftValue = 5,
            mediaURL,
            audioURL,
            audioDuration,
            locationData,
            fileData,
            disappearingTimer,
            replyTo,
          } = data;

          let finalText = text;
          let encryptedText: string | undefined = undefined;
          let passkeyHash: string | undefined = undefined;

          if (encrypted && text) {
            if (!passkey) return;
            const shift = Number(shiftValue) || 5;
            encryptedText = caesarCipherEncrypt(text, shift);
            finalText = encryptedText;
            passkeyHash = hashPasskeySync(passkey);
          }

          const message = dbStore.createMessage({
            chatId,
            senderID: userId,
            receiverID,
            messageType,
            text: finalText,
            encryptedMessage: encryptedText,
            shiftValue: encrypted ? Number(shiftValue) || 5 : undefined,
            encrypted,
            passkeyHash,
            mediaURL,
            audioURL,
            audioDuration,
            locationData,
            fileData,
            disappearingTimer,
            replyTo,
          });

          // Broadcast to chat room
          io.to(`chat_${chatId}`).emit('new_message', message);

          // Get chat to know participants
          const chat = dbStore.getChatById(chatId);
          if (chat && chat.participantIDs) {
            chat.participantIDs.forEach((pId) => {
              io.to(`user_${pId}`).emit('chat_updated', {
                chatId,
                lastMessage: message,
                senderID: userId,
              });
            });
          } else {
            // Default 1-on-1 fallback
            if (receiverID) io.to(`user_${receiverID}`).emit('chat_updated', { chatId, lastMessage: message, senderID: userId });
            io.to(`user_${userId}`).emit('chat_updated', { chatId, lastMessage: message, senderID: userId });
          }
        } catch (err) {
          console.error('Socket send_message error:', err);
        }
      }
    );

    // Handle setting disappearing timer for chat
    socket.on('set_disappearing_timer', ({ chatId, seconds }: { chatId: string; seconds: number }) => {
      const updatedChat = dbStore.setChatDisappearingTimer(chatId, seconds);
      if (updatedChat) {
        io.to(`chat_${chatId}`).emit('disappearing_timer_updated', { chatId, seconds });
      }
    });

    // Handle Real-Time WebRTC Call Events
    socket.on('start_call', ({ chatId, targetUserId, isVideo }: { chatId: string; targetUserId?: string; isVideo: boolean }) => {
      const callerUser = dbStore.getUserById(userId);
      if (!callerUser) return;

      const callData = {
        chatId,
        isVideo,
        caller: dbStore.sanitizeUser(callerUser),
        timestamp: new Date().toISOString(),
      };

      if (targetUserId) {
        io.to(`user_${targetUserId}`).emit('incoming_call', callData);
      }
      socket.to(`chat_${chatId}`).emit('incoming_call', callData);
    });

    socket.on('answer_call', ({ chatId, callerId }: { chatId: string; callerId: string }) => {
      io.to(`user_${callerId}`).emit('call_answered', { chatId, userId });
      io.to(`chat_${chatId}`).emit('call_answered', { chatId, userId });
    });

    socket.on('reject_call', ({ chatId, callerId }: { chatId: string; callerId: string }) => {
      io.to(`user_${callerId}`).emit('call_rejected', { chatId, userId });
      io.to(`chat_${chatId}`).emit('call_rejected', { chatId, userId });
    });

    socket.on('end_call', ({ chatId }: { chatId: string }) => {
      io.to(`chat_${chatId}`).emit('call_ended', { chatId, userId });
    });

    socket.on('webrtc_signal', ({ targetUserId, chatId, signal }: { targetUserId?: string; chatId: string; signal: any }) => {
      if (targetUserId) {
        io.to(`user_${targetUserId}`).emit('webrtc_signal', { senderId: userId, signal });
      } else {
        socket.to(`chat_${chatId}`).emit('webrtc_signal', { senderId: userId, signal });
      }
    });

    // Handle typing indicator
    socket.on('typing', ({ chatId, isTyping }: { chatId: string; isTyping: boolean }) => {
      socket.to(`chat_${chatId}`).emit('user_typing', {
        chatId,
        userId,
        isTyping,
      });
    });

    // Handle mark read
    socket.on('mark_read', ({ chatId }: { chatId: string }) => {
      dbStore.markMessagesAsRead(chatId, userId);
      io.to(`chat_${chatId}`).emit('messages_read', { chatId, userId });
    });

    // Handle delete message
    socket.on('delete_message', ({ chatId, messageId }: { chatId: string; messageId: string }) => {
      const success = dbStore.deleteMessage(chatId, messageId, userId);
      if (success) {
        io.to(`chat_${chatId}`).emit('message_deleted', { chatId, messageId });
      }
    });

    // Handle edit message
    socket.on('edit_message', ({ chatId, messageId, newText }: { chatId: string; messageId: string; newText: string }) => {
      const updated = dbStore.editMessage(chatId, messageId, newText);
      if (updated) {
        io.to(`chat_${chatId}`).emit('message_edited', { chatId, messageId, newText, message: updated });
      }
    });

    // Handle react message
    socket.on('react_message', ({ chatId, messageId, emoji }: { chatId: string; messageId: string; emoji: string }) => {
      const updated = dbStore.reactToMessage(chatId, messageId, userId, emoji);
      if (updated) {
        io.to(`chat_${chatId}`).emit('message_reacted', {
          chatId,
          messageId,
          reactions: updated.reactions,
          message: updated,
        });
      }
    });

    // --- MEDIA ROOM EVENTS ---
    socket.on('join_media_room', async ({ roomId }: { roomId: string }) => {
      socket.join(`mroom_${roomId}`);
      const updatedRoom = await dbStore.joinMediaRoomAsync(roomId, userId);
      if (updatedRoom) {
        io.to(`mroom_${roomId}`).emit('room_updated', updatedRoom);
      }
    });

    socket.on('leave_media_room', async ({ roomId }: { roomId: string }) => {
      socket.leave(`mroom_${roomId}`);
      const updatedRoom = await dbStore.leaveMediaRoomAsync(roomId, userId);
      if (updatedRoom) {
        io.to(`mroom_${roomId}`).emit('room_updated', updatedRoom);
      }
    });

    socket.on('update_room_media', async ({ roomId, mediaType, mediaUrl, title }: { roomId: string; mediaType: any; mediaUrl: string; title?: string }) => {
      const room = await dbStore.getMediaRoomByIdAsync(roomId);
      if (!room) return;
      if (room.hostId !== userId) {
        socket.emit('room_action_denied', { error: 'Only the room host can change media.' });
        return;
      }
      const updatedRoom = await dbStore.updateMediaRoomMediaAsync(roomId, userId, { mediaType, mediaUrl, title });
      if (updatedRoom) {
        io.to(`mroom_${roomId}`).emit('room_updated', updatedRoom);
      }
    });

    socket.on('sync_room_playback', async ({ roomId, isPlaying, currentTime }: { roomId: string; isPlaying: boolean; currentTime: number }) => {
      const room = await dbStore.getMediaRoomByIdAsync(roomId);
      if (!room) return;
      if (room.hostId !== userId) {
        socket.emit('room_action_denied', { error: 'Only the room host can control playback.' });
        return;
      }
      await dbStore.updateMediaRoomPlaybackAsync(roomId, isPlaying, currentTime);
      io.to(`mroom_${roomId}`).emit('playback_synced', {
        roomId,
        isPlaying,
        currentTime,
        senderId: userId,
      });
    });

    socket.on('send_room_chat', async ({ roomId, text }: { roomId: string; text: string }) => {
      const chatMsg = await dbStore.addMediaRoomChatMessageAsync(roomId, userId, text);
      if (chatMsg) {
        io.to(`mroom_${roomId}`).emit('new_room_chat', { roomId, chatMsg });
      }
    });

    socket.on('room_webrtc_signal', ({ roomId, targetUserId, signal }: { roomId: string; targetUserId?: string; signal: any }) => {
      if (targetUserId) {
        io.to(`user_${targetUserId}`).emit('room_webrtc_signal', { senderId: userId, roomId, signal });
      } else {
        socket.to(`mroom_${roomId}`).emit('room_webrtc_signal', { senderId: userId, roomId, signal });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      dbStore.setUserOnline(userId, false);
      io.emit('user_status_changed', { userId, online: false, lastSeen: new Date().toISOString() });
    });

  });
}
