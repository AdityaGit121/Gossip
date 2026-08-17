import { Router, Response } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { dbStore } from '../db.js';
import { authenticateToken, generateToken, AuthenticatedRequest } from '../auth.js';
import { firestore } from '../firestore.js';

const router = Router();

// In-memory challenge store (TTL 5 mins)
const challenges = new Map<string, { challenge: string; expires: number; userId?: string }>();

function cleanupChallenges() {
  const now = Date.now();
  for (const [key, val] of challenges.entries()) {
    if (val.expires < now) {
      challenges.delete(key);
    }
  }
}
setInterval(cleanupChallenges, 60000);

const getRPID = (req: any) => {
  const host = req.get('host') || 'localhost:3000';
  return host.split(':')[0];
};

const getOrigin = (req: any) => {
  return `${req.protocol}://${req.get('host')}`;
};

// 1. Register Options
router.post('/register/options', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const userWithHash = await dbStore.getUserByIdAsync(req.user.id);
    if (!userWithHash) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const rpID = getRPID(req);
    const options = await generateRegistrationOptions({
      rpName: 'Gossip Secure Chat',
      rpID,
      userID: new TextEncoder().encode(userWithHash.id),
      userName: userWithHash.email,
      userDisplayName: userWithHash.name,
      attestationType: 'none',
      authenticatorSelection: {
        userVerification: 'required',
        residentKey: 'preferred',
      },
    });

    challenges.set(userWithHash.id, { challenge: options.challenge, expires: Date.now() + 300000, userId: userWithHash.id });
    res.json(options);
  } catch (err: any) {
    console.error('WebAuthn register options error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate registration options' });
  }
});

// 2. Register Verify
router.post('/register/verify', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { response } = req.body;
    const challengeData = challenges.get(req.user.id);
    if (!challengeData) {
      res.status(400).json({ error: 'Challenge expired or not found' });
      return;
    }

    const rpID = getRPID(req);
    const expectedOrigin = getOrigin(req);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (verification.verified && verification.registrationInfo) {
      const regInfo = verification.registrationInfo as any;
      const credentialID = regInfo.credentialID || regInfo.credential?.id;
      const credentialPublicKey = regInfo.credentialPublicKey || regInfo.credential?.publicKey;
      const counter = regInfo.counter ?? regInfo.credential?.counter ?? 0;

      const credIdBase64 = Buffer.from(credentialID).toString('base64');
      const credPubKeyBase64 = Buffer.from(credentialPublicKey).toString('base64');

      const credential = {
        credentialID: credIdBase64,
        publicKey: credPubKeyBase64,
        counter,
        transports: response.response?.transports || [],
        userId: req.user.id,
      };

      await firestore.collection('webauthn_credentials').doc(credIdBase64).set(credential, { merge: true });
      dbStore.updateUserProfile(req.user.id, { biometricRegistered: true, faceEnabled: true });

      challenges.delete(req.user.id);
      res.json({ verified: true });
    } else {
      res.status(400).json({ error: 'Verification failed' });
    }
  } catch (err: any) {
    console.error('WebAuthn register verify error:', err);
    res.status(500).json({ error: err.message || 'Verification error' });
  }
});

// 3. Login Options
router.post('/login/options', async (req: any, res: Response) => {
  try {
    const { identifier, email } = req.body;
    const loginIdentifier = (identifier || email || '').trim();
    if (!loginIdentifier) {
      res.status(400).json({ error: 'Identifier required' });
      return;
    }

    const userWithHash = await dbStore.findUserByIdentifierAsync(loginIdentifier);
    if (!userWithHash) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const credsSnap = await firestore.collection('webauthn_credentials').where('userId', '==', userWithHash.id).get();
    if (credsSnap.empty) {
      res.status(400).json({ error: 'No biometric/passkey credential registered for this account.' });
      return;
    }

    const allowCredentials = credsSnap.docs.map((d: any) => {
      const data = d.data();
      return {
        id: Buffer.from(data.credentialID, 'base64') as any,
        type: 'public-key' as const,
        transports: data.transports || [],
      };
    });

    const rpID = getRPID(req);
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'required',
    });

    challenges.set(userWithHash.id, { challenge: options.challenge, expires: Date.now() + 300000, userId: userWithHash.id });
    res.json({ options, userId: userWithHash.id });
  } catch (err: any) {
    console.error('WebAuthn login options error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate authentication options' });
  }
});

// 4. Login Verify
router.post('/login/verify', async (req: any, res: Response) => {
  try {
    const { userId, response } = req.body;
    const challengeData = challenges.get(userId);
    if (!challengeData) {
      res.status(400).json({ error: 'Challenge expired or not found' });
      return;
    }

    const credIdBase64 = response.id;
    const credDoc = await firestore.collection('webauthn_credentials').doc(credIdBase64).get();
    if (!credDoc.exists) {
      res.status(400).json({ error: 'Credential not found' });
      return;
    }

    const credData = credDoc.data()!;
    if (credData.userId !== userId) {
      res.status(400).json({ error: 'Credential mismatch' });
      return;
    }

    const rpID = getRPID(req);
    const expectedOrigin = getOrigin(req);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: Buffer.from(credData.credentialID, 'base64'),
        publicKey: Buffer.from(credData.publicKey, 'base64'),
        counter: credData.counter,
        transports: credData.transports,
      },
      requireUserVerification: true,
    } as any);

    if (verification.verified) {
      const newCounter = verification.authenticationInfo.newCounter;
      await firestore.collection('webauthn_credentials').doc(credIdBase64).set({ counter: newCounter }, { merge: true });

      const userWithHash = await dbStore.getUserByIdAsync(userId);
      if (!userWithHash) {
        res.status(404).json({ error: 'User not found' });
      } else {
        dbStore.setUserOnline(userWithHash.id, true);
        const user = dbStore.sanitizeUser(userWithHash);
        const token = generateToken({ id: user.id, email: user.email, userID: user.userID });
        challenges.delete(userId);
        res.json({ token, user });
        return;
      }
    } else {
      res.status(400).json({ error: 'Biometric verification failed' });
    }
  } catch (err: any) {
    console.error('WebAuthn login verify error:', err);
    res.status(500).json({ error: err.message || 'Authentication error' });
  }
});

export default router;
