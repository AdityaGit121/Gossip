export interface User {
  id: string;
  userID: string; // e.g. "USR-10293"
  name: string;
  username: string;
  phoneNumber?: string; // Contact number for auth & direct discovery
  contactNumber?: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  online: boolean;
  lastSeen?: string;
  createdAt: string;
  securityPin?: string;
  securityPinHash?: string;
  patternLock?: string;
  patternLockHash?: string;
  publicKeyJwk?: any;
  faceEnabled?: boolean;
  faceData?: string;
  biometricRegistered?: boolean;
  blockedUserIDs?: string[];
  grantedPermissions?: {
    camera: boolean;
    microphone: boolean;
    video: boolean;
    files: boolean;
    notifications: boolean;
    foregroundOnly: boolean;
  };
}

export interface MessageReply {
  id: string;
  senderName: string;
  text: string;
  encrypted: boolean;
}

export interface LocationData {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface FileData {
  fileName: string;
  fileSize: number;
  fileType: string;
  fileURL: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderID: string;
  receiverID: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'location' | 'file';
  text: string; // Stored encrypted text when encrypted is true, or plaintext when false
  encryptedMessage?: string;
  shiftValue?: number;
  encrypted: boolean;
  passkeyHash?: string; // Hashed passkey for decryption verification
  passkeyHint?: string;
  mediaURL?: string;
  audioURL?: string;
  audioDuration?: number; // seconds
  locationData?: LocationData;
  fileData?: FileData;
  disappearingTimer?: number; // seconds (e.g., 10, 60, 3600, 86400)
  expiresAt?: string; // ISO date string when message auto-destructs
  timestamp: string;
  edited?: boolean;
  deleted?: boolean;
  replyTo?: MessageReply;
  reactions?: Record<string, string>; // userId -> emoji
  status: 'sent' | 'delivered' | 'read';
}

export interface Chat {
  id: string;
  participants: User[];
  participantIDs: string[];
  isGroup?: boolean;
  groupName?: string;
  groupAdminID?: string;
  groupImage?: string;
  disappearingTimer?: number;
  lastMessage?: Message;
  unreadCount: Record<string, number>; // userId -> count
  pinnedBy: string[]; // list of userIDs who pinned this chat
  lockedBy?: string[]; // list of userIDs who locked this chat
  hiddenBy?: string[]; // list of userIDs who hid this chat
  requestStatus?: 'accepted' | 'pending' | 'declined';
  requestedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CallSession {
  chatId: string;
  isVideo: boolean;
  caller: User;
  targetUser?: User;
  status: 'ringing' | 'connected' | 'ended';
  isIncoming: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DecryptResult {
  success: boolean;
  plaintext?: string;
  error?: string;
}

export interface Moment {
  id: string;
  userId: string;
  user: User;
  mediaType: 'photo' | 'video' | 'audio' | 'text';
  mediaURL?: string;
  caption?: string;
  backgroundColor?: string;
  privacy: 'public' | 'private';
  views: string[]; // user IDs who viewed this
  createdAt: string;
  expiresAt: string;
  shareLink?: string;
}

export interface RoomChatMessage {
  id: string;
  roomId: string;
  sender: User;
  text: string;
  timestamp: string;
}

export interface MediaRoom {
  id: string;
  name: string;
  hostId: string;
  hostUser: User;
  mediaType: 'youtube' | 'shorts' | 'reels' | 'audio' | 'screenshare' | 'custom_video';
  mediaUrl: string;
  title: string;
  isPlaying: boolean;
  currentTime: number; // in seconds
  updatedAt: string;
  participants: User[];
  chatMessages: RoomChatMessage[];
  isScreenSharing?: boolean;
  screenShareHostId?: string;
  privacy?: 'public' | 'private';
}

