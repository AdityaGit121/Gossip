import { Router, Response } from 'express';
import { dbStore } from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';

const router = Router();

/**
 * @route   GET /api/chats
 * @desc    Get all active chats for current user
 */
router.get('/chats', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const chats = dbStore.getUserChats(req.user.id);
    res.json({ chats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

/**
 * @route   POST /api/chats/start
 * @desc    Start or retrieve chat with a target user (via User ID e.g. USR-10293, username, email, or internal ID)
 */
router.post('/chats/start', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { targetUserID } = req.body;
    if (!targetUserID || typeof targetUserID !== 'string') {
      res.status(400).json({ error: 'Target User ID is required' });
      return;
    }

    const targetUser = await dbStore.findUserByIdentifierAsync(targetUserID);

    if (!targetUser) {
      res.status(404).json({ error: `User with ID or handle "${targetUserID}" not found.` });
      return;
    }

    if (targetUser.id === req.user.id) {
      res.status(400).json({ error: 'Cannot start chat with yourself.' });
      return;
    }

    const chat = await dbStore.getOrCreateChatAsync(req.user.id, targetUser.id);
    res.json({ chat });
  } catch (error: any) {
    console.error('Start chat error:', error);
    res.status(500).json({ error: error?.message || 'Failed to start conversation' });
  }
});

/**
 * @route   GET /api/users/search
 * @desc    Search users by name, username, email, or unique USR-XXXXX ID
 */
router.get('/users/search', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const query = (req.query.q as string) || '';
    if (!query.trim()) {
      res.json({ users: [] });
      return;
    }

    const users = await dbStore.searchUsersAsync(query, req.user.id);
    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * @route   POST /api/chats/:chatId/pin
 * @desc    Toggle pin status for a chat
 */
router.post('/chats/:chatId/pin', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { chatId } = req.params;
    const isPinned = dbStore.togglePinChat(chatId, req.user.id);
    res.json({ chatId, isPinned });
  } catch (error) {
    console.error('Pin chat error:', error);
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

/**
 * @route   DELETE /api/chats/:chatId
 * @desc    Delete a chat
 */
router.delete('/chats/:chatId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { chatId } = req.params;
    const success = dbStore.deleteChat(chatId, req.user.id);
    if (!success) {
      res.status(404).json({ error: 'Chat not found or unauthorized' });
      return;
    }
    res.json({ success: true, chatId });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

/**
 * @route   POST /api/chats/group
 * @desc    Create a multi-user group chat
 */
router.post('/chats/group', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { groupName, participantIDs } = req.body;
    if (!groupName || !participantIDs || !Array.isArray(participantIDs)) {
      res.status(400).json({ error: 'groupName and participantIDs array are required' });
      return;
    }

    const chat = dbStore.createGroupChat(groupName, participantIDs, req.user.id);
    res.json({ chat });
  } catch (error) {
    console.error('Create group chat error:', error);
    res.status(500).json({ error: 'Failed to create group chat' });
  }
});

/**
 * @route   POST /api/chats/:chatId/disappearing-timer
 * @desc    Set default disappearing timer for a chat
 */
router.post('/chats/:chatId/disappearing-timer', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { chatId } = req.params;
    const { seconds } = req.body;

    const chat = dbStore.setChatDisappearingTimer(chatId, Number(seconds) || 0);
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    res.json({ chat });
  } catch (error) {
    console.error('Set disappearing timer error:', error);
    res.status(500).json({ error: 'Failed to update disappearing timer' });
  }
});

export default router;
