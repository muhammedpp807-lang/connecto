import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { searchUsers } from '../../services/userService';
import { Avatar } from '../common/Avatar';
import { Search, X, MessageSquarePlus, Loader2, UserCheck, Users } from 'lucide-react';
import { getOrCreateConversationId } from '../../services/chatService';

interface NewChatModalProps {
  currentUserId: string;
  onSelectUser: (conversationId: string, recipient: UserProfile) => void;
  onOpenCreateGroup?: () => void;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  currentUserId,
  onSelectUser,
  onOpenCreateGroup,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const users = await searchUsers(searchTerm, currentUserId);
        if (isCurrent) setResults(users);
      } catch (err) {
        console.error('User search error:', err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 200);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchTerm, currentUserId]);

  const handleStartChat = (user: UserProfile) => {
    const convId = getOrCreateConversationId(currentUserId, user.uid);
    onSelectUser(convId, user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-[#1e2530] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Start New Chat</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Search users on Connecto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Shortcut Banner */}
        {onOpenCreateGroup && (
          <button
            onClick={onOpenCreateGroup}
            className="mx-4 mt-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-3 text-left hover:bg-emerald-100/70 dark:hover:bg-emerald-950/70 transition group cursor-pointer"
          >
            <div className="p-2 rounded-xl bg-emerald-600 text-white flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                Create a New Group
              </h4>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Chat with multiple contacts at once
              </p>
            </div>
          </button>
        )}

        {/* Search Input */}
        <div className="p-4 border-b border-slate-100 dark:border-[#1e2530] bg-slate-50/50 dark:bg-[#0d1117]/50">
          <div className="flex items-center gap-2 bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] px-3.5 py-2.5 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/40 transition">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, username (@)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="bg-transparent text-sm w-full focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* User Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-[#1e2530]/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
              <span className="text-xs">Finding users...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-slate-400 px-4">
              <p className="text-sm font-medium text-slate-300">No users found</p>
              <p className="text-xs text-slate-500 mt-1">Try searching for another name or username.</p>
            </div>
          ) : (
            results.map((user) => (
              <button
                key={user.uid}
                onClick={() => handleStartChat(user)}
                className="w-full p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#0d1117] transition group text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={user.photoURL}
                    name={user.displayName}
                    size="md"
                    isOnline={user.isOnline}
                    showOnlineStatus
                  />
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {user.displayName}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      @{user.username} {user.about ? `• ${user.about}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition pl-2">
                  <UserCheck className="w-4 h-4" /> Chat
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
