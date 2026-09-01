import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Gamepad2, 
  Wifi, 
  Loader2, 
  Users, 
  Clock, 
  Send,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { getAllUsers, isUserOnline, subscribeToAllUsers } from '../../services/userService';
import { 
  sendGameInvitation, 
  getPendingInvitationBetween, 
  isUserInActiveGame,
  cancelGameInvitation 
} from '../../services/gameService';
import { UserProfile, GameInvitation } from '../../types';
import { Avatar } from '../common/Avatar';

interface OnlineFriendSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onInvitationSent: (invitation: GameInvitation) => void;
  activeInvitations: GameInvitation[];
}

export const OnlineFriendSelector: React.FC<OnlineFriendSelectorProps> = ({
  isOpen,
  onClose,
  onInvitationSent,
  activeInvitations
}) => {
  const { profile } = useAuth();
  const { colorConfig } = useTheme();
  const { showToast } = useNotifications();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [invitingUid, setInvitingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsub = subscribeToAllUsers((all) => {
      setUsers(all.filter((u) => u.uid !== profile?.uid));
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen, profile?.uid]);

  if (!isOpen) return null;

  const handleInvite = async (friend: UserProfile) => {
    if (!profile) return;

    setInvitingUid(friend.uid);
    try {
      const invitation = await sendGameInvitation(profile, friend, 'tic-tac-toe');
      showToast('success', `Game invitation sent to ${friend.displayName}!`);
      onInvitationSent(invitation);
    } catch {
      showToast('error', 'Failed to send invitation.');
    } finally {
      setInvitingUid(null);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    try {
      await cancelGameInvitation(invitationId);
      showToast('info', 'Invitation cancelled.');
    } catch {
      showToast('error', 'Failed to cancel invitation.');
    }
  };

  const filtered = users.filter((u) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  // Sort online friends first, then alphabetical
  filtered.sort((a, b) => {
    const aOnline = isUserOnline(a);
    const bOnline = isUserOnline(b);
    if (aOnline === bOnline) {
      return a.displayName.localeCompare(b.displayName);
    }
    return aOnline ? -1 : 1;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-[#1f2c34] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div 
              style={{ backgroundColor: `${colorConfig.primaryHex}15`, color: colorConfig.primaryHex }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold"
            >
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Choose a friend to invite</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Only online friends can receive real-time match invites
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1f2c34] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-[#1f2c34] flex-shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or @username..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#202c33] border border-slate-200 dark:border-[#2a3942] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-medium"
            />
          </div>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: colorConfig.primaryHex }} />
              <span className="text-xs">Loading friends...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-2">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No users found</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Ask your friends to register on Pulse to start playing together!
              </p>
            </div>
          ) : (
            filtered.map((friend) => {
              // Check if pending invitation exists
              const pendingInv = activeInvitations.find(
                (inv) =>
                  inv.status === 'pending' &&
                  inv.expiresAt > Date.now() &&
                  inv.senderId === profile?.uid &&
                  inv.receiverId === friend.uid
              );

              // Check if friend is currently online
              const isOnline = isUserOnline(friend);

              // Check if friend is currently playing
              const isPlaying = isUserInActiveGame(friend.uid);

              return (
                <div
                  key={friend.uid}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#19242b] border border-slate-200/70 dark:border-[#2a3942] flex items-center justify-between gap-3 shadow-xs"
                >
                  {/* Left: User Profile & Online indicator */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={friend.photoURL}
                      name={friend.displayName}
                      size="md"
                      isOnline={isOnline}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {friend.displayName}
                        </h4>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          @{friend.username || 'user'}
                        </span>
                        
                        {/* Status Label */}
                        <div className="flex items-center gap-1">
                          <span 
                            className={`w-2 h-2 rounded-full ${
                              isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`} 
                          />
                          <span className={`text-[10px] font-bold ${
                            isOnline 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Invitation Buttons */}
                  <div className="flex-shrink-0">
                    {isPlaying ? (
                      <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1 select-none">
                        <span>🎮</span>
                        <span>Playing</span>
                      </span>
                    ) : pendingInv ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCancelInvite(pendingInv.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer"
                          title="Cancel Invitation"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInvite(friend)}
                        disabled={invitingUid === friend.uid}
                        style={{ backgroundColor: isOnline ? colorConfig.primaryHex : undefined }}
                        className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs hover:opacity-95 active:scale-95 transition cursor-pointer disabled:opacity-50 ${
                          isOnline
                            ? 'text-white'
                            : 'bg-slate-200 dark:bg-[#202c33] text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-[#2a3942]'
                        }`}
                      >
                        {invitingUid === friend.uid ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Gamepad2 className="w-4 h-4" />
                        )}
                        <span>Invite to Play</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
