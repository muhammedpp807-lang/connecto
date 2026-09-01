import React, { useState, useEffect } from 'react';
import { Plus, Video, Sparkles, CircleDot } from 'lucide-react';
import { UserStatusGroup } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToStatuses } from '../../services/statusService';
import { Avatar } from '../common/Avatar';
import { StatusThumbnailCircle } from './StatusThumbnailCircle';
import { CreateStatusModal } from './CreateStatusModal';
import { StatusViewerModal } from './StatusViewerModal';

interface StatusBarProps {
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ className = '' }) => {
  const { profile } = useAuth();
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
  const otherGroups = statusGroups.filter((g) => g.userId !== profile?.uid);

  const handleOpenMyStatus = () => {
    if (myGroup && myGroup.statuses.length > 0) {
      const idx = statusGroups.findIndex((g) => g.userId === profile?.uid);
      setViewerGroupIndex(idx >= 0 ? idx : 0);
    } else {
      setShowCreateModal(true);
    }
  };

  const handleOpenGroup = (userId: string) => {
    const idx = statusGroups.findIndex((g) => g.userId === userId);
    if (idx >= 0) {
      setViewerGroupIndex(idx);
    }
  };

  return (
    <div className={`py-3 px-3.5 border-b border-slate-200 dark:border-[#1e2530] bg-slate-50/50 dark:bg-[#0a0d14]/50 backdrop-blur-xs select-none ${className}`}>
      
      {/* Horizontal Story Rail */}
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1">
        
        {/* 1. My Status Item */}
        <div className="flex flex-col items-center flex-shrink-0 group cursor-pointer relative" onClick={handleOpenMyStatus}>
          <div className="relative">
            <div className={`p-0.5 rounded-full transition-transform group-hover:scale-105 ${
              myGroup && myGroup.statuses.length > 0
                ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-blue-500 ring-2 ring-emerald-500/40 shadow-sm'
                : 'border-2 border-dashed border-slate-300 dark:border-slate-600'
            }`}>
              <StatusThumbnailCircle
                status={myGroup && myGroup.statuses.length > 0 ? myGroup.statuses[myGroup.statuses.length - 1] : null}
                userAvatar={profile?.photoURL}
                userName={profile?.displayName || 'Me'}
                size="md"
              />
            </div>
            
            {/* Plus Icon Badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateModal(true);
              }}
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-[#0d1117] transition transform group-hover:scale-110 cursor-pointer"
              title="Add new status / video"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1.5 truncate max-w-[62px] text-center">
            {myGroup && myGroup.statuses.length > 0 ? (
              <span className="flex items-center gap-0.5">
                My Status
                <span className="text-[9px] text-emerald-500 font-mono">({myGroup.statuses.length})</span>
              </span>
            ) : (
              'Add Status'
            )}
          </span>
        </div>

        {/* 2. Divider */}
        {otherGroups.length > 0 && (
          <div className="h-8 w-px bg-slate-200 dark:bg-[#1e2530] flex-shrink-0" />
        )}

        {/* 3. Other Users' Status Groups */}
        {otherGroups.map((group) => {
          const latest = group.statuses[group.statuses.length - 1];
          return (
            <div
              key={group.userId}
              className="flex flex-col items-center flex-shrink-0 group cursor-pointer"
              onClick={() => handleOpenGroup(group.userId)}
            >
              <div className={`p-0.5 rounded-full transition-transform group-hover:scale-105 ${
                group.hasUnseen
                  ? 'bg-gradient-to-tr from-rose-500 via-amber-400 to-emerald-500 ring-2 ring-emerald-500/60 animate-pulse'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}>
                <StatusThumbnailCircle
                  status={latest}
                  userAvatar={group.userAvatar}
                  userName={group.userName}
                  size="md"
                />
              </div>

              <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 mt-1.5 truncate max-w-[58px] text-center">
                {group.userName.split(' ')[0]}
              </span>
            </div>
          );
        })}

        {/* Empty state hint if no other statuses */}
        {otherGroups.length === 0 && (
          <div 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/60 dark:bg-[#161b22]/60 border border-slate-200/80 dark:border-[#1e2530] text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 text-xs font-semibold cursor-pointer transition flex-shrink-0"
          >
            <Video className="w-3.5 h-3.5 text-emerald-500" />
            <span>Post a video story</span>
          </div>
        )}
      </div>

      {/* Create Status Modal */}
      {showCreateModal && (
        <CreateStatusModal
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Status Viewer Modal */}
      {viewerGroupIndex !== null && statusGroups.length > 0 && (
        <StatusViewerModal
          groups={statusGroups}
          initialGroupIndex={viewerGroupIndex}
          onClose={() => setViewerGroupIndex(null)}
        />
      )}

    </div>
  );
};
