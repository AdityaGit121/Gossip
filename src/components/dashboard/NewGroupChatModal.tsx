import React, { useState, useEffect } from 'react';
import { Users, X, Search, Check, PlusCircle } from 'lucide-react';
import { useChat } from '../../context/ChatContext.tsx';
import { api } from '../../services/api.js';
import { User } from '../../types.js';

interface NewGroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewGroupChatModal: React.FC<NewGroupChatModalProps> = ({ isOpen, onClose }) => {
  const { createGroupChat } = useChat();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setGroupName('');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUserIds([]);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.searchUsers(searchQuery);
        setSearchResults(res.users);
      } catch (err) {
        console.error('Search users error:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const toggleSelectUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Please enter a group name.');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Please select at least one participant.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createGroupChat(groupName.trim(), selectedUserIds);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create group chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-[#0f1116] border border-white/10 rounded-2xl p-6 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-[#00e5ff]/10 text-[#00e5ff] rounded-2xl border border-[#00e5ff]/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Create Group Chat</h2>
            <p className="text-xs text-slate-400">Collaborate with multiple members in real-time</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Project Cipher Team"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#00e5ff]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Add Members ({selectedUserIds.length} selected)
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by contact #, name, or User ID..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00e5ff]"
              />
            </div>

            {/* Selected Pills */}
            {selectedUserIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 max-h-20 overflow-y-auto p-1 bg-slate-950 rounded-xl border border-white/5">
                {selectedUserIds.map((id) => (
                  <span
                    key={id}
                    onClick={() => toggleSelectUser(id)}
                    className="flex items-center space-x-1 px-2 py-1 bg-[#00e5ff]/20 border border-[#00e5ff]/30 text-[#00e5ff] rounded-lg text-xs font-mono cursor-pointer hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400 transition-colors"
                  >
                    <span>{id}</span>
                    <X className="w-3 h-3" />
                  </span>
                ))}
              </div>
            )}

            {/* Search Results List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {searchResults.length === 0 && searchQuery ? (
                <div className="text-center py-4 text-xs text-slate-500">No users found for "{searchQuery}"</div>
              ) : searchResults.length === 0 && !searchQuery ? (
                <div className="text-center py-4 text-xs text-slate-500">Type above to search users</div>
              ) : (
                searchResults.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleSelectUser(u.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors border ${
                        isSelected
                          ? 'bg-[#00e5ff]/10 border-[#00e5ff]/40 text-white'
                          : 'bg-slate-900/50 border-white/5 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-xs text-[#00e5ff]">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {u.phoneNumber || u.contactNumber ? `📞 ${u.phoneNumber || u.contactNumber}` : `@${u.username}`} • {u.userID}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-[#00e5ff] border-[#00e5ff] text-slate-950' : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#00e5ff] text-slate-950 font-bold rounded-xl hover:bg-[#00e5ff]/90 transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{loading ? 'Creating Group...' : 'Create Group Channel'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
