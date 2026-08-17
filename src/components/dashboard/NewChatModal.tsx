import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, UserPlus, Sparkles, UserCheck, QrCode, Link, Camera } from 'lucide-react';
import { useChat } from '../../context/ChatContext.tsx';
import { api } from '../../services/api.js';
import { User } from '../../types.js';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onOpenScanner }) => {
  const { startChatWithUser } = useChat();
  const [activeTab, setActiveTab] = useState<'search' | 'qr'>('search');
  const [searchInput, setSearchInput] = useState('');
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseAndConnect = async (inputStr: string) => {
    let rawCode = inputStr.trim();
    if (!rawCode) return;
    
    // ...

    if (rawCode.includes('chatWith=')) {
      const match = rawCode.match(/chatWith=([^&]+)/);
      if (match && match[1]) {
        rawCode = match[1];
      }
    }

    setError(null);
    setLoading(true);

    try {
      await startChatWithUser(rawCode);
      onClose();
    } catch (err: any) {
      // Fallback: perform search query
      try {
        const res = await api.searchUsers(rawCode);
        setSearchResults(res.users);
        if (res.users.length === 0) {
          setError(`No user found matching "${rawCode}". Please check the User ID or QR link.`);
        } else if (res.users.length === 1) {
          await startChatWithUser(res.users[0].userID);
          onClose();
          return;
        }
      } catch (searchErr: any) {
        setError(err.message || searchErr.message || 'Failed to locate user.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await parseAndConnect(searchInput);
  };

  const handleQrConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    await parseAndConnect(qrCodeInput);
  };

  const handleStartChat = async (targetUserID: string) => {
    try {
      setLoading(true);
      await startChatWithUser(targetUserID);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md p-6 overflow-hidden bg-[#0f1116] border border-[#00e5ff]/30 rounded-2xl shadow-2xl text-white font-sans"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-[#00e5ff]">
              {activeTab === 'search' ? <UserPlus className="w-6 h-6" /> : <QrCode className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-light text-white tracking-tight">Initiate Transmission</h3>
              <p className="text-xs font-mono text-white/40">CONNECT_VIA_ID_OR_QR_PASS</p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-white/10 space-x-5 text-xs font-mono mb-4">
            <button
              onClick={() => setActiveTab('search')}
              className={`pb-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'search'
                  ? 'border-[#00e5ff] text-[#00e5ff]'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>SEARCH_USER</span>
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`pb-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'qr'
                  ? 'border-[#00e5ff] text-[#00e5ff]'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>CONNECT_VIA_QR</span>
            </button>
          </div>

          {activeTab === 'search' ? (
            <>
              <form onSubmit={handleSearch} className="mb-4 space-y-2 font-mono">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00e5ff]" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Contact number (+1...), User ID, or name..."
                    className="w-full pl-9 pr-24 py-2.5 bg-[#0b0c10] border border-white/10 focus:border-[#00e5ff]/60 rounded-xl text-xs text-white placeholder-white/30 outline-none font-mono"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={loading || !searchInput.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold rounded-lg text-xs transition-all disabled:opacity-50 shadow-[0_2px_10px_rgba(0,229,255,0.2)]"
                  >
                    {loading ? '...' : 'SEARCH'}
                  </button>
                </div>
              </form>

              {/* Quick Demo Accounts Suggestions */}
              <div className="p-3 bg-[#0b0c10] border border-white/10 rounded-xl mb-4 text-xs space-y-2">
                <span className="text-[11px] text-white/50 font-mono flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#00e5ff]" />
                  <span>DEMO_OPERATIVES:</span>
                </span>
                <div className="flex flex-col space-y-1.5 font-mono">
                  <button
                    onClick={() => handleStartChat('USR-10293')}
                    className="p-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 rounded-lg text-left flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-white text-xs block">Alice Smith</span>
                      <span className="text-[10px] text-white/40">📞 +1 987-654-3210</span>
                    </div>
                    <span className="px-2 py-0.5 bg-cyan-500/15 text-[#00e5ff] font-mono text-[10px] font-medium rounded border border-cyan-500/30">
                      USR-10293
                    </span>
                  </button>

                  <button
                    onClick={() => handleStartChat('USR-48192')}
                    className="p-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 rounded-lg text-left flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-white text-xs block">Bob Jones</span>
                      <span className="text-[10px] text-white/40">📞 +1 987-654-3211</span>
                    </div>
                    <span className="px-2 py-0.5 bg-cyan-500/15 text-[#00e5ff] font-mono text-[10px] font-medium rounded border border-cyan-500/30">
                      USR-48192
                    </span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* QR Scanner & Link Tab */
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 bg-[#0b0c10] border border-white/10 rounded-xl text-center space-y-3">
                <QrCode className="w-10 h-10 text-[#00e5ff] mx-auto" />
                <p className="text-white/60">Launch the real-time scanner to connect with another operative instantly.</p>
                <button
                  onClick={() => {
                      onClose();
                      onOpenScanner();
                  }}
                  className="w-full py-3 bg-[#00e5ff] hover:bg-[#33ebff] text-black font-semibold rounded-xl text-xs transition-all shadow-[0_4px_16px_rgba(0,229,255,0.2)] flex items-center justify-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>LAUNCH QR SCANNER</span>
                </button>
              </div>

              <div className="p-3 bg-[#0b0c10] border border-white/10 rounded-xl text-[11px] text-white/40 space-y-1">
                <span className="text-white/70 font-bold block">💡 How QR Connect Works:</span>
                <p>
                  Operatives can share their QR Pass from Profile -&gt; MY_QR_CODE. Scanning immediately connects both devices in an encrypted chat room.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs mb-3">
              {error}
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pt-2 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-400">Search Results:</h4>
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleStartChat(user.userID)}
                  className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={user.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                      alt={user.name}
                      className="w-9 h-9 rounded-full object-cover bg-slate-800"
                    />
                    <div>
                      <h5 className="text-xs font-bold text-white">{user.name}</h5>
                      <span className="text-[10px] text-emerald-400 font-mono">{user.userID}</span>
                    </div>
                  </div>
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

