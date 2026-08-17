import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gossip-secret-jwt-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    phoneNumber?: string;
    userID: string;
  };
}

export function generateToken(payload: { id: string; email?: string; phoneNumber?: string; userID: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access denied. No authentication token provided.' });
    return;
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as { id: string; email?: string; phoneNumber?: string; userID: string };
    req.user = verified;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
}
