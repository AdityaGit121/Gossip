import { Router, Response } from 'express';
import { dbStore } from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';

const router = Router();

/**
 * @route   GET /api/moments
 * @desc    Get public moments + user's own moments
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const moments = await dbStore.getMomentsAsync(req.user.id);
    res.json({ moments });
  } catch (error: any) {
    console.error('Fetch moments error:', error);
    res.status(500).json({ error: 'Failed to fetch moments' });
  }
});

/**
 * @route   GET /api/moments/:id
 * @desc    Get a specific moment by ID (allows direct link sharing access)
 */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const moment = await dbStore.getMomentByIdAsync(id);

    if (!moment) {
      res.status(404).json({ error: 'Moment not found or expired' });
      return;
    }

    res.json({ moment });
  } catch (error: any) {
    console.error('Fetch moment by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch moment' });
  }
});

/**
 * @route   POST /api/moments
 * @desc    Create a new status/story "Moment"
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { mediaType, mediaURL, caption, backgroundColor, privacy } = req.body;

    if (!mediaType) {
      res.status(400).json({ error: 'mediaType is required (photo, video, audio, text)' });
      return;
    }

    const newMoment = await dbStore.createMomentAsync(req.user.id, {
      mediaType,
      mediaURL,
      caption,
      backgroundColor,
      privacy: privacy === 'private' ? 'private' : 'public',
    });

    res.status(201).json({ moment: newMoment });
  } catch (error: any) {
    console.error('Create moment error:', error);
    res.status(500).json({ error: error.message || 'Failed to publish moment' });
  }
});

/**
 * @route   DELETE /api/moments/:id
 * @desc    Delete a moment owned by the current user
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const deleted = await dbStore.deleteMomentAsync(id, req.user.id);

    if (!deleted) {
      res.status(403).json({ error: 'Cannot delete moment or moment not found' });
      return;
    }

    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Delete moment error:', error);
    res.status(500).json({ error: 'Failed to delete moment' });
  }
});

/**
 * @route   POST /api/moments/:id/view
 * @desc    Record that current user viewed this moment
 */
router.post('/:id/view', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const moment = await dbStore.recordMomentViewAsync(id, req.user.id);

    if (!moment) {
      res.status(404).json({ error: 'Moment not found' });
      return;
    }

    res.json({ moment });
  } catch (error: any) {
    console.error('Record moment view error:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

export default router;
