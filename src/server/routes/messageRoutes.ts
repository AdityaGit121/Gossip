import { Router, Response } from 'express';
import { dbStore } from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';
import { caesarCipherEncrypt, caesarCipherDecrypt, hashPasskeySync, verifyPasskeySync } from '../../utils/caesarCipher.js';

const router = Router();

/**
 * @route   GET /api/chats/:chatId/messages
 * @desc    Get message history for a chat
 */
router.get('/chats/:chatId/messages', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { chatId } = req.params;
    dbStore.markMessagesAsRead(chatId, req.user.id);
    const messages = dbStore.getMessages(chatId);
    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * @route   POST /api/messages
 * @desc    Send a message (Supports Caesar Cipher Encryption)
 */
router.post('/messages', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      chatId,
      receiverID,
      messageType = 'text',
      text,
      encrypted = false,
      passkey,
      shiftValue = 5,
      mediaURL,
      replyTo,
    } = req.body;

    if (!chatId || !receiverID) {
      res.status(400).json({ error: 'chatId and receiverID are required' });
      return;
    }

    if (!text && !mediaURL) {
      res.status(400).json({ error: 'Message content or media is required' });
      return;
    }

    let finalMessageText = text || '';
    let encryptedText: string | undefined = undefined;
    let passkeyHash: string | undefined = undefined;

    if (encrypted) {
      if (!passkey) {
        res.status(400).json({ error: 'Passkey is required for message encryption.' });
        return;
      }

      // CRITICAL CORE FEATURE:
      // Encrypt plaintext using Caesar Cipher before saving
      const shift = Number(shiftValue) || 5;
      encryptedText = caesarCipherEncrypt(text, shift);

      // ONLY store the encrypted text in database as main content!
      finalMessageText = encryptedText;

      // Hash passkey so it can be verified securely upon decryption
      passkeyHash = hashPasskeySync(passkey);
    }

    const message = dbStore.createMessage({
      chatId,
      senderID: req.user.id,
      receiverID,
      messageType,
      text: finalMessageText,
      encryptedMessage: encryptedText,
      shiftValue: encrypted ? Number(shiftValue) || 5 : undefined,
      encrypted,
      passkeyHash,
      mediaURL,
      replyTo,
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * @route   POST /api/messages/:messageId/verify-passkey
 * @desc    Verify Passkey and Decrypt Caesar Cipher message
 */
router.post('/messages/:messageId/verify-passkey', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { passkey, chatId } = req.body;
    const { messageId } = req.params;

    if (!passkey || !chatId) {
      res.status(400).json({ error: 'Passkey and chatId are required' });
      return;
    }

    const messages = dbStore.getMessages(chatId);
    const msg = messages.find((m) => m.id === messageId);

    if (!msg) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    if (!msg.encrypted || !msg.passkeyHash || msg.shiftValue === undefined) {
      res.status(400).json({ error: 'Message is not encrypted or missing encryption parameters' });
      return;
    }

    // Verify passkey against stored hash
    const isValid = verifyPasskeySync(passkey, msg.passkeyHash);

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: 'Wrong Passkey - Access Denied',
      });
      return;
    }

    // Passkey matches! Decrypt message using Caesar Cipher
    const decryptedText = caesarCipherDecrypt(msg.text, msg.shiftValue);

    res.json({
      success: true,
      decryptedText,
    });
  } catch (error) {
    console.error('Verify passkey error:', error);
    res.status(500).json({ error: 'Failed to verify passkey' });
  }
});

/**
 * @route   DELETE /api/messages/:messageId
 * @desc    Delete message
 */
router.delete('/messages/:messageId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { messageId } = req.params;
    const { chatId } = req.body;

    if (!chatId) {
      res.status(400).json({ error: 'chatId is required' });
      return;
    }

    const success = dbStore.deleteMessage(chatId, messageId, req.user.id);
    if (!success) {
      res.status(404).json({ error: 'Message not found or not authorized' });
      return;
    }

    res.json({ messageId, success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

/**
 * @route   PUT /api/messages/:messageId
 * @desc    Edit message
 */
router.put('/messages/:messageId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { messageId } = req.params;
    const { chatId, newText } = req.body;

    if (!chatId || !newText) {
      res.status(400).json({ error: 'chatId and newText are required' });
      return;
    }

    const updatedMsg = dbStore.editMessage(chatId, messageId, newText);
    if (!updatedMsg) {
      res.status(404).json({ error: 'Message not found or cannot be edited' });
      return;
    }

    res.json({ message: updatedMsg });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

/**
 * @route   POST /api/messages/:messageId/react
 * @desc    Add or toggle emoji reaction on a message
 */
router.post('/messages/:messageId/react', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { messageId } = req.params;
    const { chatId, emoji } = req.body;

    if (!chatId || !emoji) {
      res.status(400).json({ error: 'chatId and emoji are required' });
      return;
    }

    const updatedMsg = dbStore.reactToMessage(chatId, messageId, req.user.id, emoji);
    if (!updatedMsg) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    res.json({ message: updatedMsg });
  } catch (error) {
    console.error('React message error:', error);
    res.status(500).json({ error: 'Failed to react to message' });
  }
});

export default router;
