import { Router, Response } from 'express';
import { dbStore } from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';

const router = Router();

/**
 * @route   GET /api/backup/export
 * @desc    Export a full WhatsApp-style backup JSON of all chats and messages
 */
router.get('/export', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const backup = await dbStore.exportUserBackup(req.user.id);
    res.json({ backup });
  } catch (error) {
    console.error('Export backup error:', error);
    res.status(500).json({ error: 'Failed to generate backup' });
  }
});

/**
 * @route   GET /api/backup/info
 * @desc    Get cloud backup status info
 */
router.get('/info', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const info = await dbStore.getCloudBackupInfo(req.user.id);
    res.json({ backupInfo: info });
  } catch (error) {
    console.error('Get backup info error:', error);
    res.status(500).json({ error: 'Failed to retrieve backup info' });
  }
});

/**
 * @route   POST /api/backup/restore
 * @desc    Restore chats & messages from a backup JSON payload
 */
router.post('/restore', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { backupData } = req.body;
    if (!backupData) {
      res.status(400).json({ error: 'Backup data is required' });
      return;
    }

    const parsed = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
    const result = await dbStore.restoreUserBackup(req.user.id, parsed);

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

export default router;
