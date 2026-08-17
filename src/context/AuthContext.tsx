import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.js';
import { api } from '../services/api.js';
import { initSocket, disconnectSocket } from '../services/socket.js';
import { generateKeyPair, exportPublicKeyJwk } from '../lib/e2ee.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (
    identifier: string,
    credentials: string | { password?: string; pin?: string; pattern?: string; faceScan?: boolean; biometric?: boolean }
  ) => Promise<void>;
  signup: (data: any) => Promise<User>;
  resetPasswordLogin: (payload: {
    target?: string;
    phoneNumber?: string;
    contactNumber?: string;
    email?: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<User>;
  logout: () => void;
  deleteAccount: (payload: { email?: string; contactNumber?: string; phoneNumber?: string; password?: string; pin?: string }) => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('gossip_token') || localStorage.getItem('convo_token') || localStorage.getItem('cipherchat_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.getMe();
        setUser(data.user);
        initSocket(token);
        setupE2EEKeys();
      } catch (error) {
        console.error('Session restore notice:', error);
        const savedOfflineUser = localStorage.getItem('gossip_offline_active_user') || localStorage.getItem('convo_offline_active_user');
        if (savedOfflineUser) {
          try {
            setUser(JSON.parse(savedOfflineUser));
          } catch (e) {
            setUser(null);
            setToken(null);
          }
        } else {
          localStorage.removeItem('gossip_token');
          localStorage.removeItem('convo_token');
          localStorage.removeItem('cipherchat_token');
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [token]);

  const setupE2EEKeys = async () => {
    try {
      let storedPub = localStorage.getItem('gossip_e2ee_pubkey') || localStorage.getItem('convo_e2ee_pubkey');
      if (!storedPub) {
        const kp = await generateKeyPair();
        const pubJwk = await exportPublicKeyJwk(kp.publicKey);
        localStorage.setItem('gossip_e2ee_pubkey', JSON.stringify(pubJwk));
        await api.updateProfile({ publicKeyJwk: pubJwk });
      }
    } catch (e) {}
  };

  const login = async (
    identifier: string,
    credentials: string | { password?: string; pin?: string; pattern?: string; faceScan?: boolean; biometric?: boolean }
  ) => {
    const credObj = typeof credentials === 'string' ? { password: credentials } : credentials;
    const res = await api.login(identifier, credObj);
    localStorage.setItem('gossip_token', res.token);
    setToken(res.token);
    setUser(res.user);
    initSocket(res.token);
    setupE2EEKeys();
  };

  const signup = async (data: any): Promise<User> => {
    const res = await api.signup(data);
    localStorage.setItem('gossip_token', res.token);
    setToken(res.token);
    setUser(res.user);
    initSocket(res.token);
    setupE2EEKeys();
    return res.user;
  };

  const resetPasswordLogin = async (payload: {
    target?: string;
    phoneNumber?: string;
    contactNumber?: string;
    email?: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<User> => {
    const res = await api.resetPasswordWithOtp(payload);
    localStorage.setItem('gossip_token', res.token);
    setToken(res.token);
    setUser(res.user);
    initSocket(res.token);
    setupE2EEKeys();
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('gossip_token');
    localStorage.removeItem('convo_token');
    localStorage.removeItem('cipherchat_token');
    disconnectSocket();
    setToken(null);
    setUser(null);
  };

  const deleteAccount = async (payload: { email?: string; contactNumber?: string; phoneNumber?: string; password?: string; pin?: string }) => {
    await api.deleteAccount(payload);
    logout();
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, resetPasswordLogin, logout, deleteAccount, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
