import React, { useState, useEffect, useRef } from 'react';
import { Conversation, UserProfile } from '../../types';
import { getAllUsers } from '../../services/userService';
import { 
  updateGroupDetails, 
  addGroupMembers, 
  removeGroupMember, 
  toggleGroupAdmin 
} from '../../services/chatService';
import { uploadMediaFile } from '../../services/storageService';
import { Avatar } from '../common/Avatar';
import { 
  Users, 
  X, 
  UserPlus, 
  LogOut, 
  ShieldCheck, 
  ShieldAlert, 
  MoreVertical, 
  Edit3, 
  Check, 
  Camera, 
  Search, 
  Trash2,
  Calendar,
  Loader2
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDate } from '../../utils/dateUtils';

interface GroupInfoModalProps {
  conversation: Conversation;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onGroupUpdated?: () => void;
  onLeaveGroup?: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  conversation,
  currentUserId,
  currentUserName,
  onClose,
  onGroupUpdated,
  onLeaveGroup
}) => {
  const { showToast } = useNotifications();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(conversation.groupName || '');
  const [descInput, setDescInput] = useState(conversation.groupDescription || '');
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [searchAddTerm, setSearchAddTerm] = useState('');
  const [activeMenuMemberId, setActiveMenuMemberId] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = (conversation.adminIds || []).includes(currentUserId);
  const isCreator = conversation.createdBy === currentUserId;

  useEffect(() => {
    getAllUsers().then((users) => setAllUsers(users)).catch(console.error);
  }, []);

  const usersMap = new Map<string, UserProfile>();
  allUsers.forEach((u) => usersMap.set(u.uid, u));

  // Current group members
  const memberProfiles: { profile?: UserProfile; uid: string; isAdmin: boolean; isMe: boolean }[] = (
    conversation.participantIds || []
  ).map((uid) => ({
    profile: usersMap.get(uid),
    uid,
    isAdmin: (conversation.adminIds || []).includes(uid),
    isMe: uid === currentUserId
  }));

  // Non-members available to add
  const availableToAdd = allUsers.filter(
    (u) => !(conversation.participantIds || []).includes(u.uid)
  ).filter((u) => {
    const term = searchAddTerm.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term)
    );
  });

  const handleSaveDetails = async () => {
    if (!nameInput.trim()) {
      showToast('error', 'Group name cannot be empty');
      return;
    }

    try {
      await updateGroupDetails(conversation.id, {
        groupName: nameInput.trim(),
        groupDescription: descInput.trim()
      });
      setIsEditing(false);
      showToast('success', 'Group info updated');
      onGroupUpdated?.();
    } catch (err) {
      showToast('error', 'Failed to update group info');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      const url = await uploadMediaFile(`groups/avatars/${Date.now()}_${file.name}`, file);
      await updateGroupDetails(conversation.id, { groupAvatar: url });
      showToast('success', 'Group icon updated');
      onGroupUpdated?.();
    } catch (err) {
      showToast('error', 'Failed to update photo');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmAddMembers = async () => {
    if (selectedToAdd.length === 0) return;

    const names = selectedToAdd.map((uid) => usersMap.get(uid)?.displayName || 'User');
    try {
      await addGroupMembers(conversation.id, selectedToAdd, currentUserName, names);
      setSelectedToAdd([]);
      setShowAddMembers(false);
      showToast('success', `Added ${names.length} member(s)`);
      onGroupUpdated?.();
    } catch (err) {
      showToast('error', 'Failed to add members');
    }
  };

  const handleRemoveMember = async (targetUid: string, targetName: string) => {
    try {
      await removeGroupMember(conversation.id, targetUid, targetName, false);
      setActiveMenuMemberId(null);
      showToast('success', `Removed ${targetName}`);
      onGroupUpdated?.();
    } catch (err) {
      showToast('error', 'Failed to remove member');
    }
  };

  const handleToggleAdmin = async (targetUid: string, makeAdmin: boolean) => {
    try {
      await toggleGroupAdmin(conversation.id, targetUid, makeAdmin);
      setActiveMenuMemberId(null);
      showToast('success', makeAdmin ? 'Promoted to admin' : 'Dismissed from admin');
      onGroupUpdated?.();
    } catch (err) {
      showToast('error', 'Failed to update admin role');
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      try {
        await removeGroupMember(conversation.id, currentUserId, currentUserName, true);
        showToast('info', 'You left the group');
        onLeaveGroup?.();
        onClose();
      } catch (err) {
        showToast('error', 'Failed to leave group');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-[#1e2530] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Group Info
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Avatar and Title Section */}
          <div className="flex flex-col items-center text-center space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border-2 border-emerald-500/30 flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-900/10">
                {isUploadingPhoto ? (
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                ) : conversation.groupAvatar?.startsWith('emoji:') ? (
                  <span className="text-4xl">{conversation.groupAvatar.replace('emoji:', '')}</span>
                ) : conversation.groupAvatar ? (
                  <img
                    src={conversation.groupAvatar}
                    alt={conversation.groupName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>

              {isAdmin && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition cursor-pointer"
                  title="Change group icon"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="w-full space-y-2 text-left">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Group Name"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] text-sm text-slate-900 dark:text-white font-bold"
                />
                <textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Group Description (optional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] text-xs text-slate-700 dark:text-slate-300 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 text-xs text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDetails}
                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {conversation.groupName}
                  </h2>
                  {isAdmin && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Edit group name"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Group • {conversation.participantIds?.length || 0} members
                </p>
                {conversation.groupDescription && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-[#0d1117] p-2.5 rounded-xl border border-slate-100 dark:border-[#1e2530] text-left">
                    {conversation.groupDescription}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Creation Date Badge */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 justify-center">
            <Calendar className="w-3.5 h-3.5" />
            <span>Created {formatDate(conversation.createdAt)}</span>
          </div>

          {/* Members Header & Add Member Button */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Members ({memberProfiles.length})
              </h4>
              {isAdmin && !showAddMembers && (
                <button
                  onClick={() => setShowAddMembers(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Members
                </button>
              )}
            </div>

            {/* Add Member Selection Box */}
            {showAddMembers && (
              <div className="p-3.5 bg-slate-50 dark:bg-[#0d1117] border border-emerald-200 dark:border-emerald-900/60 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Select contacts to add:</span>
                  <button
                    onClick={() => {
                      setShowAddMembers(false);
                      setSelectedToAdd([]);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-[#161b22] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#1e2530]">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchAddTerm}
                    onChange={(e) => setSearchAddTerm(e.target.value)}
                    className="bg-transparent text-xs w-full focus:outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-[#1e2530]">
                  {availableToAdd.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2 text-center">No more contacts found</p>
                  ) : (
                    availableToAdd.map((u) => {
                      const isSelected = selectedToAdd.includes(u.uid);
                      return (
                        <button
                          key={u.uid}
                          onClick={() =>
                            setSelectedToAdd((prev) =>
                              prev.includes(u.uid)
                                ? prev.filter((id) => id !== u.uid)
                                : [...prev, u.uid]
                            )
                          }
                          className="w-full py-1.5 px-2 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-[#161b22] rounded-lg transition"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar src={u.photoURL} name={u.displayName} size="xs" />
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                              {u.displayName}
                            </span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={handleConfirmAddMembers}
                    disabled={selectedToAdd.length === 0}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                  >
                    Add {selectedToAdd.length > 0 ? `(${selectedToAdd.length})` : ''}
                  </button>
                </div>
              </div>
            )}

            {/* Member List */}
            <div className="space-y-1 divide-y divide-slate-100 dark:divide-[#1e2530]">
              {memberProfiles.map(({ profile, uid, isAdmin: memberIsAdmin, isMe }) => {
                const name = isMe ? 'You' : profile?.displayName || 'User';
                const isMenuOpen = activeMenuMemberId === uid;

                return (
                  <div
                    key={uid}
                    className="py-2.5 flex items-center justify-between relative group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={profile?.photoURL}
                        name={profile?.displayName || 'User'}
                        size="sm"
                        isOnline={profile?.isOnline}
                        showOnlineStatus
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {name}
                          </span>
                          {isMe && (
                            <span className="text-[10px] text-slate-400 font-normal">(You)</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {profile?.about || (memberIsAdmin ? 'Group Admin' : 'Member')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {memberIsAdmin && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      )}

                      {isAdmin && !isMe && (
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenuMemberId(isMenuOpen ? null : uid)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-2xl shadow-xl p-1 z-30 animate-in fade-in zoom-in-95 text-xs">
                              <button
                                onClick={() => handleToggleAdmin(uid, !memberIsAdmin)}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#0d1117] text-slate-700 dark:text-slate-200 flex items-center gap-2"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                <span>{memberIsAdmin ? 'Dismiss as admin' : 'Make group admin'}</span>
                              </button>

                              <button
                                onClick={() => handleRemoveMember(uid, profile?.displayName || 'User')}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove from group</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave Group Action */}
          <div className="pt-2 border-t border-slate-100 dark:border-[#1e2530]">
            <button
              onClick={handleLeaveGroup}
              className="w-full py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit / Leave Group</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
