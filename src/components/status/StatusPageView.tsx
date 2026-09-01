import React, { useState, useEffect } from 'react';
import { Camera, Plus, Sparkles, Check, Play, Image as ImageIcon } from 'lucide-react';
import { UserStatusGroup, StatusItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscribeToStatuses, deleteStatus } from '../../services/statusService';
import { Avatar } from '../common/Avatar';
import { StatusThumbnailCircle } from './StatusThumbnailCircle';
import { CreateStatusModal } from './CreateStatusModal';
import { StatusViewerModal } from './StatusViewerModal';
import { formatTimeAgo } from '../../utils/dateUtils';
import { useNotifications } from '../../contexts/NotificationContext';

export const StatusPageView: React.FC = () => {
  const { profile } = useAuth();
  const { colorConfig } = useTheme();
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
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-[#0b141a] text-slate-900 dark:text-slate-100 overflow-y-auto select-none relative transition-colors">
      {/* Top Header */}
      <div className="px-8 pt-8 pb-4 border-b border-[#e9edef] dark:border-[#1f2c34] bg-[#f0f2f5] dark:bg-[#111b21]">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Status</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Share photos, videos and updates with your contacts</p>
      </div>

      {/* Main Status Content Area */}
      <div className="px-8 py-6 max-w-4xl space-y-8 pb-24">
        {/* Section 1: My Status */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            My Status
          </h2>

          <div
            onClick={handleOpenMyStatus}
            className="flex items-center gap-4 p-3 rounded-2xl bg-[#f0f2f5] dark:bg-[#111b21] hover:bg-slate-200/70 dark:hover:bg-[#1f2c34] border border-slate-200 dark:border-[#1f2c34] transition-colors cursor-pointer group max-w-md shadow-xs"
          >
            {/* Avatar / Status Thumbnail with Ring & Plus badge */}
            <div className="relative flex-shrink-0">
              <div
                style={
                  myGroup && myGroup.statuses.length > 0
                    ? { borderColor: colorConfig.primaryHex }
                    : undefined
                }
                className={`w-12 h-12 rounded-full p-0.5 flex items-center justify-center ${
                  myGroup && myGroup.statuses.length > 0
                    ? 'border-2'
                    : 'border border-dashed border-slate-400 dark:border-slate-600'
                }`}
              >
                <StatusThumbnailCircle
                  status={myGroup && myGroup.statuses.length > 0 ? myGroup.statuses[myGroup.statuses.length - 1] : null}
                  userAvatar={profile?.photoURL}
                  userName={profile?.displayName || 'My Profile'}
                  size="md"
                />
              </div>

              {/* Theme colored '+' button badge */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateModal(true);
                }}
                style={{ backgroundColor: colorConfig.primaryHex }}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-white flex items-center justify-center shadow-md border-2 border-white dark:border-[#111b21] group-hover:scale-110 transition cursor-pointer"
                title="Add new status"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  My Status
                </h3>
                {myGroup && myGroup.statuses.length > 0 && (
                  <span 
                    style={{ color: colorConfig.primaryHex }}
                    className="text-[11px] font-bold"
                  >
                    {myGroup.statuses.length} active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {myGroup && myGroup.statuses.length > 0
                  ? `Last updated ${formatTimeAgo(myGroup.statuses[myGroup.statuses.length - 1].createdAt)}`
                  : 'Tap to add status update'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Recent Updates */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recent Updates
          </h2>

          {friendGroups.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-slate-200 dark:border-[#1f2c34] rounded-2xl bg-[#f0f2f5]/40 dark:bg-[#111b21]/40">
              <Sparkles className="w-8 h-8 text-slate-400 dark:text-slate-500 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No contact status updates yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Statuses posted by contacts and participants will appear here
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
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#f0f2f5] dark:bg-[#111b21] hover:bg-slate-200/70 dark:hover:bg-[#1f2c34] border border-slate-200 dark:border-[#1f2c34] transition-colors cursor-pointer shadow-xs"
                  >
                    <div className="relative flex-shrink-0">
                      <div 
                        style={{ borderColor: colorConfig.primaryHex }}
                        className="w-12 h-12 rounded-full p-0.5 border-2"
                      >
                        <StatusThumbnailCircle
                          status={latest}
                          userAvatar={group.userAvatar}
                          userName={group.userName}
                          size="md"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {group.userName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
        style={{ backgroundColor: colorConfig.primaryHex }}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-2xl transition-transform duration-200 z-20 cursor-pointer active:scale-95 hover:scale-105"
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
