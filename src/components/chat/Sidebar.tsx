import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Conversation, UserProfile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscribeToConversations } from '../../services/chatService';
import { getAllUsers, isUserOnline, subscribeToAllUsers } from '../../services/userService';
import { Avatar } from '../common/Avatar';
import { Logo } from '../common/Logo';
import { formatConversationDate } from '../../utils/dateUtils';
import { safeGetItem } from '../../services/storageEngine';
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
  Plus,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  onSelectConversation: (conversationId: string, recipient?: UserProfile, conversation?: Conversation) => void;
  selectedId: string | null;
}

type ChatFilter = 'all' | 'direct' | 'groups' | 'unread';

export const Sidebar: React.FC<SidebarProps> = ({ onSelectConversation, selectedId }) => {
  const { profile, logout, isAdmin } = useAuth();
  const { effectiveTheme, toggleTheme, colorConfig } = useTheme();
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
      const currentUsers = safeGetItem<UserProfile[]>('connecto_db_users') || [];
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

      // Live users subscription to keep presence fresh
      const unsubUsers = subscribeToAllUsers((allUsers) => {
        const fullMap: Record<string, UserProfile> = {};
        allUsers.forEach((u) => {
          fullMap[u.uid] = u;
        });

        setRecipientsMap((prev) => {
          const updated: Record<string, UserProfile> = { ...prev };
          for (const conv of convs) {
            if (!conv.isGroup) {
              const otherUid = conv.participantIds.find((id) => id !== profile.uid) || conv.participantIds[0];
              if (otherUid && fullMap[otherUid]) {
                updated[conv.id] = fullMap[otherUid];
              }
            }
          }
          return updated;
        });
      });

      return () => {
        unsubUsers();
      };
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
    <aside className="w-full h-full flex flex-col bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#1f2c34] select-none transition-colors">
      {/* Top Header Bar */}
      <div className="h-16 px-4 border-b border-[#e9edef] dark:border-[#1f2c34] flex items-center justify-between flex-shrink-0 bg-[#f0f2f5] dark:bg-[#111b21]">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Chats</h2>

        <div className="flex items-center gap-1">
          {/* New Group Button */}
          <button
            type="button"
            onClick={() => setShowCreateGroupModal(true)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-[#1f2c34] transition cursor-pointer"
            title="New Group"
            aria-label="Create group"
          >
            <Users className="w-5 h-5 stroke-[1.8]" />
          </button>

          {/* New 1-on-1 Chat */}
          <button
            type="button"
            onClick={() => setShowNewChatModal(true)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-[#1f2c34] transition cursor-pointer"
            title="New Chat"
            aria-label="Start new conversation"
          >
            <MessageSquarePlus className="w-5 h-5 stroke-[1.8]" />
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer ml-1"
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>
      </div>

      {/* Search Filter Box */}
      <div className="p-3 space-y-2 bg-white dark:bg-[#111b21] border-b border-[#e9edef] dark:border-[#1f2c34]/50">
        <div className="flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#202c33] border border-transparent px-3 py-2 rounded-xl focus-within:ring-1 focus-within:ring-[var(--color-primary)] transition">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            style={filter === 'all' ? { backgroundColor: colorConfig.primaryHex } : undefined}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
              filter === 'all'
                ? 'text-white'
                : 'bg-[#f0f2f5] dark:bg-[#202c33] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-[#2a3942]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>All</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            style={filter === 'unread' ? { backgroundColor: colorConfig.primaryHex } : undefined}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
              filter === 'unread'
                ? 'text-white shadow-xs'
                : 'bg-[#f0f2f5] dark:bg-[#202c33] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-[#2a3942]'
            }`}
          >
            Unread
          </button>
          <button
            type="button"
            onClick={() => setFilter('groups')}
            style={filter === 'groups' ? { backgroundColor: colorConfig.primaryHex } : undefined}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
              filter === 'groups'
                ? 'text-white shadow-xs'
                : 'bg-[#f0f2f5] dark:bg-[#202c33] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-[#2a3942]'
            }`}
          >
            Groups
          </button>
          <button
            type="button"
            onClick={() => setFilter('direct')}
            style={filter === 'direct' ? { backgroundColor: colorConfig.primaryHex } : undefined}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
              filter === 'direct'
                ? 'text-white shadow-xs'
                : 'bg-[#f0f2f5] dark:bg-[#202c33] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-[#2a3942]'
            }`}
          >
            Direct
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <div 
              style={{ borderColor: colorConfig.primaryHex, borderTopColor: 'transparent' }}
              className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" 
            />
            <p className="text-xs text-slate-400">Loading chats...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-center space-y-3">
            <div 
              style={{ color: colorConfig.primaryHex }}
              className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#202c33] border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto"
            >
              <MessageSquarePlus className="w-5 h-5 stroke-[1.8]" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {searchTerm ? 'No chats match your search' : 'No conversations found'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                style={{ backgroundColor: colorConfig.primaryHex }}
                className="px-3 py-1.5 rounded-xl text-white text-xs font-semibold shadow-xs transition hover:opacity-90 cursor-pointer"
              >
                New Chat
              </button>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-[#2a3942] text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-[#32434e] shadow-xs transition flex items-center gap-1 cursor-pointer"
              >
                <Users className="w-3 h-3 stroke-[1.8]" /> New Group
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
                type="button"
                onClick={() => onSelectConversation(conv.id, recipient, conv)}
                className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#e9edef] dark:bg-[#2a3942] shadow-xs'
                    : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
                }`}
              >
                {/* Avatar */}
                {isGroup ? (
                  <div className="relative flex-shrink-0">
                    <div 
                      style={conv.groupAvatar?.startsWith('emoji:') ? undefined : { backgroundColor: `${colorConfig.primaryHex}20`, borderColor: `${colorConfig.primaryHex}40` }}
                      className="w-10 h-10 rounded-full border flex items-center justify-center overflow-hidden"
                    >
                      {conv.groupAvatar?.startsWith('emoji:') ? (
                        <span className="text-xl">{conv.groupAvatar.replace('emoji:', '')}</span>
                      ) : conv.groupAvatar ? (
                        <img src={conv.groupAvatar} alt={conv.groupName} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-5 h-5" style={{ color: colorConfig.primaryHex }} />
                      )}
                    </div>
                    <span 
                      style={{ backgroundColor: colorConfig.primaryHex }}
                      className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full text-white border-2 border-white dark:border-[#111b21]"
                    >
                      <Users className="w-2.5 h-2.5" />
                    </span>
                  </div>
                ) : (
                  <Avatar
                    src={recipient?.photoURL}
                    name={recipient?.displayName || 'Chat'}
                    size="md"
                    isOnline={isUserOnline(recipient)}
                    showOnlineStatus
                  />
                )}

                {/* Info & Last Message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className="text-xs font-bold truncate text-slate-900 dark:text-white">
                      {isGroup ? conv.groupName : (recipient?.displayName || recipient?.username || conv.lastSenderName || 'Chat')}
                    </h4>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 font-medium">
                      {formatConversationDate(conv.lastMessageAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate min-w-0">
                      {isMeLastSender && (
                        <CheckCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colorConfig.primaryHex }} />
                      )}
                      {conv.lastMessageType === 'image' && (
                        <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colorConfig.primaryHex }} />
                      )}
                      {conv.lastMessageType === 'file' && (
                        <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colorConfig.primaryHex }} />
                      )}
                      <span className="truncate">
                        {conv.lastMessage || (isGroup ? 'Group created' : 'Started conversation')}
                      </span>
                    </div>

                    {/* Unread badge */}
                    {unread > 0 && (
                      <span
                        style={{ backgroundColor: colorConfig.primaryHex }}
                        className="px-1.5 py-0.5 rounded-full text-white font-bold text-[10px] flex-shrink-0 shadow-xs"
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

