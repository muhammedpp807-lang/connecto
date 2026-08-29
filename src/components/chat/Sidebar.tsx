import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Conversation, UserProfile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscribeToConversations } from '../../services/chatService';
import { getAllUsers } from '../../services/userService';
import { Avatar } from '../common/Avatar';
import { Logo } from '../common/Logo';
import { formatConversationDate } from '../../utils/dateUtils';
import { NewChatModal } from './NewChatModal';
import { CreateGroupModal } from './CreateGroupModal';
import { StatusBar } from '../status/StatusBar';
import { 
  MessageSquarePlus, 
  Users, 
  Settings, 
  ShieldCheck, 
  LogOut, 
  Search, 
  Sun, 
  Moon, 
  Image as ImageIcon, 
  FileText, 
  CheckCheck,
  User,
  Plus
} from 'lucide-react';

interface SidebarProps {
  onSelectConversation: (conversationId: string, recipient?: UserProfile, conversation?: Conversation) => void;
  selectedId: string | null;
}

type ChatFilter = 'all' | 'direct' | 'groups' | 'unread';

export const Sidebar: React.FC<SidebarProps> = ({ onSelectConversation, selectedId }) => {
  const { profile, logout, isAdmin } = useAuth();
  const { effectiveTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [recipientsMap, setRecipientsMap] = useState<Record<string, UserProfile>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time conversations list
  useEffect(() => {
    if (!profile) return;

    setLoading(false);

    const unsubscribe = subscribeToConversations(profile.uid, (convs) => {
      setConversations(convs);

      // Fast synchronous resolution from local store first
      const currentUsers = JSON.parse(localStorage.getItem('connecto_db_users') || '[]');
      const userMap: Record<string, UserProfile> = {};
      currentUsers.forEach((u: UserProfile) => {
        userMap[u.uid] = u;
      });

      const newRecipients: Record<string, UserProfile> = {};
      for (const conv of convs) {
        if (!conv.isGroup) {
          const otherUid = conv.participantIds.find((id) => id !== profile.uid) || conv.participantIds[0];
          if (otherUid && userMap[otherUid]) {
            newRecipients[conv.id] = userMap[otherUid];
          }
        }
      }
      setRecipientsMap(newRecipients);

      // Fetch users in background
      getAllUsers().then((allUsers) => {
        const fullMap: Record<string, UserProfile> = {};
        allUsers.forEach((u) => {
          fullMap[u.uid] = u;
        });

        const updatedRecipients: Record<string, UserProfile> = { ...newRecipients };
        for (const conv of convs) {
          if (!conv.isGroup) {
            const otherUid = conv.participantIds.find((id) => id !== profile.uid) || conv.participantIds[0];
            if (otherUid && fullMap[otherUid]) {
              updatedRecipients[conv.id] = fullMap[otherUid];
            }
          }
        }
        setRecipientsMap(updatedRecipients);
      }).catch(() => {});
    });

    return () => unsubscribe();
  }, [profile]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const unread = profile?.uid ? (c.unreadCount?.[profile.uid] || 0) : 0;

    // Type filter
    if (filter === 'direct' && c.isGroup) return false;
    if (filter === 'groups' && !c.isGroup) return false;
    if (filter === 'unread' && unread === 0) return false;

    // Search filter
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    if (c.isGroup) {
      const groupMatch = c.groupName?.toLowerCase().includes(term) || false;
      const msgMatch = c.lastMessage?.toLowerCase().includes(term) || false;
      return groupMatch || msgMatch;
    }

    const recipient = recipientsMap[c.id];
    const nameMatch = recipient?.displayName.toLowerCase().includes(term) || false;
    const userMatch = recipient?.username.toLowerCase().includes(term) || false;
    const msgMatch = c.lastMessage?.toLowerCase().includes(term) || false;
    return nameMatch || userMatch || msgMatch;
  });

  return (
    <aside className="w-full h-full flex flex-col bg-white dark:bg-[#0d1117] border-r border-slate-200 dark:border-[#1e2530] select-none transition-colors">
      {/* Top Header Bar */}
      <div className="h-16 px-4 border-b border-slate-200 dark:border-[#1e2530] flex items-center justify-between flex-shrink-0 bg-white/80 dark:bg-[#0d1117]/80 backdrop-blur-md">
        <Logo size="sm" showText />

        <div className="flex items-center gap-1">
          {/* New Group Button */}
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="p-2 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
            title="Create New Group"
            aria-label="Create group"
          >
            <Users className="w-5 h-5" />
          </button>

          {/* New 1-on-1 Chat */}
          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
            title="Start direct conversation"
            aria-label="Start new conversation"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#161b22] transition cursor-pointer"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {effectiveTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Admin link */}
          {isAdmin && (
            <Link
              to="/admin"
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-[#161b22] transition text-emerald-600 dark:text-emerald-400"
              title="Admin Portal"
              aria-label="Admin Portal"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </Link>
          )}

          {/* Settings */}
          <Link
            to="/settings"
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#161b22] transition"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Current User Quick Badge */}
      {profile && (
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-[#090d12]/80 border-b border-slate-100 dark:border-[#1e2530] flex items-center justify-between">
          <Link to="/profile" className="flex items-center gap-2.5 min-w-0 group">
            <Avatar
              src={profile.photoURL}
              name={profile.displayName}
              size="sm"
              isOnline={profile.isOnline}
              showOnlineStatus
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                {profile.displayName}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">@{profile.username}</p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition cursor-pointer"
            title="Sign out of Connecto"
            aria-label="Sign out of Connecto"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stories / Status Bar Row */}
      <StatusBar />

      {/* Search Filter Box */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#161b22] border border-transparent dark:border-[#1e2530] px-3 py-2 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/40 transition">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search chats, groups, messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#161b22] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#1e2530]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('direct')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              filter === 'direct'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#161b22] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#1e2530]'
            }`}
          >
            Direct
          </button>
          <button
            onClick={() => setFilter('groups')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
              filter === 'groups'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#161b22] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#1e2530]'
            }`}
          >
            <Users className="w-3 h-3" /> Groups
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              filter === 'unread'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#161b22] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#1e2530]'
            }`}
          >
            Unread
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 divide-y divide-slate-50 dark:divide-slate-800/30">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading chats...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {searchTerm ? 'No chats match your search' : 'No conversations found'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 shadow-xs transition"
              >
                New Chat
              </button>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 shadow-xs transition flex items-center gap-1"
              >
                <Users className="w-3 h-3" /> New Group
              </button>
            </div>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedId === conv.id;
            const unread = profile?.uid ? (conv.unreadCount?.[profile.uid] || 0) : 0;
            const isMeLastSender = profile?.uid && conv.lastSenderId === profile.uid;
            const isGroup = conv.isGroup;
            const recipient = recipientsMap[conv.id];

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id, recipient, conv)}
                className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? isGroup 
                      ? 'bg-emerald-50/90 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shadow-xs'
                      : 'bg-blue-50/90 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 shadow-xs'
                    : 'hover:bg-slate-50 dark:hover:bg-[#161b22]/60 border border-transparent'
                }`}
              >
                {/* Avatar */}
                {isGroup ? (
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center overflow-hidden">
                      {conv.groupAvatar?.startsWith('emoji:') ? (
                        <span className="text-xl">{conv.groupAvatar.replace('emoji:', '')}</span>
                      ) : conv.groupAvatar ? (
                        <img src={conv.groupAvatar} alt={conv.groupName} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-emerald-600 text-white border-2 border-white dark:border-[#0d1117]">
                      <Users className="w-2.5 h-2.5" />
                    </span>
                  </div>
                ) : (
                  <Avatar
                    src={recipient?.photoURL}
                    name={recipient?.displayName || 'Chat'}
                    size="md"
                    isOnline={recipient?.isOnline}
                    showOnlineStatus
                  />
                )}

                {/* Info & Last Message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4
                      className={`text-xs font-bold truncate ${
                        isSelected
                          ? isGroup
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isGroup ? conv.groupName : (recipient?.displayName || 'User')}
                    </h4>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 font-medium">
                      {formatConversationDate(conv.lastMessageAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate min-w-0">
                      {isMeLastSender && (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      )}
                      {conv.lastMessageType === 'image' && (
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      )}
                      {conv.lastMessageType === 'file' && (
                        <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      )}
                      <span className="truncate">
                        {conv.lastMessage || (isGroup ? 'Group created' : 'Started conversation')}
                      </span>
                    </div>

                    {/* Unread badge */}
                    {unread > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-white font-bold text-[10px] flex-shrink-0 shadow-xs ${
                          isGroup ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}
                      >
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* New 1-on-1 Chat Modal */}
      {showNewChatModal && profile && (
        <NewChatModal
          currentUserId={profile.uid}
          onSelectUser={(convId, user) => {
            onSelectConversation(convId, user);
          }}
          onOpenCreateGroup={() => {
            setShowNewChatModal(false);
            setShowCreateGroupModal(true);
          }}
          onClose={() => setShowNewChatModal(false)}
        />
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && profile && (
        <CreateGroupModal
          currentUserId={profile.uid}
          currentUserName={profile.displayName}
          onGroupCreated={(group) => {
            onSelectConversation(group.id, undefined, group);
          }}
          onClose={() => setShowCreateGroupModal(false)}
        />
      )}
    </aside>
  );
};
