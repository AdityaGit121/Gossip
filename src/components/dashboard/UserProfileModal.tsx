import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Phone,
  Copy,
  Check,
  Database,
  Download,
  Upload,
  Cloud,
  RefreshCw,
  Save,
  ShieldCheck,
  Camera,
  Eye,
  EyeOff,
  QrCode,
  Share2,
  Sparkles,
  KeyRound,
  Lock,
  AlertCircle,
  AtSign,
  Trash2,
  FileKey,
  ShieldAlert,
  Key,
  Unlock,
  Activity,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.js';
import { DeleteAccountModal } from './DeleteAccountModal.tsx';
import { encryptBackup, decryptBackup, EncryptedBackupBundle } from '../../services/cryptoBackup.ts';
import { ApplicationAnalyzer } from './ApplicationAnalyzer.tsx';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'security' | 'qrcode' | 'backup' | 'diagnostics';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'profile',
}) => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'qrcode' | 'backup' | 'diagnostics'>(initialTab);
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || user?.contactNumber || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [showUserId, setShowUserId] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedQrLink, setCopiedQrLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Security Customization State
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [securityPin, setSecurityPin] = useState(user?.securityPin || '123456');

  // Backup states
  const [backupInfo, setBackupInfo] = useState<{ updatedAt: string; messageCount: number; chatCount: number } | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dpInputRef = useRef<HTMLInputElement>(null);

  // AES Encrypted Offline Backup states
  const [encExportPassword, setEncExportPassword] = useState('');
  const [showEncExportPassword, setShowEncExportPassword] = useState(false);
  const [encRestorePassword, setEncRestorePassword] = useState('');
  const [showEncRestorePassword, setShowEncRestorePassword] = useState(false);
  const [pendingEncryptedBundle, setPendingEncryptedBundle] = useState<EncryptedBackupBundle | null>(null);
  const [isDecryptModalOpen, setIsDecryptModalOpen] = useState(false);
  const encFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setName(user.name);
      setPhoneNumber(user.phoneNumber || user.contactNumber || '');
      setUsername(user.username);
      setBio(user.bio || '');
      setProfilePicture(user.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`);
      setSecurityPin(user.securityPin || '123456');
      setNewPassword('');
      loadBackupInfo();
    }
  }, [isOpen, user]);

  const loadBackupInfo = async () => {
    try {
      const res = await api.getBackupInfo();
      setBackupInfo(res.backupInfo);
    } catch (err) {
      console.error('Failed to load backup info:', err);
    }
  };

  if (!isOpen || !user) return null;

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(user.userID);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyQrLink = () => {
    const chatLink = `${window.location.origin}/?chatWith=${user.userID}`;
    navigator.clipboard.writeText(chatLink);
    setCopiedQrLink(true);
    setTimeout(() => setCopiedQrLink(false), 2000);
  };

  // Image file reader for custom DP upload
  const handleDpFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please select a valid image file for your profile picture.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress/resize image via Canvas to fit lightweight storage
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setProfilePicture(compressedDataUrl);
          setMessage('Custom DP preview ready. Click "Save Profile" to apply!');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await api.updateProfile({
        name,
        phoneNumber,
        contactNumber: phoneNumber,
        username,
        bio,
        profilePicture,
        securityPin,
        newPassword: newPassword || undefined,
      });
      updateUser(res.user);
      setMessage('✅ Profile & Security Settings updated successfully!');
      setNewPassword('');
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      setMessage('❌ Failed to update profile: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    setBackupMessage(null);

    try {
      const { backup } = await api.exportBackup();
      
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `convo_backup_${user.userID}_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupMessage('✅ Backup JSON generated & saved to your local storage! Compatible with all future app updates & extensions.');
      await loadBackupInfo();
    } catch (err: any) {
      setBackupMessage('❌ Failed to create backup: ' + err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupLoading(true);
    setBackupMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        if (jsonContent && jsonContent.type === 'CONVO_AES_ENCRYPTED_BACKUP') {
          // Encrypted file selected -> open decrypt password modal
          setPendingEncryptedBundle(jsonContent);
          setIsDecryptModalOpen(true);
          setBackupLoading(false);
          return;
        }

        const res = await api.restoreBackup(jsonContent);
        setBackupMessage(`✅ Portable restore complete! Restored ${res.chatsRestored} chats & ${res.messagesRestored} messages across local & cloud stores.`);
        await loadBackupInfo();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        setBackupMessage('❌ Invalid backup file format: ' + err.message);
      } finally {
        setBackupLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateEncryptedBackup = async () => {
    if (!encExportPassword || encExportPassword.trim().length < 4) {
      setBackupMessage('❌ Master encryption password must be at least 4 characters long.');
      return;
    }

    setBackupLoading(true);
    setBackupMessage(null);

    try {
      const { backup } = await api.exportBackup();
      const encryptedBundle = await encryptBackup(backup, encExportPassword.trim(), user.userID);
      
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(encryptedBundle, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `gossip_encrypted_backup_${user.userID}_${new Date().toISOString().slice(0,10)}.enc.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupMessage('🔒 AES-256 Encrypted Backup successfully created! Keep your password safe.');
      setEncExportPassword('');
      await loadBackupInfo();
    } catch (err: any) {
      setBackupMessage('❌ Failed to create encrypted backup: ' + err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleConfirmDecryptAndRestore = async () => {
    if (!pendingEncryptedBundle) return;
    if (!encRestorePassword) {
      setBackupMessage('❌ Please enter the password to decrypt this backup file.');
      return;
    }

    setBackupLoading(true);
    setBackupMessage(null);

    try {
      const decryptedBackup = await decryptBackup(pendingEncryptedBundle, encRestorePassword);
      const res = await api.restoreBackup(decryptedBackup);
      setBackupMessage(`🔐 Decrypted & restored ${res.chatsRestored} chats & ${res.messagesRestored} messages successfully!`);
      setIsDecryptModalOpen(false);
      setPendingEncryptedBundle(null);
      setEncRestorePassword('');
      await loadBackupInfo();
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setBackupMessage('❌ Decryption failed: ' + (err.message || 'Incorrect password or corrupted file.'));
    } finally {
      setBackupLoading(false);
    }
  };

  const avatarPresets = [
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
    `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`,
    `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`,
    `https://api.dicebear.com/7.x/micah/svg?seed=${user.username}`,
    `https://api.dicebear.com/7.x/personas/svg?seed=${user.username}`,
  ];

  const qrShareUrl = `${window.location.origin}/?chatWith=${user.userID}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg overflow-hidden bg-[#0f1116] border border-[#00e5ff]/30 rounded-2xl shadow-2xl text-white font-sans flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 pb-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-[#00e5ff]">
                {activeTab === 'profile' ? (
                  <User className="w-6 h-6" />
                ) : activeTab === 'qrcode' ? (
                  <QrCode className="w-6 h-6" />
                ) : (
                  <Database className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-light text-white tracking-tight">User Account & Privacy</h3>
                <p className="text-xs font-mono text-white/40">ID_MASKING_&_ENCRYPTED_DP</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/10 space-x-3 text-xs font-mono overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`pb-2 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'border-[#00e5ff] text-[#00e5ff]'
                    : 'border-transparent text-white/50 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>PROFILE_&_DP</span>
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`pb-2 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                  activeTab === 'security'
                    ? 'border-[#00e5ff] text-[#00e5ff]'
                    : 'border-transparent text-white/50 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SECURITY_&_LOGIN</span>
              </button>
              <button
                onClick={() => setActiveTab('qrcode')}
                className={`pb-2 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                  activeTab === 'qrcode'
                    ? 'border-[#00e5ff] text-[#00e5ff]'
                    : 'border-transparent text-white/50 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>MY_QR_CODE</span>
              </button>
              <button
                onClick={() => setActiveTab('backup')}
                className={`pb-2 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                  activeTab === 'backup'
                    ? 'border-[#00e5ff] text-[#00e5ff]'
                    : 'border-transparent text-white/50 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>BACKUP</span>
              </button>
              <button
                onClick={() => setActiveTab('diagnostics')}
                className={`pb-2 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                  activeTab === 'diagnostics'
                    ? 'border-[#00e5ff] text-[#00e5ff]'
                    : 'border-transparent text-white/50 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span>DIAGNOSTICS</span>
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto space-y-5">
            {activeTab === 'profile' ? (
              <>
                {/* DP Avatar Upload & Preview */}
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="relative group cursor-pointer" onClick={() => dpInputRef.current?.click()}>
                    <img
                      src={profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                      alt={user.name}
                      className="w-24 h-24 rounded-3xl object-cover border-2 border-[#00e5ff]/50 shadow-[0_0_20px_rgba(0,229,255,0.3)] bg-slate-900 transition-all group-hover:opacity-80"
                    />
                    <div className="absolute inset-0 bg-black/50 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Camera className="w-6 h-6 text-[#00e5ff]" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 p-2 bg-[#00e5ff] text-black rounded-xl shadow-lg border border-black/50">
                      <Camera className="w-4 h-4" />
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={dpInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleDpFileChange}
                  />

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => dpInputRef.current?.click()}
                      className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-[#00e5ff] rounded-lg text-xs font-mono font-medium hover:bg-cyan-500/20 transition-all"
                    >
                      Upload Custom DP
                    </button>
                  </div>

                  {/* Preset Avatars quick selection */}
                  <div className="flex items-center space-x-2 pt-1">
                    <span className="text-[10px] font-mono text-white/40">PRESETS:</span>
                    {avatarPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProfilePicture(preset)}
                        className={`w-7 h-7 rounded-xl border overflow-hidden transition-all ${
                          profilePicture === preset
                            ? 'border-[#00e5ff] scale-110 shadow-[0_0_10px_rgba(0,229,255,0.5)]'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <img src={preset} alt="preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hidden User ID Display Box */}
                <div className="p-4 bg-[#0b0c10] border border-[#00e5ff]/30 rounded-2xl text-center space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-white/50 font-mono flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#00e5ff]" />
                      <span>USER_ID_SECURED</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowUserId(!showUserId)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30"
                    >
                      {showUserId ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showUserId ? 'HIDE_ID' : 'REVEAL_ID'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-center space-x-2 py-1">
                    <span className="text-xl font-mono font-bold text-[#00e5ff] tracking-wider">
                      {showUserId ? user.userID : 'USR-••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUserId}
                      className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border border-white/10 rounded-lg transition-colors"
                      title="Copy User ID"
                    >
                      {copiedId ? <Check className="w-4 h-4 text-[#00e5ff]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40 font-mono">
                    User ID is hidden on direct screen. Share via QR Code or copy button.
                  </p>
                </div>

                {message && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-mono">
                    {message}
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block mb-1 text-xs font-mono text-white/60">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-mono text-white/60">Contact Number (Phone)</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00e5ff]" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g. +1 555 123 4567"
                        className="w-full pl-9 pr-3 py-2 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white outline-none font-mono tracking-wider"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-mono text-white/60">Bio / About</label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Cybersecurity Enthusiast & Convo User..."
                      className="w-full px-3 py-2 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white outline-none resize-none"
                    />
                  </div>

                  <div className="p-3 bg-[#0b0c10] border border-white/10 rounded-xl text-xs text-white/40 space-y-1 font-mono">
                    <div className="font-semibold text-white/70">OPERATIVE_INFO:</div>
                    <div>Contact: <span className="text-white/80">{user.phoneNumber || user.contactNumber || 'Not configured'}</span></div>
                    <div>Email: <span className="text-white/80">{user.email}</span></div>
                    <div>Username: <span className="text-white/80">@{user.username}</span></div>
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 font-mono text-xs rounded-xl transition-all border border-white/10"
                    >
                      CLOSE
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 px-4 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold font-mono rounded-xl text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50 shadow-[0_4px_16px_rgba(0,229,255,0.2)]"
                    >
                      <Save className="w-4 h-4" />
                      <span>{loading ? 'SAVING...' : 'SAVE_PROFILE'}</span>
                    </button>
                  </div>
                </form>
              </>
            ) : activeTab === 'security' ? (
              /* Security & Customizable Login Methods Tab */
              <div className="space-y-6">
                <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center space-x-3 text-xs font-mono">
                  <ShieldCheck className="w-6 h-6 text-[#00e5ff] shrink-0" />
                  <div>
                    <div className="text-white font-bold">PIN & PASSWORD SECURITY HUB</div>
                    <div className="text-white/60 text-[11px]">
                      Change your Username, PIN, and Password anytime.
                    </div>
                  </div>
                </div>

                {message && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-mono">
                    {message}
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-5">
                  {/* 1. Username Customization */}
                  <div className="p-4 bg-[#0b0c10] border border-white/10 rounded-2xl space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-mono text-[#00e5ff] font-bold">
                      <AtSign className="w-4 h-4" />
                      <span>CUSTOMIZE USERNAME (@handle)</span>
                    </div>
                    <p className="text-[11px] text-white/50 font-mono">
                      Your unique handle used for logins and user searches.
                    </p>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-white/40 font-mono text-xs">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="new_username"
                        className="w-full pl-7 pr-3 py-2 bg-black/40 border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* 2. Change Password */}
                  <div className="p-4 bg-[#0b0c10] border border-white/10 rounded-2xl space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-mono text-[#00e5ff] font-bold">
                      <Lock className="w-4 h-4" />
                      <span>CHANGE ACCOUNT PASSWORD</span>
                    </div>
                    <p className="text-[11px] text-white/50 font-mono">
                      Leave blank if you do not wish to change your main password.
                    </p>
                    <div className="relative flex items-center">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new account password"
                        className="w-full px-3 py-2 pr-10 bg-black/40 border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 text-white/40 hover:text-white"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 3. Customize 6-Digit PIN */}
                  <div className="p-4 bg-[#0b0c10] border border-white/10 rounded-2xl space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-mono text-[#00e5ff] font-bold">
                      <KeyRound className="w-4 h-4" />
                      <span>6-DIGIT SECURITY PIN</span>
                    </div>
                    <p className="text-[11px] text-white/50 font-mono">
                      Quick security PIN for fast app unlocking and login.
                    </p>
                    <input
                      type="text"
                      maxLength={6}
                      value={securityPin}
                      onChange={(e) => setSecurityPin(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 123456"
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-center font-mono tracking-widest text-[#00e5ff] text-base font-bold outline-none"
                    />
                  </div>

                  {/* Submit All Security Changes */}
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 font-mono text-xs rounded-xl transition-all border border-white/10"
                    >
                      CLOSE
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 px-4 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold font-mono rounded-xl text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50 shadow-[0_4px_16px_rgba(0,229,255,0.2)]"
                    >
                      <Save className="w-4 h-4" />
                      <span>{loading ? 'SAVING...' : 'SAVE SECURITY SETTINGS'}</span>
                    </button>
                  </div>

                  {/* Danger Zone: Delete Account & Entire Database Data */}
                  <div className="mt-6 pt-4 border-t border-rose-500/20 space-y-2">
                    <div className="text-xs font-mono font-bold text-rose-400 flex items-center space-x-1.5">
                      <Trash2 className="w-4 h-4" />
                      <span>DANGER ZONE: DELETE ACCOUNT</span>
                    </div>
                    <p className="text-[11px] text-white/50 font-mono">
                      Permanently erase your entire user record, profile, chats, and messages from the application database.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsDeleteAccountOpen(true)}
                      className="w-full py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-mono text-xs font-bold rounded-xl border border-rose-500/30 flex items-center justify-center space-x-2 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>DELETE MY ACCOUNT & ERASE ALL DATABASE DATA</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : activeTab === 'qrcode' ? (
              /* QR Code Share Tab */
              <div className="flex flex-col items-center justify-center space-y-5 py-2 text-center">
                <div className="p-4 bg-white rounded-3xl shadow-[0_0_40px_rgba(0,229,255,0.3)] border-4 border-[#00e5ff]/40 relative">
                  <QRCodeSVG
                    value={qrShareUrl}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#0b0f19"
                    level="H"
                    includeMargin={true}
                  />
                  <div className="mt-2 text-center">
                    <span className="text-[10px] font-mono text-slate-800 font-bold block">
                      CipherChat QR Pass
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">{user.name}</h4>
                  <p className="text-xs font-mono text-cyan-400">@{user.username}</p>
                  <p className="text-[11px] text-white/50 max-w-xs mx-auto">
                    Scanning this QR code or opening the link will instantly connect and start an encrypted chat with you.
                  </p>
                </div>

                <div className="w-full space-y-2.5 pt-2 font-mono">
                  <button
                    onClick={handleCopyQrLink}
                    className="w-full py-3 px-4 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-[0_4px_16px_rgba(0,229,255,0.25)]"
                  >
                    {copiedQrLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    <span>{copiedQrLink ? 'LINK COPIED TO CLIPBOARD!' : 'COPY DIRECT QR CHAT LINK'}</span>
                  </button>

                  <button
                    onClick={handleCopyUserId}
                    className="w-full py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border border-white/10 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all"
                  >
                    <Copy className="w-4 h-4 text-[#00e5ff]" />
                    <span>COPY USER ID CODE ({user.userID})</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Database & Backup Tab */
              <div className="space-y-5">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
                    <div>
                      <div className="text-xs font-mono font-bold text-emerald-300">Firebase Firestore Active</div>
                      <div className="text-[11px] text-white/50">All login credentials, chats, and messages are permanently saved.</div>
                    </div>
                  </div>
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>

                {backupMessage && (
                  <div className={`p-3 rounded-xl text-xs font-mono border ${
                    backupMessage.startsWith('✅') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    {backupMessage}
                  </div>
                )}

                <div className="p-4 bg-[#0b0c10] border border-white/10 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-white/70">
                    <span className="flex items-center space-x-1.5">
                      <Cloud className="w-4 h-4 text-[#00e5ff]" />
                      <span>CLOUD_DATABASE_BACKUP</span>
                    </span>
                    <button
                      onClick={loadBackupInfo}
                      className="p-1 hover:text-[#00e5ff] transition-colors"
                      title="Refresh status"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {backupInfo ? (
                    <div className="text-xs font-mono text-white/60 space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <div>Last Cloud Backup: <span className="text-[#00e5ff]">{new Date(backupInfo.updatedAt).toLocaleString()}</span></div>
                      <div>Backed Up Chats: <span className="text-white">{backupInfo.chatCount}</span></div>
                      <div>Backed Up Messages: <span className="text-white">{backupInfo.messageCount}</span></div>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-white/40 italic">No cloud backup created yet for this account.</div>
                  )}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleCreateBackup}
                    disabled={backupLoading}
                    className="w-full py-3 px-4 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold font-mono rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-[0_4px_16px_rgba(0,229,255,0.2)] disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{backupLoading ? 'CREATING BACKUP...' : 'BACKUP NOW (EXPORT & CLOUD SYNC)'}</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,.enc.json"
                    className="hidden"
                    onChange={handleRestoreFileSelected}
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={backupLoading}
                    className="w-full py-3 px-4 bg-white/[0.05] hover:bg-white/[0.1] text-white font-mono rounded-xl text-xs flex items-center justify-center space-x-2 transition-all border border-white/10 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 text-[#00e5ff]" />
                    <span>RESTORE FROM BACKUP FILE (.JSON / .ENC.JSON)</span>
                  </button>
                </div>

                {/* AES-256 Password Encrypted Offline Backup Section */}
                <div className="p-4 bg-cyan-950/20 border border-cyan-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-mono text-cyan-300 font-bold">
                    <FileKey className="w-4 h-4 text-[#00e5ff]" />
                    <span>AES-256 ENCRYPTED OFFLINE BACKUP</span>
                  </div>
                  <p className="text-[11px] text-white/60 font-mono leading-relaxed">
                    Download an AES-256-GCM password-protected copy of your chat history. Keeps your private data safe on USB drives or cloud storage.
                  </p>

                  <div className="space-y-2 pt-1">
                    <label className="text-[10px] font-mono text-white/50 block">Set Password for Export:</label>
                    <div className="relative">
                      <input
                        type={showEncExportPassword ? 'text' : 'password'}
                        value={encExportPassword}
                        onChange={(e) => setEncExportPassword(e.target.value)}
                        placeholder="Enter master encryption password..."
                        className="w-full px-3 py-2 bg-black/60 border border-cyan-500/30 focus:border-[#00e5ff] rounded-xl text-xs font-mono text-white placeholder-white/30 outline-none pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEncExportPassword(!showEncExportPassword)}
                        className="absolute right-3 top-2.5 text-white/40 hover:text-white"
                      >
                        {showEncExportPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateEncryptedBackup}
                      disabled={backupLoading || !encExportPassword.trim()}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-[0_4px_16px_rgba(0,229,255,0.2)] disabled:opacity-40"
                    >
                      <Lock className="w-3.5 h-3.5 text-black" />
                      <span>{backupLoading ? 'ENCRYPTING...' : 'DOWNLOAD AES ENCRYPTED BACKUP (.ENC.JSON)'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-[11px] text-white/40 font-mono">
                  💡 <span className="text-white/60">WhatsApp Backup Guarantee:</span> Even if your server is turned off, restarted, or redeployed, all your credentials and chat history are safely preserved in Firebase Firestore.
                </div>
              </div>
            )}

            {activeTab === 'diagnostics' && <ApplicationAnalyzer />}
          </div>
        </motion.div>

        {/* Delete Account Modal */}
        <DeleteAccountModal
          isOpen={isDeleteAccountOpen}
          onClose={() => setIsDeleteAccountOpen(false)}
        />

        {/* Password Decryption Modal */}
        <AnimatePresence>
          {isDecryptModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="relative w-full max-w-md bg-[#0f1116] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl text-white font-sans space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2 font-mono text-sm text-[#00e5ff] font-bold">
                    <Key className="w-5 h-5 text-[#00e5ff]" />
                    <span>UNLOCK ENCRYPTED BACKUP</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDecryptModalOpen(false);
                      setPendingEncryptedBundle(null);
                      setEncRestorePassword('');
                    }}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-white/70 font-mono leading-relaxed">
                  This backup file is encrypted with AES-256. Enter the master password used when exporting this backup:
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-[#00e5ff] block font-bold">DECRYPTION PASSWORD:</label>
                  <div className="relative">
                    <input
                      type={showEncRestorePassword ? 'text' : 'password'}
                      value={encRestorePassword}
                      onChange={(e) => setEncRestorePassword(e.target.value)}
                      placeholder="Enter decryption password..."
                      autoFocus
                      className="w-full px-3 py-2.5 bg-black/60 border border-cyan-500/40 focus:border-[#00e5ff] rounded-xl text-xs font-mono text-white placeholder-white/30 outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEncRestorePassword(!showEncRestorePassword)}
                      className="absolute right-3 top-3 text-white/40 hover:text-white"
                    >
                      {showEncRestorePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDecryptModalOpen(false);
                      setPendingEncryptedBundle(null);
                      setEncRestorePassword('');
                    }}
                    className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white/80 font-mono text-xs rounded-xl transition-all"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDecryptAndRestore}
                    disabled={backupLoading || !encRestorePassword}
                    className="flex-1 py-2.5 px-4 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-bold font-mono text-xs rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-40 shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{backupLoading ? 'DECRYPTING...' : 'DECRYPT & RESTORE'}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};
