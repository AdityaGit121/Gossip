import bcrypt from 'bcryptjs';
import { User, Chat, Message, Moment, MediaRoom, RoomChatMessage } from '../types.js';
import { caesarCipherEncrypt, hashPasskeySync, generateUserID } from '../utils/caesarCipher.js';
import { firestore } from './firestore.js';

class DatabaseStore {
  private users: Map<string, User & { passwordHash: string }> = new Map();
  private chats: Map<string, Chat> = new Map();
  private messages: Map<string, Message[]> = new Map(); // chatId -> Message[]
  private moments: Map<string, Moment> = new Map(); // momentId -> Moment
  private mediaRooms: Map<string, MediaRoom> = new Map(); // roomId -> MediaRoom
  private onlineUsers: Set<string> = new Set(); // userId set
  private passwordResetOtps: Map<string, { userId?: string; identifier?: string; phoneNumber?: string; email?: string; otp: string; expiresAt: number; attempts: number; createdAt: number }> = new Map();
  public isInitialized = false;

  constructor() {
    this.seedDemoData();
    this.initFirestore().catch((err) => {
      console.error('🔥 Firestore initialization error:', err);
    });
  }

  private async initFirestore() {
    try {
      console.log('🔥 Syncing data with Firebase Firestore permanent database...');
      const usersSnap = await firestore.collection('users').get();

      if (usersSnap.empty) {
        console.log('🔥 Firestore database is empty. Seeding initial data to Firestore...');
        await this.persistDemoDataToFirestore();
      } else {
        console.log(`🔥 Loaded ${usersSnap.size} persistent users from Firestore.`);
        usersSnap.forEach((doc) => {
          const u = doc.data() as User & { passwordHash: string };
          if (u && u.id) {
            this.users.set(u.id, u);
          }
        });

        const chatsSnap = await firestore.collection('chats').get();
        chatsSnap.forEach((doc) => {
          const c = doc.data() as Chat;
          if (c && c.id) {
            this.chats.set(c.id, c);
          }
        });

        const messagesSnap = await firestore.collection('messages').get();
        this.messages.clear();
        messagesSnap.forEach((doc) => {
          const m = doc.data() as Message;
          if (m && m.chatId && m.id) {
            const list = this.messages.get(m.chatId) || [];
            if (!list.some((existing) => existing.id === m.id)) {
              list.push(m);
            }
            this.messages.set(m.chatId, list);
          }
        });

        for (const [chatId, list] of this.messages.entries()) {
          list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        }
      }

      this.isInitialized = true;
      console.log('✅ Firebase Firestore synchronization complete! Data is permanently preserved.');
    } catch (err) {
      console.error('⚠️ Firestore sync failed, operating with local fallback state:', err);
    }
  }

  private async persistDemoDataToFirestore() {
    try {
      for (const [id, user] of this.users.entries()) {
        await firestore.collection('users').doc(id).set(user);
      }
      for (const [id, chat] of this.chats.entries()) {
        await firestore.collection('chats').doc(id).set(chat);
      }
      for (const [chatId, list] of this.messages.entries()) {
        for (const msg of list) {
          await firestore.collection('messages').doc(msg.id).set(msg);
        }
      }
      console.log('✅ Initial demo data saved to Firestore permanent database.');
    } catch (err) {
      console.error('Failed to persist demo data to Firestore:', err);
    }
  }

  private seedDemoData() {
    const passwordHash = bcrypt.hashSync('password123', 8);

    const user1: User & { passwordHash: string } = {
      id: 'u1',
      userID: 'USR-10293',
      name: 'Alice Smith',
      username: 'alicesmith',
      phoneNumber: '+19876543210',
      contactNumber: '+19876543210',
      email: 'alice@gossip.com',
      passwordHash,
      securityPin: '123456',
      bio: 'Cybersecurity Enthusiast 🔐 | Gossip Pioneer',
      profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      online: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    };

    const user2: User & { passwordHash: string } = {
      id: 'u2',
      userID: 'USR-48192',
      name: 'Bob Jones',
      username: 'bobjones',
      phoneNumber: '+19876543211',
      contactNumber: '+19876543211',
      email: 'bob@gossip.com',
      passwordHash,
      securityPin: '123456',
      bio: 'Full Stack Engineer & Cryptography Hobbyist ⚡',
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      online: false,
      lastSeen: new Date(Date.now() - 3600000 * 2).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    };

    const user3: User & { passwordHash: string } = {
      id: 'u3',
      userID: 'USR-77301',
      name: 'Charlie Security',
      username: 'charliesec',
      phoneNumber: '+19876543212',
      contactNumber: '+19876543212',
      email: 'charlie@gossip.com',
      passwordHash,
      securityPin: '123456',
      bio: 'Zero-Trust Advocate 🛡️',
      profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      online: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    };

    this.users.set(user1.id, user1);
    this.users.set(user2.id, user2);
    this.users.set(user3.id, user3);

    // Pre-seeded Chat 1: Alice & Bob
    const chatId1 = 'chat_u1_u2';
    const passkey1 = 'SECRET123';
    const shift1 = 7;
    const plainText1 = 'Meet me at midnight at the main server room. Keycode is 9874.';
    const encryptedText1 = caesarCipherEncrypt(plainText1, shift1);
    const passkeyHash1 = hashPasskeySync(passkey1);

    const msg1_1: Message = {
      id: 'm1',
      chatId: chatId1,
      senderID: 'u2',
      receiverID: 'u1',
      messageType: 'text',
      text: 'Hey Alice! Welcome to Gossip. Sending you a confidential message.',
      encrypted: false,
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      status: 'read',
    };

    const msg1_2: Message = {
      id: 'm2',
      chatId: chatId1,
      senderID: 'u2',
      receiverID: 'u1',
      messageType: 'text',
      text: encryptedText1,
      encryptedMessage: encryptedText1,
      shiftValue: shift1,
      encrypted: true,
      passkeyHash: passkeyHash1,
      passkeyHint: 'Passkey: SECRET123 (Shift: 7)',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
      status: 'read',
    };

    const msg1_3: Message = {
      id: 'm3',
      chatId: chatId1,
      senderID: 'u1',
      receiverID: 'u2',
      messageType: 'text',
      text: 'Got it! Caesar cipher decrypted successfully. Caesar algorithm shift 7 verified!',
      encrypted: false,
      timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
      status: 'delivered',
    };

    const chat1: Chat = {
      id: chatId1,
      participants: [this.sanitizeUser(user1), this.sanitizeUser(user2)],
      participantIDs: [user1.id, user2.id],
      lastMessage: msg1_3,
      unreadCount: { [user1.id]: 0, [user2.id]: 0 },
      pinnedBy: [user1.id],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    };

    this.chats.set(chatId1, chat1);
    this.messages.set(chatId1, [msg1_1, msg1_2, msg1_3]);

    // Pre-seeded Chat 2: Alice & Charlie
    const chatId2 = 'chat_u1_u3';
    const passkey2 = 'CIPHER5';
    const shift2 = 5;
    const plainText2 = 'Project Orion launch code is ORION-2026-ALPHA.';
    const encryptedText2 = caesarCipherEncrypt(plainText2, shift2);
    const passkeyHash2 = hashPasskeySync(passkey2);

    const msg2_1: Message = {
      id: 'm4',
      chatId: chatId2,
      senderID: 'u3',
      receiverID: 'u1',
      messageType: 'text',
      text: encryptedText2,
      encryptedMessage: encryptedText2,
      shiftValue: shift2,
      encrypted: true,
      passkeyHash: passkeyHash2,
      passkeyHint: 'Passkey: CIPHER5 (Shift: 5)',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      status: 'delivered',
    };

    const chat2: Chat = {
      id: chatId2,
      participants: [this.sanitizeUser(user1), this.sanitizeUser(user3)],
      participantIDs: [user1.id, user3.id],
      lastMessage: msg2_1,
      unreadCount: { [user1.id]: 1, [user3.id]: 0 },
      pinnedBy: [],
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
    };

    this.chats.set(chatId2, chat2);
    this.messages.set(chatId2, [msg2_1]);
  }

  public sanitizeUser(userWithHash: User & { passwordHash: string }): User {
    const { passwordHash, ...user } = userWithHash;
    return user;
  }

  // User methods
  public getUserById(id: string): (User & { passwordHash: string }) | undefined {
    return this.users.get(id);
  }

  public async deleteUserCompletelyAsync(userId: string): Promise<boolean> {
    const user = await this.getUserByIdAsync(userId);
    if (!user) return false;

    const userEmail = user.email ? user.email.toLowerCase().trim() : '';
    const userUsername = user.username ? user.username.toLowerCase().trim() : '';

    // 1. Delete from memory map & onlineUsers
    this.users.delete(userId);
    this.onlineUsers.delete(userId);

    // Also purge any other memory user matching same email or username
    for (const [id, u] of Array.from(this.users.entries())) {
      if ((userEmail && u.email.toLowerCase() === userEmail) || (userUsername && u.username.toLowerCase() === userUsername)) {
        this.users.delete(id);
        this.onlineUsers.delete(id);
      }
    }

    // 2. Delete from Firestore users collection (AWAITED)
    try {
      await firestore.collection('users').doc(userId).delete();
      
      if (userEmail) {
        const snapByEmail = await firestore.collection('users').where('email', '==', userEmail).get();
        if (!snapByEmail.empty) {
          for (const d of snapByEmail.docs) {
            this.users.delete(d.id);
            await firestore.collection('users').doc(d.id).delete().catch(() => {});
          }
        }
      }

      if (userUsername) {
        const snapByUsername = await firestore.collection('users').where('username', '==', userUsername).get();
        if (!snapByUsername.empty) {
          for (const d of snapByUsername.docs) {
            this.users.delete(d.id);
            await firestore.collection('users').doc(d.id).delete().catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Error during Firestore user deletion:', err);
    }

    // 3. Delete from Firestore backups collection
    try {
      await firestore.collection('backups').doc(userId).delete();
    } catch (e) {}

    // 4. Delete user's moments from memory & Firestore
    for (const [mId, moment] of Array.from(this.moments.entries())) {
      if (moment.userId === userId) {
        this.moments.delete(mId);
        await firestore.collection('moments').doc(mId).delete().catch(() => {});
      }
    }

    // 5. Purge or sanitize user's chats and messages
    for (const [chatId, chat] of Array.from(this.chats.entries())) {
      const isParticipant = (chat.participants && chat.participants.some((p) => p && p.id === userId)) ||
                            (chat.participantIDs && chat.participantIDs.includes(userId));
      if (!isParticipant) continue;

      chat.participants = (chat.participants || []).filter((p) => p && p.id !== userId);
      chat.participantIDs = (chat.participantIDs || []).filter((id) => id !== userId);
      chat.pinnedBy = (chat.pinnedBy || []).filter((id) => id !== userId);
      chat.lockedBy = (chat.lockedBy || []).filter((id) => id !== userId);
      chat.hiddenBy = (chat.hiddenBy || []).filter((id) => id !== userId);

      if (chat.participants.length === 0 || (!chat.isGroup && chat.participants.length < 2)) {
        // Delete chat permanently
        this.chats.delete(chatId);
        await firestore.collection('chats').doc(chatId).delete().catch(() => {});

        const msgs = this.messages.get(chatId) || [];
        for (const m of msgs) {
          await firestore.collection('messages').doc(m.id).delete().catch(() => {});
        }
        this.messages.delete(chatId);
      } else {
        // Save updated chat
        this.chats.set(chatId, chat);
        await firestore.collection('chats').doc(chatId).set(chat, { merge: true }).catch(() => {});
      }
    }

    // 6. Clean up user media rooms
    for (const [roomId, room] of Array.from(this.mediaRooms.entries())) {
      if (room.hostId === userId) {
        this.mediaRooms.delete(roomId);
        await firestore.collection('media_rooms').doc(roomId).delete().catch(() => {});
      } else {
        room.participants = (room.participants || []).filter((p) => p && p.id !== userId);
        this.mediaRooms.set(roomId, room);
        await firestore.collection('media_rooms').doc(roomId).set(room, { merge: true }).catch(() => {});
      }
    }

    return true;
  }

  public async getUserByIdAsync(id: string): Promise<(User & { passwordHash: string }) | undefined> {
    const cached = this.users.get(id);
    if (cached) return cached;

    try {
      const doc = await firestore.collection('users').doc(id).get();
      if (doc.exists) {
        const u = doc.data() as User & { passwordHash: string };
        if (u && u.id) {
          this.users.set(u.id, u);
          return u;
        }
      }
    } catch (err) {
      // Ignore Firestore read errors
    }
    return undefined;
  }

  public normalizePhone(phone: string): string {
    if (!phone) return '';
    return phone.trim().replace(/[\s\(\)\-\.]/g, '');
  }

  public getUserByPhone(phone: string): (User & { passwordHash: string }) | undefined {
    if (!phone) return undefined;
    const clean = this.normalizePhone(phone);
    const digitsOnly = clean.replace(/[^0-9]/g, '');
    if (!digitsOnly) return undefined;

    for (const u of this.users.values()) {
      const uPhone = this.normalizePhone(u.phoneNumber || u.contactNumber || '');
      const uDigits = uPhone.replace(/[^0-9]/g, '');
      if (
        uPhone === clean ||
        uDigits === digitsOnly ||
        (digitsOnly.length >= 7 && (uDigits.endsWith(digitsOnly) || digitsOnly.endsWith(uDigits)))
      ) {
        return u;
      }
    }
    return undefined;
  }

  public async getUserByPhoneAsync(phone: string): Promise<(User & { passwordHash: string }) | undefined> {
    if (!phone) return undefined;
    const clean = this.normalizePhone(phone);
    const digitsOnly = clean.replace(/[^0-9]/g, '');

    // 1. Check memory first
    const memUser = this.getUserByPhone(phone);
    if (memUser) return memUser;

    // 2. Query Firestore by phoneNumber / contactNumber
    try {
      // Query raw clean
      const snap1 = await firestore.collection('users').where('phoneNumber', '==', clean).get();
      if (!snap1.empty) {
        const u = snap1.docs[0].data() as User & { passwordHash: string };
        if (u && u.id) {
          this.users.set(u.id, u);
          return u;
        }
      }

      const snap2 = await firestore.collection('users').where('contactNumber', '==', clean).get();
      if (!snap2.empty) {
        const u = snap2.docs[0].data() as User & { passwordHash: string };
        if (u && u.id) {
          this.users.set(u.id, u);
          return u;
        }
      }

      // Query digits if phone had formatting
      if (digitsOnly && digitsOnly !== clean) {
        const snap3 = await firestore.collection('users').where('phoneNumber', '==', digitsOnly).get();
        if (!snap3.empty) {
          const u = snap3.docs[0].data() as User & { passwordHash: string };
          if (u && u.id) {
            this.users.set(u.id, u);
            return u;
          }
        }
      }
    } catch (err) {}

    return undefined;
  }

  public getUserByEmail(email: string): (User & { passwordHash: string }) | undefined {
    if (!email) return undefined;
    const clean = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email && u.email.toLowerCase().trim() === clean) {
        return u;
      }
    }
    return undefined;
  }

  public async getUserByEmailAsync(email: string): Promise<(User & { passwordHash: string }) | undefined> {
    if (!email) return undefined;
    const cleanEmail = email.toLowerCase().trim();

    // Check memory first
    const memoryUser = this.getUserByEmail(cleanEmail);
    if (memoryUser) return memoryUser;

    // Check Firestore if not found in memory
    try {
      const snap = await firestore.collection('users').where('email', '==', cleanEmail).get();
      if (!snap.empty) {
        const u = snap.docs[0].data() as User & { passwordHash: string };
        if (u && u.id) {
          this.users.set(u.id, u);
          return u;
        }
      }
    } catch (err) {}

    return undefined;
  }

  public async getUserByUsernameAsync(username: string): Promise<(User & { passwordHash: string }) | undefined> {
    if (!username) return undefined;
    const cleanUsername = username.toLowerCase().trim().replace(/^@/, '');

    // Check memory first
    for (const u of this.users.values()) {
      if (u.username && u.username.toLowerCase().trim() === cleanUsername) {
        return u;
      }
    }

    // Check Firestore if not found in memory
    try {
      const snap = await firestore.collection('users').where('username', '==', cleanUsername).get();
      if (!snap.empty) {
        const u = snap.docs[0].data() as User & { passwordHash: string };
        if (u && u.id) {
          this.users.set(u.id, u);
          return u;
        }
      }
    } catch (err) {}

    return undefined;
  }

  public getUserByUserID(userID: string): (User & { passwordHash: string }) | undefined {
    if (!userID) return undefined;
    const clean = userID.trim().replace(/^[@#]/, '').toUpperCase();
    for (const u of this.users.values()) {
      if (
        u.userID.toUpperCase() === clean ||
        u.userID.toUpperCase() === `USR-${clean}` ||
        u.id === userID
      ) {
        return u;
      }
    }
    return undefined;
  }

  public async findUserByIdentifierAsync(identifier: string): Promise<(User & { passwordHash: string }) | undefined> {
    if (!identifier) return undefined;
    const raw = identifier.trim();
    if (!raw) return undefined;

    const clean = raw.replace(/^[@#]/, '').trim();
    const cleanUpper = clean.toUpperCase();
    const cleanLower = clean.toLowerCase();
    const phoneNorm = this.normalizePhone(raw);
    const digitsOnly = phoneNorm.replace(/[^0-9]/g, '');

    // 1. Check in-memory users by Email, User ID, Username, Phone Number, Doc ID
    for (const u of this.users.values()) {
      const uPhone = this.normalizePhone(u.phoneNumber || u.contactNumber || '');
      const uDigits = uPhone.replace(/[^0-9]/g, '');
      const uUserIdUpper = (u.userID || '').toUpperCase();
      const uUserIdLower = (u.userID || '').toLowerCase();

      if (
        u.id === raw ||
        (u.email && u.email.toLowerCase() === cleanLower) ||
        uUserIdUpper === cleanUpper ||
        uUserIdLower === cleanLower ||
        u.userID === clean ||
        (!cleanUpper.startsWith('USR-') && uUserIdUpper === `USR-${cleanUpper}`) ||
        (u.username && u.username.toLowerCase() === cleanLower) ||
        (digitsOnly.length >= 7 && (uDigits === digitsOnly || (uPhone && uPhone === phoneNorm)))
      ) {
        return u;
      }
    }

    // 2. Query Firestore if not found in memory
    try {
      // Check doc ID directly
      const docSnap = await firestore.collection('users').doc(raw).get();
      if (docSnap.exists) {
        const u = docSnap.data() as User & { passwordHash: string };
        if (u && u.id) {
          this.users.set(u.id, u);
          return u;
        }
      }

      // Check email in Firestore
      const snapByEmail = await firestore.collection('users').where('email', '==', cleanLower).get();
      if (!snapByEmail.empty) {
        const u = snapByEmail.docs[0].data() as User & { passwordHash: string };
        if (u && u.id) {
          this.users.set(u.id, u);
          return u;
        }
      }

      // Check phone number in Firestore
      if (digitsOnly.length >= 7) {
        const phoneMatch = await this.getUserByPhoneAsync(raw);
        if (phoneMatch) return phoneMatch;
      }

      // Check userID field (clean, upper, lower)
      const snapByUserId = await firestore.collection('users').where('userID', '==', clean).get();
      if (!snapByUserId.empty) {
        const u = snapByUserId.docs[0].data() as User & { passwordHash: string };
        if (u && u.id) {
          this.users.set(u.id, u);
          return u;
        }
      }

      const snapByUserIdUpper = await firestore.collection('users').where('userID', '==', cleanUpper).get();
      if (!snapByUserIdUpper.empty) {
        const u = snapByUserIdUpper.docs[0].data() as User & { passwordHash: string };
        if (u && u.id) {
          this.users.set(u.id, u);
          return u;
        }
      }

      // Check USR- formatted userID
      if (!cleanUpper.startsWith('USR-')) {
        const snapByFormatted = await firestore.collection('users').where('userID', '==', `USR-${cleanUpper}`).get();
        if (!snapByFormatted.empty) {
          const u = snapByFormatted.docs[0].data() as User & { passwordHash: string };
          if (u && u.id) {
            this.users.set(u.id, u);
            return u;
          }
        }
      }

      // Check username
      const snapByUsername = await firestore.collection('users').where('username', '==', cleanLower).get();
      if (!snapByUsername.empty) {
        const u = snapByUsername.docs[0].data() as User & { passwordHash: string };
        if (u && u.id) {
          this.users.set(u.id, u);
          return u;
        }
      }
    } catch (err) {
      console.warn('⚠️ Firestore findUserByIdentifier notice:', err);
    }

    return undefined;
  }

  public searchUsers(query: string, currentUserId: string): User[] {
    const raw = query.trim();
    if (!raw) return [];
    const clean = raw.replace(/^[@#]/, '').trim().toLowerCase();
    const cleanFormatted = clean.startsWith('usr-') ? clean : `usr-${clean}`;
    const cleanDigits = raw.replace(/[^0-9]/g, '');

    const results: User[] = [];
    const seen = new Set<string>();

    for (const u of this.users.values()) {
      if (u.id === currentUserId) continue;
      const uId = u.userID.toLowerCase();
      const uName = u.name.toLowerCase();
      const uUsername = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uPhone = (u.phoneNumber || u.contactNumber || '').toLowerCase();
      const uDigits = uPhone.replace(/[^0-9]/g, '');

      if (
        uId.includes(clean) ||
        uId.includes(cleanFormatted) ||
        uName.includes(clean) ||
        uUsername.includes(clean) ||
        uEmail.includes(clean) ||
        (cleanDigits.length >= 3 && uDigits.includes(cleanDigits)) ||
        uPhone.includes(clean) ||
        u.id === raw
      ) {
        if (!seen.has(u.id)) {
          seen.add(u.id);
          results.push(this.sanitizeUser(u));
        }
      }
    }
    return results;
  }

  public async searchUsersAsync(query: string, currentUserId: string): Promise<User[]> {
    const memoryResults = this.searchUsers(query, currentUserId);
    if (memoryResults.length > 0) return memoryResults;

    const directMatch = await this.findUserByIdentifierAsync(query);
    if (directMatch && directMatch.id !== currentUserId) {
      return [this.sanitizeUser(directMatch)];
    }

    return [];
  }

  public createUser(userData: {
    name: string;
    phoneNumber?: string;
    contactNumber?: string;
    username?: string;
    email?: string;
    passwordHash: string;
    securityPin?: string;
  }): User {
    let userID = generateUserID();
    while (this.getUserByUserID(userID)) {
      userID = generateUserID();
    }

    const rawPhone = userData.phoneNumber || userData.contactNumber || '';
    const cleanPhone = this.normalizePhone(rawPhone);
    const phoneDigits = cleanPhone.replace(/[^0-9]/g, '');

    const fallbackUsername = (
      userData.username ||
      userData.name.toLowerCase().replace(/[^a-z0-9]/g, '') + (phoneDigits ? `_${phoneDigits.slice(-4)}` : `_${Math.floor(1000 + Math.random() * 9000)}`)
    ).toLowerCase();

    const fallbackEmail = (
      userData.email ||
      `${phoneDigits || fallbackUsername}@gossip.local`
    ).toLowerCase();

    const id = 'u_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const newUser: User & { passwordHash: string } = {
      id,
      userID,
      name: userData.name.trim(),
      username: fallbackUsername,
      phoneNumber: cleanPhone || rawPhone,
      contactNumber: cleanPhone || rawPhone,
      email: fallbackEmail,
      passwordHash: userData.passwordHash,
      securityPin: userData.securityPin || '123456',
      profilePicture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fallbackUsername}`,
      bio: 'Hey there! I am using Gossip.',
      online: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.users.set(id, newUser);

    // Asynchronously save to Firestore permanent database
    firestore.collection('users').doc(id).set(newUser).catch((err) => {
      console.warn('⚠️ Firestore createUser background sync notice:', err?.message || err);
    });

    return this.sanitizeUser(newUser);
  }

  public updateUserProfile(id: string, updates: Partial<User & { passwordHash?: string; securityPinHash?: string; patternLockHash?: string; publicKeyJwk?: any }>): User | null {
    const user = this.users.get(id);
    if (!user) return null;

    if (updates.name !== undefined && updates.name.trim() !== '') user.name = updates.name.trim();
    if (updates.username !== undefined && updates.username.trim() !== '') user.username = updates.username.trim().toLowerCase();
    if (updates.phoneNumber !== undefined) {
      user.phoneNumber = updates.phoneNumber;
      user.contactNumber = updates.phoneNumber;
    }
    if (updates.contactNumber !== undefined) {
      user.contactNumber = updates.contactNumber;
      user.phoneNumber = updates.contactNumber;
    }
    if (updates.email !== undefined && updates.email.trim() !== '') user.email = updates.email.trim().toLowerCase();
    if (updates.bio !== undefined) user.bio = updates.bio;
    if (updates.profilePicture !== undefined) user.profilePicture = updates.profilePicture;
    if (updates.securityPin !== undefined) user.securityPin = updates.securityPin;
    if (updates.securityPinHash !== undefined) user.securityPinHash = updates.securityPinHash;
    if (updates.patternLock !== undefined) user.patternLock = updates.patternLock;
    if (updates.patternLockHash !== undefined) user.patternLockHash = updates.patternLockHash;
    if (updates.publicKeyJwk !== undefined) user.publicKeyJwk = updates.publicKeyJwk;
    if (updates.faceEnabled !== undefined) user.faceEnabled = updates.faceEnabled;
    if (updates.faceData !== undefined) user.faceData = updates.faceData;
    if (updates.biometricRegistered !== undefined) user.biometricRegistered = updates.biometricRegistered;
    if (updates.passwordHash !== undefined) user.passwordHash = updates.passwordHash;

    this.users.set(id, user);

    // Asynchronously save to Firestore permanent database
    firestore.collection('users').doc(id).set(user).catch((err) => {
      console.error('🔥 Firestore updateUserProfile sync error:', err);
    });

    return this.sanitizeUser(user);
  }

  // --- Password Reset & Contact Number / Email OTP Methods ---
  public async createPasswordResetOtpForUserAsync(targetIdentifier: string): Promise<{
    otp: string;
    user: (User & { passwordHash: string });
    targetDisplay: string;
    channel: 'phone' | 'email';
  } | null> {
    const user = await this.findUserByIdentifierAsync(targetIdentifier);
    if (!user) return null;

    // Generate secure 6-digit numeric OTP (100000 - 999999)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    const entry = {
      userId: user.id,
      identifier: targetIdentifier.toLowerCase().trim(),
      phoneNumber: user.phoneNumber || user.contactNumber || '',
      email: user.email || '',
      otp,
      expiresAt,
      attempts: 0,
      createdAt: Date.now(),
    };

    // Store in memory by multiple keys for reliable lookup
    const keys = [
      user.id,
      targetIdentifier.toLowerCase().trim(),
      this.normalizePhone(user.phoneNumber || user.contactNumber || ''),
      user.email ? user.email.toLowerCase().trim() : '',
      user.username ? user.username.toLowerCase().trim() : '',
    ].filter(Boolean);

    for (const k of keys) {
      this.passwordResetOtps.set(k, entry);
      firestore.collection('password_resets').doc(k).set(entry).catch(() => {});
    }

    const hasPhone = Boolean(user.phoneNumber || user.contactNumber);
    const targetDisplay = user.phoneNumber || user.contactNumber || user.email || targetIdentifier;
    const channel: 'phone' | 'email' = hasPhone ? 'phone' : 'email';

    console.log(`🔐 [AUTH_SERVICE] 📲 OTP generated for user @${user.username} (${targetDisplay}): ${otp} (Expires in 10m via ${channel})`);
    return { otp, user, targetDisplay, channel };
  }

  public createPasswordResetOtp(emailOrPhone: string): string {
    const clean = emailOrPhone.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    const entry = {
      email: clean,
      identifier: clean,
      otp,
      expiresAt,
      attempts: 0,
      createdAt: Date.now(),
    };

    this.passwordResetOtps.set(clean, entry);
    firestore.collection('password_resets').doc(clean).set(entry).catch(() => {});
    console.log(`🔐 [AUTH_SERVICE] OTP generated for ${clean}: ${otp} (Expires in 10m)`);
    return otp;
  }

  public async verifyPasswordResetOtp(targetIdentifier: string, otp: string): Promise<{ valid: boolean; reason?: string; user?: User & { passwordHash: string } }> {
    const cleanId = targetIdentifier.toLowerCase().trim();
    const cleanPhone = this.normalizePhone(targetIdentifier);
    const cleanOtp = (otp || '').trim();

    if (!cleanOtp) {
      return { valid: false, reason: 'Please provide the 6-digit verification code.' };
    }

    let entry = this.passwordResetOtps.get(cleanId) || (cleanPhone ? this.passwordResetOtps.get(cleanPhone) : undefined);

    if (!entry) {
      // Check user first
      const user = await this.findUserByIdentifierAsync(targetIdentifier);
      if (user) {
        entry = this.passwordResetOtps.get(user.id) ||
                (user.email ? this.passwordResetOtps.get(user.email.toLowerCase().trim()) : undefined) ||
                (user.phoneNumber ? this.passwordResetOtps.get(this.normalizePhone(user.phoneNumber)) : undefined);
      }
    }

    if (!entry) {
      try {
        const doc = await firestore.collection('password_resets').doc(cleanId).get();
        if (doc.exists) {
          entry = doc.data() as any;
          if (entry) {
            this.passwordResetOtps.set(cleanId, entry);
          }
        }
      } catch (e) {}
    }

    if (!entry) {
      return { valid: false, reason: 'No reset request found for this contact number or email. Please request a new OTP code.' };
    }

    if (Date.now() > entry.expiresAt) {
      this.passwordResetOtps.delete(cleanId);
      firestore.collection('password_resets').doc(cleanId).delete().catch(() => {});
      return { valid: false, reason: 'The verification code has expired. Please request a new one.' };
    }

    if (entry.attempts >= 5) {
      this.passwordResetOtps.delete(cleanId);
      firestore.collection('password_resets').doc(cleanId).delete().catch(() => {});
      return { valid: false, reason: 'Too many incorrect attempts. Please request a new OTP code.' };
    }

    if (entry.otp !== cleanOtp) {
      entry.attempts += 1;
      this.passwordResetOtps.set(cleanId, entry);
      firestore.collection('password_resets').doc(cleanId).set(entry).catch(() => {});
      return { valid: false, reason: 'Invalid verification code. Please check and try again.' };
    }

    const matchedUser = entry.userId ? await this.getUserByIdAsync(entry.userId) : await this.findUserByIdentifierAsync(targetIdentifier);
    return { valid: true, user: matchedUser };
  }

  public async resetUserPasswordWithOtpAsync(
    targetIdentifier: string,
    otp: string,
    newPasswordHash: string
  ): Promise<{ user: User | null; error?: string }> {
    const cleanId = targetIdentifier.toLowerCase().trim();

    // Verify OTP first
    const verification = await this.verifyPasswordResetOtp(cleanId, otp);
    if (!verification.valid) {
      return { user: null, error: verification.reason || 'Invalid or expired OTP code.' };
    }

    // Find the user
    const userWithHash = verification.user || await this.findUserByIdentifierAsync(cleanId);
    if (!userWithHash) {
      return { user: null, error: 'No registered user account found matching this contact number or email.' };
    }

    // Update password
    userWithHash.passwordHash = newPasswordHash;
    this.users.set(userWithHash.id, userWithHash);

    // Save to Firestore
    try {
      await firestore.collection('users').doc(userWithHash.id).set(userWithHash, { merge: true });
    } catch (err) {
      console.warn('⚠️ Firestore resetUserPassword sync notice:', err);
    }

    // Clear OTP after successful use
    this.passwordResetOtps.delete(cleanId);
    if (userWithHash.id) this.passwordResetOtps.delete(userWithHash.id);
    firestore.collection('password_resets').doc(cleanId).delete().catch(() => {});

    console.log(`✅ [AUTH_SERVICE] Password successfully reset for user ${userWithHash.phoneNumber || userWithHash.email} (@${userWithHash.username})`);
    return { user: this.sanitizeUser(userWithHash) };
  }

  public setUserOnline(id: string, online: boolean) {
    const user = this.users.get(id);
    if (user) {
      user.online = online;
      user.lastSeen = new Date().toISOString();
      if (online) {
        this.onlineUsers.add(id);
      } else {
        this.onlineUsers.delete(id);
      }

      firestore.collection('users').doc(id).set(user, { merge: true }).catch(() => {});
    }
  }

  public isUserOnline(id: string): boolean {
    return this.onlineUsers.has(id);
  }

  // Chat methods
  public getUserChats(userId: string): Chat[] {
    const userChats: Chat[] = [];
    for (const chat of this.chats.values()) {
      if (chat.participantIDs && chat.participantIDs.includes(userId)) {
        const updatedParticipants = chat.participantIDs
          .map((pid) => {
            const u = this.users.get(pid);
            if (u) {
              return {
                ...this.sanitizeUser(u),
                online: this.onlineUsers.has(pid),
              };
            }
            const existing = chat.participants ? chat.participants.find((p) => p && p.id === pid) : null;
            if (existing) {
              return {
                ...existing,
                online: this.onlineUsers.has(pid),
              };
            }
            return null;
          })
          .filter(Boolean) as User[];

        userChats.push({
          ...chat,
          participants: updatedParticipants,
        });
      }
    }

    return userChats.sort((a, b) => {
      const isAPinned = a.pinnedBy.includes(userId);
      const isBPinned = b.pinnedBy.includes(userId);
      if (isAPinned && !isBPinned) return -1;
      if (!isAPinned && isBPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  public createGroupChat(groupName: string, participantIDs: string[], adminUserId: string): Chat {
    const uniqueIds = Array.from(new Set([...participantIDs, adminUserId]));
    const participantsList: User[] = [];

    uniqueIds.forEach((id) => {
      const u = this.users.get(id);
      if (u) participantsList.push(this.sanitizeUser(u));
    });

    const unreadMap: Record<string, number> = {};
    uniqueIds.forEach((id) => {
      unreadMap[id] = 0;
    });

    const chatId = `group_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newGroupChat: Chat = {
      id: chatId,
      isGroup: true,
      groupName,
      groupAdminID: adminUserId,
      participants: participantsList,
      participantIDs: uniqueIds,
      unreadCount: unreadMap,
      pinnedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.chats.set(chatId, newGroupChat);
    this.messages.set(chatId, []);

    firestore.collection('chats').doc(chatId).set(newGroupChat).catch((err) => {
      console.error('🔥 Firestore createGroupChat sync error:', err);
    });

    return newGroupChat;
  }

  public getChatById(chatId: string): Chat | undefined {
    return this.chats.get(chatId);
  }

  public setChatDisappearingTimer(chatId: string, seconds: number): Chat | null {
    const chat = this.chats.get(chatId);
    if (!chat) return null;

    chat.disappearingTimer = seconds;
    this.chats.set(chatId, chat);

    firestore.collection('chats').doc(chatId).set({ disappearingTimer: seconds }, { merge: true }).catch(() => {});
    return chat;
  }

  public async getOrCreateChatAsync(userId1: string, userId2: string): Promise<Chat> {
    for (const chat of this.chats.values()) {
      if (
        chat.participantIDs &&
        chat.participantIDs.includes(userId1) &&
        chat.participantIDs.includes(userId2) &&
        chat.participantIDs.length === 2 &&
        !chat.isGroup
      ) {
        return chat;
      }
    }

    const u1 = await this.getUserByIdAsync(userId1);
    const u2 = await this.getUserByIdAsync(userId2);
    if (!u1 || !u2) {
      throw new Error('User account not found');
    }

    const chatId = `chat_${userId1}_${userId2}_${Date.now()}`;
    const newChat: Chat = {
      id: chatId,
      participants: [this.sanitizeUser(u1), this.sanitizeUser(u2)],
      participantIDs: [userId1, userId2],
      unreadCount: { [userId1]: 0, [userId2]: 0 },
      pinnedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.chats.set(chatId, newChat);
    this.messages.set(chatId, []);

    // Asynchronously save to Firestore permanent database
    firestore.collection('chats').doc(chatId).set(newChat).catch((err) => {
      console.warn('⚠️ Firestore getOrCreateChat sync notice:', err?.message || err);
    });

    return newChat;
  }

  public getOrCreateChat(userId1: string, userId2: string): Chat {
    for (const chat of this.chats.values()) {
      if (
        chat.participantIDs &&
        chat.participantIDs.includes(userId1) &&
        chat.participantIDs.includes(userId2) &&
        chat.participantIDs.length === 2 &&
        !chat.isGroup
      ) {
        return chat;
      }
    }

    const u1 = this.users.get(userId1);
    const u2 = this.users.get(userId2);
    if (!u1 || !u2) {
      throw new Error('User account not found');
    }

    const chatId = `chat_${userId1}_${userId2}_${Date.now()}`;
    const newChat: Chat = {
      id: chatId,
      participants: [this.sanitizeUser(u1), this.sanitizeUser(u2)],
      participantIDs: [userId1, userId2],
      unreadCount: { [userId1]: 0, [userId2]: 0 },
      pinnedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.chats.set(chatId, newChat);
    this.messages.set(chatId, []);

    // Asynchronously save to Firestore permanent database
    firestore.collection('chats').doc(chatId).set(newChat).catch((err) => {
      console.warn('⚠️ Firestore getOrCreateChat sync notice:', err?.message || err);
    });

    return newChat;
  }

  public togglePinChat(chatId: string, userId: string): boolean {
    const chat = this.chats.get(chatId);
    if (!chat) return false;

    if (chat.pinnedBy.includes(userId)) {
      chat.pinnedBy = chat.pinnedBy.filter((id) => id !== userId);
    } else {
      chat.pinnedBy.push(userId);
    }

    firestore.collection('chats').doc(chatId).set(chat, { merge: true }).catch(() => {});
    return chat.pinnedBy.includes(userId);
  }

  public deleteChat(chatId: string, userId: string): boolean {
    const chat = this.chats.get(chatId);
    if (!chat) return false;
    if (!chat.participantIDs.includes(userId)) return false;

    const msgs = this.messages.get(chatId) || [];
    for (const m of msgs) {
      firestore.collection('messages').doc(m.id).delete().catch(() => {});
    }

    this.chats.delete(chatId);
    this.messages.delete(chatId);

    firestore.collection('chats').doc(chatId).delete().catch(() => {});
    return true;
  }

  // Message methods
  public getMessages(chatId: string): Message[] {
    return this.messages.get(chatId) || [];
  }

  public createMessage(msgData: Omit<Message, 'id' | 'timestamp' | 'status'>): Message {
    const chatId = msgData.chatId;
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    const timer = msgData.disappearingTimer || chat.disappearingTimer;
    let expiresAtStr: string | undefined = msgData.expiresAt;

    if (timer && timer > 0 && !expiresAtStr) {
      expiresAtStr = new Date(Date.now() + timer * 1000).toISOString();
    }

    const newMsg: Message = {
      ...msgData,
      disappearingTimer: timer,
      expiresAt: expiresAtStr,
      id: 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    const list = this.messages.get(chatId) || [];
    list.push(newMsg);
    this.messages.set(chatId, list);

    chat.lastMessage = newMsg;
    chat.updatedAt = newMsg.timestamp;

    const receiverId = msgData.receiverID;
    if (receiverId) {
      chat.unreadCount[receiverId] = (chat.unreadCount[receiverId] || 0) + 1;
    }

    // Asynchronously save message and update chat in Firestore permanent database
    firestore.collection('messages').doc(newMsg.id).set(newMsg).catch((err) => {
      console.error('🔥 Firestore createMessage sync error:', err);
    });
    firestore.collection('chats').doc(chatId).set(chat).catch((err) => {
      console.error('🔥 Firestore updateChat sync error:', err);
    });

    return newMsg;
  }

  public checkAndCleanExpiredMessages(io?: any): void {
    const now = Date.now();

    for (const [chatId, msgs] of this.messages.entries()) {
      let modified = false;
      const remainingMsgs: Message[] = [];

      for (const msg of msgs) {
        if (msg.expiresAt && !msg.deleted) {
          const expireTime = new Date(msg.expiresAt).getTime();
          if (now >= expireTime) {
            msg.deleted = true;
            msg.text = '💥 Message self-destructed';
            msg.encryptedMessage = undefined;
            msg.mediaURL = undefined;
            msg.audioURL = undefined;
            msg.fileData = undefined;
            msg.locationData = undefined;
            modified = true;

            // Delete / update in Firestore
            firestore.collection('messages').doc(msg.id).delete().catch(() => {});

            if (io) {
              io.to(`chat_${chatId}`).emit('message_deleted', { chatId, messageId: msg.id, expired: true });
            }
          }
        }
        remainingMsgs.push(msg);
      }

      if (modified) {
        this.messages.set(chatId, remainingMsgs);
      }
    }
  }

  public markMessagesAsRead(chatId: string, userId: string): void {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.unreadCount[userId] = 0;
      firestore.collection('chats').doc(chatId).set(chat, { merge: true }).catch(() => {});
    }

    const msgs = this.messages.get(chatId) || [];
    let updated = false;
    msgs.forEach((m) => {
      if (m.receiverID === userId && m.status !== 'read') {
        m.status = 'read';
        updated = true;
        firestore.collection('messages').doc(m.id).set(m, { merge: true }).catch(() => {});
      }
    });
    if (updated) {
      this.messages.set(chatId, msgs);
    }
  }

  public deleteMessage(chatId: string, messageId: string, userId: string): boolean {
    const msgs = this.messages.get(chatId) || [];
    const msg = msgs.find((m) => m.id === messageId);
    if (!msg) return false;

    msg.deleted = true;
    msg.text = 'This message was deleted';
    msg.encryptedMessage = undefined;
    msg.mediaURL = undefined;

    this.messages.set(chatId, msgs);

    firestore.collection('messages').doc(messageId).set(msg, { merge: true }).catch(() => {});
    return true;
  }

  public editMessage(chatId: string, messageId: string, newText: string): Message | null {
    const msgs = this.messages.get(chatId) || [];
    const msg = msgs.find((m) => m.id === messageId);
    if (!msg || msg.deleted) return null;

    msg.text = newText;
    msg.edited = true;
    this.messages.set(chatId, msgs);

    firestore.collection('messages').doc(messageId).set(msg, { merge: true }).catch(() => {});
    return msg;
  }

  public reactToMessage(chatId: string, messageId: string, userId: string, emoji: string): Message | null {
    const msgs = this.messages.get(chatId) || [];
    const msg = msgs.find((m) => m.id === messageId);
    if (!msg || msg.deleted) return null;

    const reactions = msg.reactions ? { ...msg.reactions } : {};

    if (reactions[userId] === emoji) {
      // Toggle off if user taps same emoji again
      delete reactions[userId];
    } else {
      reactions[userId] = emoji;
    }

    msg.reactions = reactions;
    this.messages.set(chatId, msgs);

    firestore.collection('messages').doc(messageId).set({ reactions }, { merge: true }).catch((err) => {
      console.error('🔥 Firestore reactToMessage sync error:', err);
    });

    return msg;
  }

  // WhatsApp-style Backup & Restore methods
  public async exportUserBackup(userId: string) {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');

    const sanitizedUser = this.sanitizeUser(user);
    const userChats = this.getUserChats(userId);
    const allMessages: Message[] = [];

    userChats.forEach((c) => {
      const msgs = this.getMessages(c.id);
      allMessages.push(...msgs);
    });

    const backup = {
      app: 'Gossip',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      user: sanitizedUser,
      chats: userChats,
      messages: allMessages,
    };

    try {
      await firestore.collection('backups').doc(userId).set({
        userId,
        updatedAt: backup.createdAt,
        messageCount: allMessages.length,
        chatCount: userChats.length,
        backupData: JSON.stringify(backup),
      });
    } catch (err) {
      console.error('Failed to store cloud backup snapshot in Firestore:', err);
    }

    return backup;
  }

  public async getCloudBackupInfo(userId: string) {
    try {
      const doc = await firestore.collection('backups').doc(userId).get();
      if (!doc.exists) return null;
      const data = doc.data();
      return {
        updatedAt: data?.updatedAt,
        messageCount: data?.messageCount,
        chatCount: data?.chatCount,
      };
    } catch (err) {
      return null;
    }
  }

  public async restoreUserBackup(userId: string, backupJson: any) {
    if (!backupJson || !backupJson.messages || !backupJson.chats) {
      throw new Error('Invalid backup file format');
    }

    for (const chat of backupJson.chats) {
      this.chats.set(chat.id, chat);
      await firestore.collection('chats').doc(chat.id).set(chat).catch(() => {});
    }

    for (const msg of backupJson.messages) {
      const list = this.messages.get(msg.chatId) || [];
      if (!list.some((m) => m.id === msg.id)) {
        list.push(msg);
      }
      this.messages.set(msg.chatId, list);
      await firestore.collection('messages').doc(msg.id).set(msg).catch(() => {});
    }

    return {
      chatsRestored: backupJson.chats.length,
      messagesRestored: backupJson.messages.length,
    };
  }

  // Moments methods
  public async getMomentsAsync(currentUserId: string): Promise<Moment[]> {
    const list: Moment[] = [];
    const now = new Date().toISOString();

    for (const moment of this.moments.values()) {
      if (moment.expiresAt && moment.expiresAt < now) continue;
      if (moment.privacy === 'public' || moment.userId === currentUserId) {
        list.push(moment);
      }
    }

    try {
      const snap = await firestore.collection('moments').get();
      if (!snap.empty) {
        snap.forEach((docSnap) => {
          const m = docSnap.data() as Moment;
          if (m && m.id && (!m.expiresAt || m.expiresAt >= now)) {
            this.moments.set(m.id, m);
            if (m.privacy === 'public' || m.userId === currentUserId) {
              if (!list.some((existing) => existing.id === m.id)) {
                list.push(m);
              }
            }
          }
        });
      }
    } catch (err) {
      // Ignore Firestore read errors
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getMomentByIdAsync(momentId: string): Promise<Moment | undefined> {
    const cached = this.moments.get(momentId);
    if (cached) return cached;

    try {
      const docSnap = await firestore.collection('moments').doc(momentId).get();
      if (docSnap.exists) {
        const m = docSnap.data() as Moment;
        if (m && m.id) {
          this.moments.set(m.id, m);
          return m;
        }
      }
    } catch (err) {}
    return undefined;
  }

  public async createMomentAsync(
    userId: string,
    data: {
      mediaType: 'photo' | 'video' | 'audio' | 'text';
      mediaURL?: string;
      caption?: string;
      backgroundColor?: string;
      privacy: 'public' | 'private';
    }
  ): Promise<Moment> {
    const user = await this.getUserByIdAsync(userId);
    if (!user) throw new Error('User not found');

    const id = 'mom_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const newMoment: Moment = {
      id,
      userId,
      user: this.sanitizeUser(user),
      mediaType: data.mediaType,
      mediaURL: data.mediaURL,
      caption: data.caption,
      backgroundColor: data.backgroundColor || '#0b0f19',
      privacy: data.privacy,
      views: [userId],
      createdAt: now.toISOString(),
      expiresAt,
    };

    this.moments.set(id, newMoment);

    firestore.collection('moments').doc(id).set(newMoment).catch((err) => {
      console.warn('🔥 Firestore moment create sync warning:', err?.message || err);
    });

    return newMoment;
  }

  public async deleteMomentAsync(momentId: string, userId: string): Promise<boolean> {
    const moment = this.moments.get(momentId);
    if (!moment) return false;
    if (moment.userId !== userId) return false;

    this.moments.delete(momentId);
    firestore.collection('moments').doc(momentId).delete().catch(() => {});
    return true;
  }

  public async recordMomentViewAsync(momentId: string, userId: string): Promise<Moment | null> {
    const moment = await this.getMomentByIdAsync(momentId);
    if (!moment) return null;

    if (!moment.views.includes(userId)) {
      moment.views.push(userId);
      this.moments.set(momentId, moment);
      firestore.collection('moments').doc(momentId).set(moment).catch(() => {});
    }
    return moment;
  }

  // Media Room Methods
  public async getMediaRoomsAsync(currentUserId?: string): Promise<MediaRoom[]> {
    const allRooms: MediaRoom[] = Array.from(this.mediaRooms.values());
    try {
      const snap = await firestore.collection('media_rooms').get();
      snap.forEach((doc) => {
        const room = doc.data() as MediaRoom;
        if (room && room.id) {
          this.mediaRooms.set(room.id, room);
          if (!allRooms.some((r) => r.id === room.id)) {
            allRooms.push(room);
          }
        }
      });
    } catch (e) {}

    const list: MediaRoom[] = [];
    for (const room of allRooms) {
      const isPublic = room.privacy === 'public' || !room.privacy;
      const isHost = currentUserId && room.hostId === currentUserId;
      const isParticipant = currentUserId && room.participants && room.participants.some((p) => p && p.id === currentUserId);
      if (isPublic || isHost || isParticipant) {
        list.push(room);
      }
    }

    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public async getMediaRoomByIdAsync(roomId: string): Promise<MediaRoom | undefined> {
    const cached = this.mediaRooms.get(roomId);
    if (cached) return cached;
    try {
      const doc = await firestore.collection('media_rooms').doc(roomId).get();
      if (doc.exists) {
        const room = doc.data() as MediaRoom;
        if (room && room.id) {
          this.mediaRooms.set(room.id, room);
          return room;
        }
      }
    } catch (e) {}
    return undefined;
  }

  public async createMediaRoomAsync(
    userId: string,
    data: {
      name: string;
      mediaType: 'youtube' | 'shorts' | 'reels' | 'audio' | 'screenshare' | 'custom_video';
      mediaUrl: string;
      title?: string;
      privacy?: 'public' | 'private';
    }
  ): Promise<MediaRoom> {
    const user = await this.getUserByIdAsync(userId);
    if (!user) throw new Error('User not found');

    let id = String(Math.floor(100000 + Math.random() * 900000));
    while (this.mediaRooms.has(id)) {
      id = String(Math.floor(100000 + Math.random() * 900000));
    }
    const hostUser = this.sanitizeUser(user);

    const newRoom: MediaRoom = {
      id,
      name: data.name || `${user.name}'s Watch Room`,
      hostId: userId,
      hostUser,
      mediaType: data.mediaType || 'youtube',
      mediaUrl: data.mediaUrl || 'https://www.youtube.com/watch?v=5qap5aO4i9A',
      title: data.title || 'Lofi Beats / Live Stream',
      isPlaying: true,
      currentTime: 0,
      updatedAt: new Date().toISOString(),
      participants: [hostUser],
      chatMessages: [],
      isScreenSharing: data.mediaType === 'screenshare',
      screenShareHostId: data.mediaType === 'screenshare' ? userId : undefined,
      privacy: data.privacy || 'private',
    };

    this.mediaRooms.set(id, newRoom);
    firestore.collection('media_rooms').doc(id).set(newRoom).catch(() => {});
    return newRoom;
  }

  public async updateMediaRoomMediaAsync(
    roomId: string,
    userId: string,
    data: {
      mediaType: 'youtube' | 'shorts' | 'reels' | 'audio' | 'screenshare' | 'custom_video';
      mediaUrl: string;
      title?: string;
    }
  ): Promise<MediaRoom | null> {
    const room = await this.getMediaRoomByIdAsync(roomId);
    if (!room) return null;

    room.mediaType = data.mediaType;
    room.mediaUrl = data.mediaUrl;
    if (data.title) room.title = data.title;
    room.isPlaying = true;
    room.currentTime = 0;
    room.updatedAt = new Date().toISOString();
    room.isScreenSharing = data.mediaType === 'screenshare';
    room.screenShareHostId = data.mediaType === 'screenshare' ? userId : undefined;

    this.mediaRooms.set(roomId, room);
    firestore.collection('media_rooms').doc(roomId).set(room, { merge: true }).catch(() => {});
    return room;
  }

  public async updateMediaRoomPlaybackAsync(
    roomId: string,
    isPlaying: boolean,
    currentTime: number
  ): Promise<MediaRoom | null> {
    const room = await this.getMediaRoomByIdAsync(roomId);
    if (!room) return null;

    room.isPlaying = isPlaying;
    room.currentTime = currentTime;
    room.updatedAt = new Date().toISOString();

    this.mediaRooms.set(roomId, room);
    firestore.collection('media_rooms').doc(roomId).set(room, { merge: true }).catch(() => {});
    return room;
  }

  public async joinMediaRoomAsync(roomId: string, userId: string): Promise<MediaRoom | null> {
    const room = await this.getMediaRoomByIdAsync(roomId);
    if (!room) return null;

    const user = await this.getUserByIdAsync(userId);
    if (!user) return room;

    const sanitized = this.sanitizeUser(user);
    if (!room.participants.some((p) => p.id === userId)) {
      room.participants.push(sanitized);
      this.mediaRooms.set(roomId, room);
      firestore.collection('media_rooms').doc(roomId).set(room, { merge: true }).catch(() => {});
    }
    return room;
  }

  public async leaveMediaRoomAsync(roomId: string, userId: string): Promise<MediaRoom | null> {
    const room = await this.getMediaRoomByIdAsync(roomId);
    if (!room) return null;

    room.participants = room.participants.filter((p) => p.id !== userId);
    this.mediaRooms.set(roomId, room);
    firestore.collection('media_rooms').doc(roomId).set(room, { merge: true }).catch(() => {});
    return room;
  }

  public async addMediaRoomChatMessageAsync(
    roomId: string,
    userId: string,
    text: string
  ): Promise<RoomChatMessage | null> {
    const room = await this.getMediaRoomByIdAsync(roomId);
    if (!room) return null;

    const user = await this.getUserByIdAsync(userId);
    if (!user) return null;

    const chatMsg: RoomChatMessage = {
      id: 'rmsg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      roomId,
      sender: this.sanitizeUser(user),
      text,
      timestamp: new Date().toISOString(),
    };

    room.chatMessages = room.chatMessages || [];
    room.chatMessages.push(chatMsg);
    // Keep last 100 messages
    if (room.chatMessages.length > 100) {
      room.chatMessages = room.chatMessages.slice(-100);
    }

    this.mediaRooms.set(roomId, room);
    firestore.collection('media_rooms').doc(roomId).set(room, { merge: true }).catch(() => {});
    return chatMsg;
  }

  public async deleteMediaRoomAsync(roomId: string, userId: string): Promise<boolean> {
    const room = await this.getMediaRoomByIdAsync(roomId);
    if (!room) return false;
    if (room.hostId !== userId) return false;

    this.mediaRooms.delete(roomId);
    firestore.collection('media_rooms').doc(roomId).delete().catch(() => {});
    return true;
  }
}

export const dbStore = new DatabaseStore();

