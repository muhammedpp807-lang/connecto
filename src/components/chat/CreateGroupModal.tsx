import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Conversation } from '../../types';
import { getAllUsers } from '../../services/userService';
import { createGroupConversation } from '../../services/chatService';
import { uploadMediaFile } from '../../services/storageService';
import { Avatar } from '../common/Avatar';
import { 
  Users, 
  X, 
  Search, 
  Check, 
  Camera, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

interface CreateGroupModalProps {
  currentUserId: string;
  currentUserName: string;
  onGroupCreated: (group: Conversation) => void;
  onClose: () => void;
}

const PRESET_GROUP_ICONS = [
  '🚀', '🔥', '💡', '🌟', '💻', '🎉', '⚽', '🍕', '🎮', '💼', '📚', '☕'
];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  currentUserId,
  currentUserName,
  onGroupCreated,
  onClose
}) => {
  const { showToast } = useNotifications();
  const [step, setStep] = useState<1 | 2>(1); // 1: Select Members, 2: Group Info
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Step 2 State
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    const fetchUsers = async () => {
      try {
        const all = await getAllUsers();
        if (mounted) {
          setUsers(all.filter((u) => u.uid !== currentUserId));
        }
      } catch (err) {
        console.error('Failed to load users for group:', err);
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    };
    fetchUsers();
    return () => {
      mounted = false;
    };
  }, [currentUserId]);

  const toggleUserSelection = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      const url = await uploadMediaFile(`groups/avatars/${Date.now()}_${file.name}`, file);
      setGroupAvatar(url);
      setSelectedEmoji('');
      showToast('success', 'Group icon uploaded');
    } catch (err) {
      showToast('error', 'Failed to upload photo');
      console.error('Group photo error:', err);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      showToast('error', 'Please enter a group subject / name');
      return;
    }

    if (selectedUserIds.length === 0) {
      showToast('error', 'Please select at least 1 member for the group');
      return;
    }

    try {
      setIsCreating(true);
      const finalAvatar = groupAvatar || (selectedEmoji ? `emoji:${selectedEmoji}` : '');

      const group = await createGroupConversation(
        currentUserId,
        currentUserName,
        groupName,
        selectedUserIds,
        {
          groupDescription,
          groupAvatar: finalAvatar
        }
      );

      showToast('success', `Group "${groupName}" created successfully!`);
      onGroupCreated(group);
      onClose();
    } catch (err) {
      showToast('error', 'Failed to create group. Please try again.');
      console.error('Create group error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  const selectedUsersList = users.filter((u) => selectedUserIds.includes(u.uid));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-[#1e2530] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {step === 1 ? 'Add Group Members' : 'New Group Details'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {step === 1
                  ? `${selectedUserIds.length} of ${users.length} members selected`
                  : 'Customize your group name & icon'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: Select Members */}
        {step === 1 && (
          <>
            {/* Search Box */}
            <div className="p-4 border-b border-slate-100 dark:border-[#1e2530] bg-slate-50/50 dark:bg-[#0d1117]/50 space-y-3">
              <div className="flex items-center gap-2 bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] px-3.5 py-2 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/40 transition">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search contacts to add..."
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

              {/* Selected member chips */}
              {selectedUsersList.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                  {selectedUsersList.map((u) => (
                    <div
                      key={u.uid}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex-shrink-0 animate-in zoom-in-90"
                    >
                      <Avatar src={u.photoURL} name={u.displayName} size="xs" />
                      <span className="truncate max-w-[100px]">{u.displayName}</span>
                      <button
                        onClick={() => toggleUserSelection(u.uid)}
                        className="p-0.5 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-[#1e2530]/50">
              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
                  <span className="text-xs">Loading contacts...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 px-4">
                  <p className="text-sm font-medium text-slate-300">No contacts found</p>
                  <p className="text-xs text-slate-500 mt-1">Try another search keyword.</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.uid);
                  return (
                    <button
                      key={user.uid}
                      onClick={() => toggleUserSelection(user.uid)}
                      className={`w-full p-3 rounded-xl flex items-center justify-between transition text-left ${
                        isSelected
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40'
                          : 'hover:bg-slate-50 dark:hover:bg-[#0d1117] border border-transparent'
                      }`}
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
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {user.displayName}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            @{user.username} {user.about ? `• ${user.about}` : ''}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition flex-shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#161b22]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-[#1e2530] flex items-center justify-between bg-slate-50/60 dark:bg-[#0d1117]/60">
              <span className="text-xs text-slate-500 font-medium">
                {selectedUserIds.length === 0
                  ? 'Select contacts to proceed'
                  : `${selectedUserIds.length} contact${selectedUserIds.length > 1 ? 's' : ''} chosen`}
              </span>

              <button
                onClick={() => setStep(2)}
                disabled={selectedUserIds.length === 0}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-900/20 transition cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* STEP 2: Group Info */}
        {step === 2 && (
          <div className="p-6 overflow-y-auto space-y-6">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Avatar & Subject */}
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Group Avatar Picker */}
              <div className="relative group flex-shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-dashed border-emerald-300 dark:border-emerald-700 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 hover:border-emerald-500 transition overflow-hidden shadow-inner cursor-pointer"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : groupAvatar ? (
                    <img src={groupAvatar} alt="Group" className="w-full h-full object-cover" />
                  ) : selectedEmoji ? (
                    <span className="text-3xl">{selectedEmoji}</span>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 mb-0.5" />
                      <span className="text-[10px] font-bold uppercase">Add Photo</span>
                    </>
                  )}
                </button>

                {(groupAvatar || selectedEmoji) && (
                  <button
                    onClick={() => {
                      setGroupAvatar('');
                      setSelectedEmoji('');
                    }}
                    className="absolute -top-1 -right-1 p-1 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-500 transition"
                    title="Remove avatar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Group Name input */}
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Group Subject / Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Design Team, Friends, Project Alpha"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoFocus
                  maxLength={50}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <p className="text-[11px] text-slate-400 text-right">{groupName.length}/50</p>
              </div>
            </div>

            {/* Quick Preset Emoji Icons */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Or choose a quick icon:
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_GROUP_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setSelectedEmoji(emoji);
                      setGroupAvatar('');
                    }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition ${
                      selectedEmoji === emoji && !groupAvatar
                        ? 'bg-emerald-600 text-white scale-110 shadow-md ring-2 ring-emerald-400'
                        : 'bg-slate-100 dark:bg-[#0d1117] hover:bg-slate-200 dark:hover:bg-[#1e2530]'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Group Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Group Description <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                placeholder="What is this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={2}
                maxLength={200}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
              />
            </div>

            {/* Members Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200/70 dark:border-[#1e2530] space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Members ({selectedUserIds.length + 1})</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">You are group admin</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                  You (Admin)
                </span>
                {selectedUsersList.map((u) => (
                  <span
                    key={u.uid}
                    className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-[#161b22] text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                  >
                    {u.displayName}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1e2530] text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#0d1117] flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || !groupName.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition cursor-pointer"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Group...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Create Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
