import React, { useState, useEffect } from 'react';
import { Camera, Plus, Trash2, Eye, Sparkles, Check, Play, Image as ImageIcon } from 'lucide-react';
import { UserStatusGroup, StatusItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToStatuses, deleteStatus } from '../../services/statusService';
import { Avatar } from '../common/Avatar';
import { CreateStatusModal } from './CreateStatusModal';
import { StatusViewerModal } from './StatusViewerModal';
import { formatTimeAgo } from '../../utils/dateUtils';
import { useNotifications } from '../../contexts/NotificationContext';

export const StatusPageView: React.FC = () => {
  const { profile } = useAuth();
  const { showToast } = useNotifications();
  const [statusGroups, setStatusGroups] = useState<UserStatusGroup[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToStatuses(profile.uid, (groups) => {
      setStatusGroups(groups);
    });
    return () => unsub();
  }, [profile]);

  const myGroup = statusGroups.find((g) => g.userId === profile?.uid);
  const friendGroups = statusGroups.filter((g) => g.userId !== profile?.uid);

  const handleOpenMyStatus = () => {
    if (myGroup && myGroup.statuses.length > 0) {
      const idx = statusGroups.findIndex((g) => g.userId === profile?.uid);
      setViewerGroupIndex(idx >= 0 ? idx : 0);
    } else {
      setShowCreateModal(true);
    }
  };

  const handleOpenFriendStatus = (userId: string) => {
    const idx = statusGroups.findIndex((g) => g.userId === userId);
    if (idx >= 0) {
      setViewerGroupIndex(idx);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0b141a] text-slate-100 overflow-y-auto select-none relative transition-colors">
      {/* Top Header */}
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-white">Status</h1>
      </div>

      {/* Main Status Content Area */}
      <div className="px-8 py-2 max-w-4xl space-y-8">
        {/* Section 1: My Status */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            My Status
          </h2>

          <div
            onClick={handleOpenMyStatus}
            className="flex items-center gap-4 p-3 rounded-2xl bg-[#111b21]/80 hover:bg-[#1f2c34] border border-[#1f2c34] transition-colors cursor-pointer group max-w-md"
          >
            {/* Avatar with Ring & Plus badge */}
            <div className="relative flex-shrink-0">
              <div
                className={`w-12 h-12 rounded-full p-0.5 flex items-center justify-center ${
                  myGroup && myGroup.statuses.length > 0
                    ? 'ring-2 ring-[#00a884] ring-offset-2 ring-offset-[#111b21]'
                    : 'border border-dashed border-slate-500'
                }`}
              >
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#202c33] flex items-center justify-center text-slate-300 font-bold text-lg">
                    ?
                  </div>
                )}
              </div>

              {/* Green '+' button badge */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateModal(true);
                }}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow border-2 border-[#111b21] group-hover:scale-110 transition cursor-pointer"
                title="Add new status"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white truncate">
                  My Status
                </h3>
                {myGroup && myGroup.statuses.length > 0 && (
                  <span className="text-[11px] text-[#00a884] font-medium">
                    {myGroup.statuses.length} active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {myGroup && myGroup.statuses.length > 0
                  ? `Last updated ${formatTimeAgo(myGroup.statuses[myGroup.statuses.length - 1].createdAt)}`
                  : 'Tap to add status update'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Recent Updates */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Recent Updates
          </h2>

          {friendGroups.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-base font-medium text-slate-300">
                No friend statuses yet
              </p>
              <p className="text-xs text-slate-500">
                Friends' status updates will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {friendGroups.map((group) => {
                const latest = group.statuses[group.statuses.length - 1];
                return (
                  <div
                    key={group.userId}
                    onClick={() => handleOpenFriendStatus(group.userId)}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#111b21] hover:bg-[#1f2c34] border border-[#1f2c34] transition-colors cursor-pointer"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full p-0.5 ring-2 ring-[#00a884] ring-offset-2 ring-offset-[#111b21]">
                        <Avatar
                          src={group.userAvatar}
                          name={group.userName}
                          size="md"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {group.userName}
                      </h3>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {latest ? formatTimeAgo(latest.createdAt) : 'Recently'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (Camera FAB at bottom right) */}
      <button
        type="button"
        id="status-camera-fab"
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-[#00a884] hover:bg-[#02906f] active:scale-95 text-white flex items-center justify-center shadow-2xl shadow-[#00a884]/30 transition-transform duration-200 z-20 cursor-pointer"
        title="Add status update"
        aria-label="Create status"
      >
        <Camera className="w-6 h-6" />
      </button>

      {/* Status Creation Fullscreen Studio */}
      {showCreateModal && (
        <CreateStatusModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* Status Viewer */}
      {viewerGroupIndex !== null && statusGroups[viewerGroupIndex] && (
        <StatusViewerModal
          groups={statusGroups}
          initialGroupIndex={viewerGroupIndex}
          onClose={() => setViewerGroupIndex(null)}
        />
      )}
    </div>
  );
};
