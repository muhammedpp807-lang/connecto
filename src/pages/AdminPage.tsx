import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { getAllUsers, updateUserProfile, deleteUser, lockUser, deleteAllUsers } from '../services/userService';
import { getSystemStats, getAllConversations, deleteConversation } from '../services/chatService';
import { UserProfile, Conversation } from '../types';
import { Avatar } from '../components/common/Avatar';
import { SEO } from '../components/common/SEO';
import { formatTime, formatConversationDate } from '../utils/dateUtils';
import { 
  ArrowLeft, 
  Users, 
  MessageSquare, 
  HardDrive, 
  Activity, 
  Search, 
  Trash2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  MessagesSquare
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { profile, logout } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeNow: 0,
    totalMessages: 0,
    totalConversations: 0,
    storageUsedMb: 0,
    uptimeHours: 99.98
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Conversation | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, sData, cList] = await Promise.all([
        getAllUsers(),
        getSystemStats(),
        getAllConversations()
      ]);
      setUsers(uList);
      setConversations(cList);
      setStats({
        ...sData,
        totalUsers: uList.length,
        activeNow: uList.filter((u) => u.isOnline).length,
        totalConversations: cList.length
      });
    } catch (err) {
      console.error('Admin load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleRole = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await updateUserProfile(user.uid, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, role: newRole } : u))
      );
      showToast('success', `Updated ${user.displayName}'s role to ${newRole}`);
    } catch {
      showToast('error', 'Failed to update user role');
    }
  };

  const handleToggleLock = async (user: UserProfile) => {
    const newLockState = !user.isLocked;
    try {
      await lockUser(user.uid, newLockState);
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, isLocked: newLockState } : u))
      );
      showToast(
        newLockState ? 'warning' : 'success',
        `User @${user.username} is now ${newLockState ? 'LOCKED from messaging' : 'UNLOCKED'}`
      );
    } catch {
      showToast('error', 'Failed to update user lock state');
    }
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    const targetUser = userToDelete;
    setIsDeleting(true);
    try {
      await deleteUser(targetUser.uid);
      setUsers((prev) => prev.filter((u) => u.uid !== targetUser.uid));
      setUserToDelete(null);
      showToast('success', `Permanently deleted user @${targetUser.username}`);
      await loadData();
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast('error', 'Failed to delete user. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const executeDeleteGroup = async () => {
    if (!groupToDelete) return;
    const targetGroup = groupToDelete;
    const name = targetGroup.groupName || 'this conversation';
    setIsDeleting(true);
    try {
      await deleteConversation(targetGroup.id);
      setConversations((prev) => prev.filter((c) => c.id !== targetGroup.id));
      setGroupToDelete(null);
      showToast('success', `Deleted group "${name}"`);
      await loadData();
    } catch (err) {
      console.error('Failed to delete group:', err);
      showToast('error', 'Failed to delete group. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllUsers();
      setShowConfirmDeleteAll(false);
      showToast('success', 'All users and chat data cleared successfully');
      await logout();
      navigate('/login');
    } catch {
      showToast('error', 'Failed to clear all data');
    }
  };

  const isGroupConv = (c: Conversation) => Boolean(c.isGroup || c.groupName || (c.id && c.id.startsWith('group_')));

  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(s) ||
      u.username.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s)
    );
  });

  const allGroups = conversations.filter(isGroupConv);

  const filteredGroups = allGroups.filter((c) => {
    const s = search.toLowerCase();
    return (
      (c.groupName || '').toLowerCase().includes(s) ||
      (c.groupDescription || '').toLowerCase().includes(s) ||
      (c.lastMessage || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0c12] text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO title="Admin Console – Connecto" description="Monitor platform health, active users, messaging metrics, and security roles." />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/app')}
              className="p-2.5 rounded-xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
              title="Back to chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">Connecto Super Admin Console</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                  Live System
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage user accounts, lock messaging privileges, delete groups, and monitor system telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirmDeleteAll(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete All App Data
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0d1117] transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Delete All Modal */}
        {showConfirmDeleteAll && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete All Users & Messages?</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                This will permanently delete all registered user accounts, conversations, credentials, and message histories. You will be redirected to the sign in page.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowConfirmDeleteAll(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1e2530] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0d1117] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/20 cursor-pointer"
                >
                  Yes, Delete Everything
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Single User Modal */}
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Permanently Delete User?</h3>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] rounded-2xl">
                <Avatar
                  src={userToDelete.photoURL}
                  name={userToDelete.displayName}
                  size="md"
                />
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{userToDelete.displayName}</p>
                  <p className="text-xs text-slate-400">@{userToDelete.username} • {userToDelete.email}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                This will permanently delete <strong className="text-slate-900 dark:text-white">@{userToDelete.username}</strong> from the database and application. Their credentials and direct chats will be removed.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1e2530] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0d1117] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDeleteUser}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? 'Deleting...' : 'Yes, Delete User'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Single Group Modal */}
        {groupToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Permanently Delete Group?</h3>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] rounded-2xl space-y-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white">{groupToDelete.groupName || 'Untitled Group'}</p>
                <p className="text-xs text-slate-400">{groupToDelete.participantIds?.length || 0} members • ID: {groupToDelete.id}</p>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                This will permanently delete this group and completely wipe all messages and shared media inside it.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGroupToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1e2530] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0d1117] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDeleteGroup}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Group'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Users</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black">{stats.totalUsers}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              ● {stats.activeNow} online right now
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Messages Sent</span>
              <MessageSquare className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black">{stats.totalMessages}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Real-time sync active</p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Groups</span>
              <MessagesSquare className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black">{allGroups.length}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total: {stats.totalConversations} channels</p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Uptime & Storage</span>
              <HardDrive className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black">{stats.uptimeHours}%</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{stats.storageUsedMb} MB storage</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#1e2530] pb-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                : 'bg-white dark:bg-[#161b22] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1e2530]'
            }`}
          >
            <Users className="w-4 h-4" /> Users Management ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'groups'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                : 'bg-white dark:bg-[#161b22] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1e2530]'
            }`}
          >
            <MessagesSquare className="w-4 h-4" /> Group Chats ({allGroups.length})
          </button>
        </div>

        {/* TAB 1: User Directory Table */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-[#1e2530] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Registered User Directory</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Delete any user permanently or lock them from sending messages.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] px-3 py-2 rounded-xl w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Filter users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-xs w-full focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No registered users found</p>
                  <p className="text-[11px] text-slate-500 mt-1">Users will appear here once registered.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#0d1117] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-[#1e2530]">
                    <tr>
                      <th className="py-3.5 px-6">User</th>
                      <th className="py-3.5 px-6">Email</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6">Role</th>
                      <th className="py-3.5 px-6">Messaging Lock</th>
                      <th className="py-3.5 px-6 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1e2530]">
                    {filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-[#0d1117]/60 transition">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={u.photoURL}
                              name={u.displayName}
                              size="sm"
                              isOnline={u.isOnline}
                              showOnlineStatus
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-900 dark:text-white">{u.displayName}</p>
                                {u.username === 'connecto' && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500 text-[9px] font-black text-black">
                                    SUPER ADMIN
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">@{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {u.email}
                        </td>
                        <td className="py-3.5 px-6">
                          {u.isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">
                              Last seen {formatTime(u.lastSeen)}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'admin' || u.username === 'connecto'
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-slate-100 dark:bg-[#0d1117] text-slate-600 dark:text-slate-400 border border-transparent dark:border-[#1e2530]'
                            }`}
                          >
                            {u.role === 'admin' || u.username === 'connecto' ? 'Administrator' : 'Standard User'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          {u.isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[10px] font-bold">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              <Unlock className="w-3 h-3" /> Allowed
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.uid !== profile?.uid && u.username !== 'connecto' && (
                              <>
                                {/* Lock / Unlock Button */}
                                <button
                                  onClick={() => handleToggleLock(u)}
                                  className={`p-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                    u.isLocked
                                      ? 'border-emerald-300 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                                      : 'border-amber-300 dark:border-amber-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                                  }`}
                                  title={u.isLocked ? 'Unlock messaging for user' : 'Lock user from messaging'}
                                >
                                  {u.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                  <span className="text-[10px] hidden sm:inline">{u.isLocked ? 'Unlock' : 'Lock'}</span>
                                </button>

                                {/* Toggle Role Button */}
                                <button
                                  onClick={() => handleToggleRole(u)}
                                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#1e2530] hover:bg-slate-100 dark:hover:bg-[#0d1117] text-[10px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                                >
                                  {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                                </button>

                                {/* Delete User Button */}
                                <button
                                  type="button"
                                  onClick={() => setUserToDelete(u)}
                                  className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                  title="Permanently delete user from app and database"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Group Management Table */}
        {activeTab === 'groups' && (
          <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-[#1e2530] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Groups Directory</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect group conversations and delete any group permanently.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] px-3 py-2 rounded-xl w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Filter groups..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-xs w-full focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredGroups.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <MessagesSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No group chats found</p>
                  <p className="text-[11px] text-slate-500 mt-1">Create groups in the chat sidebar.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#0d1117] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-[#1e2530]">
                    <tr>
                      <th className="py-3.5 px-6">Group</th>
                      <th className="py-3.5 px-6">Description</th>
                      <th className="py-3.5 px-6">Members</th>
                      <th className="py-3.5 px-6">Last Message</th>
                      <th className="py-3.5 px-6">Created</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1e2530]">
                    {filteredGroups.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-[#0d1117]/60 transition">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {g.groupAvatar?.startsWith('emoji:') ? (
                                <span className="text-lg">{g.groupAvatar.replace('emoji:', '')}</span>
                              ) : g.groupAvatar ? (
                                <img src={g.groupAvatar} alt={g.groupName} className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{g.groupName || 'Untitled Group'}</p>
                              <p className="text-[10px] text-slate-400">ID: {g.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {g.groupDescription || '—'}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                            {g.participantIds?.length || 0} members
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {g.lastMessage || '—'}
                        </td>
                        <td className="py-3.5 px-6 text-slate-400 text-[11px]">
                          {formatConversationDate(g.createdAt)}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => setGroupToDelete(g)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer text-[11px] font-bold"
                            title="Delete this group and its messages"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Group
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

