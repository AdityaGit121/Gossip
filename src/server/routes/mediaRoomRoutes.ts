import { Router, Response } from 'express';
import { dbStore } from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';

const router = Router();

/**
 * @route   GET /api/media-rooms
 * @desc    Get all active Watch Party / Media Rooms
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rooms = await dbStore.getMediaRoomsAsync(req.user?.id);
    res.json({ rooms });
  } catch (error: any) {
    console.error('Fetch media rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch media rooms' });
  }
});

/**
 * @route   GET /api/media-rooms/:id
 * @desc    Get specific media room
 */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const room = await dbStore.getMediaRoomByIdAsync(id);
    if (!room) {
      res.status(404).json({ error: 'Media room not found' });
      return;
    }
    // Check privacy access
    const isPublic = room.privacy === 'public' || !room.privacy;
    const isHost = req.user && room.hostId === req.user.id;
    const isParticipant = req.user && room.participants && room.participants.some(p => p && p.id === req.user.id);
    if (!isPublic && !isHost && !isParticipant) {
      res.status(403).json({ error: 'Access denied to private media room.' });
      return;
    }
    res.json({ room });
  } catch (error: any) {
    console.error('Fetch media room error:', error);
    res.status(500).json({ error: 'Failed to fetch media room' });
  }
});

/**
 * @route   POST /api/media-rooms
 * @desc    Create a new Watch Party / Media Room
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { name, mediaType, mediaUrl, title, privacy } = req.body;

    const newRoom = await dbStore.createMediaRoomAsync(req.user.id, {
      name,
      mediaType,
      mediaUrl,
      title,
      privacy,
    });

    res.status(201).json({ room: newRoom });
  } catch (error: any) {
    console.error('Create media room error:', error);
    res.status(500).json({ error: error.message || 'Failed to create media room' });
  }
});

/**
 * @route   PUT /api/media-rooms/:id/media
 * @desc    Update active media link or type in room (Host only)
 */
router.put('/:id/media', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const room = await dbStore.getMediaRoomByIdAsync(id);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.hostId !== req.user.id) {
      res.status(403).json({ error: 'Only the room host can change media.' });
      return;
    }

    const { mediaType, mediaUrl, title } = req.body;

    const updated = await dbStore.updateMediaRoomMediaAsync(id, req.user.id, {
      mediaType,
      mediaUrl,
      title,
    });

    if (!updated) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    res.json({ room: updated });
  } catch (error: any) {
    console.error('Update room media error:', error);
    res.status(500).json({ error: 'Failed to update media' });
  }
});

/**
 * @route   POST /api/media-rooms/:id/join
 */
router.post('/:id/join', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const room = await dbStore.joinMediaRoomAsync(id, req.user.id);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    res.json({ room });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to join room' });
  }
});

/**
 * @route   DELETE /api/media-rooms/:id
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const deleted = await dbStore.deleteMediaRoomAsync(id, req.user.id);

    if (!deleted) {
      res.status(403).json({ error: 'Only the host can delete this room' });
      return;
    }

    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

export default router;
