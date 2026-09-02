import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  MessageSquare, 
  Check, 
  Mail, 
  Phone, 
  Sparkles,
  Loader2,
  X
} from 'lucide-react';
import { UserProfile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getAllUsers, addContact, removeContact, isUserOnline, subscribeToAllUsers, getUserByUsernameOrEmail } from '../../services/userService';
import { Avatar } from '../common/Avatar';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getOrCreateConversation } from '../../services/chatService';

interface ContactsPageViewProps {
  onStartChat: (conversationId: string, recipient: UserProfile) => void;
}

export const ContactsPageView: React.FC<ContactsPageViewProps> = ({ onStartChat }) => {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useNotifications();
  const { colorConfig } = useTheme();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContactUsername, setNewContactUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [startingChatWith, setStartingChatWith] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAllUsers().then((all) => {
      setUsers(all.filter((u) => u.uid !== profile?.uid));
      setLoading(false);
    }).catch(() => {});

    const unsub = subscribeToAllUsers((all) => {
      setUsers(all.filter((u) => u.uid !== profile?.uid));
      setLoading(false);
    });

    return () => unsub();
  }, [profile?.uid]);

  const handleStartConversation = async (user: UserProfile) => {
    if (!profile) return;
    setStartingChatWith(user.uid);
    try {
      const conv = await getOrCreateConversation(profile.uid, user.uid);
      onStartChat(conv.id, user);
    } catch {
      showToast('error', 'Failed to open chat');
    } finally {
      setStartingChatWith(null);
    }
  };

  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newContactUsername.trim()) return;

    setIsAdding(true);
    try {
      const clean = newContactUsername.trim().toLowerCase();
      let targetUser = users.find((u) => u.username?.toLowerCase() === clean || u.email?.toLowerCase() === clean);

      if (!targetUser) {
        targetUser = (await getUserByUsernameOrEmail(clean)) || undefined;
      }

      if (!targetUser) {
        showToast('error', 'User not found with that username or email.');
        setIsAdding(false);
        return;
      }

      if (targetUser.uid === profile.uid) {
        showToast('error', 'You cannot add yourself as a contact.');
        setIsAdding(false);
        return;
      }

      await addContact(profile.uid, targetUser.uid);
      await refreshProfile();
      showToast('success', `Added ${targetUser.displayName} to contacts!`);
      setShowAddModal(false);
      setNewContactUsername('');
    } catch {
      showToast('error', 'Failed to add contact.');
    } finally {
      setIsAdding(false);
    }
  };

  const myContactIds = profile?.contacts || [];
  const contactsList = users.filter((u) => myContactIds.includes(u.uid) || true); // show discovered community & saved contacts

  const filtered = contactsList.filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.about?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-[#0b141a] text-slate-900 dark:text-slate-100 overflow-y-auto select-none transition-colors">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 border-b border-[#e9edef] dark:border-[#1f2c34] bg-[#f0f2f5] dark:bg-[#111b21] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Contacts</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {contactsList.length} total connections
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{ backgroundColor: colorConfig.primaryHex }}
          className="px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95 hover:opacity-90"
        >
          <UserPlus className="w-4 h-4 stroke-[2]" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-8 py-4 max-w-4xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search contacts by name or @username..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition"
          />
        </div>
      </div>

      {/* Contact Cards Grid */}
      <div className="px-8 py-2 max-w-4xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: colorConfig.primaryHex }} />
            <span className="text-xs">Loading contacts...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-2">
            <Users className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No contacts found</p>
            <p className="text-xs text-slate-500">
              Try searching with a different term or invite new friends.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((user) => {
              const isSaved = myContactIds.includes(user.uid);
              return (
                <div
                  key={user.uid}
                  className="p-4 rounded-2xl bg-[#f0f2f5]/70 dark:bg-[#111b21] hover:bg-[#e9edef] dark:hover:bg-[#19242b] border border-slate-200 dark:border-[#1f2c34] flex items-center justify-between gap-4 transition group shadow-xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar
                      src={user.photoURL}
                      name={user.displayName}
                      size="md"
                      isOnline={isUserOnline(user)}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {user.displayName}
                        </h3>
                        {isSaved && (
                          <span 
                            style={{ color: colorConfig.primaryHex, backgroundColor: `${colorConfig.primaryHex}20` }}
                            className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                          >
                            Saved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        @{user.username || 'user'}
                      </p>
                      {user.about && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 max-w-[200px]">
                          {user.about}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartConversation(user)}
                    disabled={startingChatWith === user.uid}
                    className="p-2.5 rounded-xl bg-white dark:bg-[#202c33] hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-700 dark:text-white border border-slate-200 dark:border-transparent transition cursor-pointer flex-shrink-0"
                    title="Send message"
                  >
                    {startingChatWith === user.uid ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4 stroke-[1.8]" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddContactSubmit}
            className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Contact</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1f2c34]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the exact username or email address of the person you want to add.
            </p>

            <input
              type="text"
              value={newContactUsername}
              onChange={(e) => setNewContactUsername(e.target.value)}
              placeholder="Username or user@example.com"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-[#202c33] border border-slate-200 dark:border-[#2a3942] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              required
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1f2c34] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAdding}
                style={{ backgroundColor: colorConfig.primaryHex }}
                className="px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 hover:opacity-95 cursor-pointer shadow-xs"
              >
                {isAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Add Contact</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

