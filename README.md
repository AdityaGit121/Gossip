# Gossip 🔐
> Production-Ready Secure Real-Time Messaging Platform powered by End-to-End Encryption and Caesar Cipher Encryption.

Gossip is a modern secure real-time messaging application with manual Caesar Cipher message encryption and decryption capabilities, unique User IDs (`USR-XXXXX`), JWT authentication, bcrypt password hashing, Socket.IO real-time synchronization, and media sharing.

---

## 🌟 Key Features

### 1. Caesar Cipher Message Encryption (Core Feature)
- **Manual Implementation**: Pure TypeScript Caesar Cipher algorithm supporting Uppercase (`A-Z`), Lowercase (`a-z`), and Digits (`0-9`). Special characters and spaces remain untouched.
- **Encrypt Toggle**: Toggle encryption before sending any message. Specify a custom Passkey (e.g. `SECRET123`) and Shift Value (1-25).
- **Zero Plaintext Storage**: When encryption is enabled, **ONLY** the shifted encrypted text and passkey hash are saved in the database. Plaintext is never stored!
- **Recipient Decryption Modal**: Encrypted messages display as `🔒 Encrypted Message: QJXXFLJ YMJ...`. Clicking "Decrypt Message" prompts for the passkey. Validates against the stored bcrypt passkey hash.
- **Access Control**: Displays `Wrong Passkey - Access Denied` on invalid passkey attempt.

### 2. WhatsApp Web Dashboard & Real-Time Socket.IO
- **WhatsApp Web Layout**: Left sidebar with chat list, online indicators, unread counts, pinned chats, and right chat area.
- **Socket.IO Integration**: Instant real-time message delivery, typing status indicators (`... typing`), online/offline presence tracking, and double checkmark read receipts (`sent`, `delivered`, `read`).
- **Unique User ID System**: Users are assigned a unique 5-digit User ID (e.g., `USR-10293`) upon registration. Anyone can initiate a chat using this ID!

### 3. Media & Advanced Messaging
- **Media Attachments**: Support for image and video uploads with in-chat preview and lightbox modal.
- **Message Actions**: Delete message, edit message, reply to message, copy message text, and emoji support.
- **Search Capabilities**: Global user search by User ID/username and in-chat message content search.
- **Interactive Caesar Playground**: Embedded live laboratory to test shift values (1-25) and inspect character-by-character transformation matrix.

---

## 🏗️ Architecture & Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Motion (Framer Motion), Lucide Icons
- **Backend**: Node.js, Express.js, Socket.IO, JWT Authentication, bcryptjs
- **Persistence**: Server-backed memory/JSON datastore with pre-seeded test chats (Alice, Bob, Charlie)

---

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
The server starts on `http://0.0.0.0:3000` with Express + Socket.IO and Vite development middleware.

### Production Build
```bash
npm run build
npm start
```

---

## 🧪 Quick Test Demo Accounts

You can test immediately using pre-seeded accounts:

1. **Alice Smith**: `alice@cipherchat.com` (Password: `password123`) &bull; **User ID**: `USR-10293`
2. **Bob Jones**: `bob@cipherchat.com` (Password: `password123`) &bull; **User ID**: `USR-48192`
3. **Charlie Security**: `charlie@cipherchat.com` (Password: `password123`) &bull; **User ID**: `USR-77301`

*Try logging in as Alice, opening the chat with Bob, and clicking "Decrypt Message" on Bob's encrypted message using passkey `SECRET123`!*
