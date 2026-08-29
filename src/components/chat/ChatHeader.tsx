import React, { useState } from 'react';
import { Conversation, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { formatLastSeen } from '../../utils/dateUtils';
import { Phone, Video, MoreVertical, ArrowLeft, Users, Info, X } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { GroupInfoModal } from './GroupInfoModal';

interface ChatHeaderProps {
  conversation?: Conversation | null;
  recipient?: UserProfile | null;
  currentUserId: string;
  currentUserName: string;
  onBackMobile: () => void;
  onGroupUpdated?: () => void;
  onLeaveGroup?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  recipient,
  currentUserId,
  currentUserName,
  onBackMobile,
  onGroupUpdated,
  onLeaveGroup
}) => {
  const { showToast } = useNotifications();
  const [showDetails, setShowDetails] = useState(false);

  const isGroup = conversation?.isGroup || (!recipient && Boolean(conversation?.groupName));

  const handleCall = () => {
    const target = isGroup ? conversation?.groupName : recipient?.displayName;
    showToast('info', `Audio calling ${target}...`);
  };

  const handleVideo = () => {
    const target = isGroup ? conversation?.groupName : recipient?.displayName;
    showToast('info', `Video calling ${target}...`);
  };

  return (
    <>
      <div className="h-16 px-4 border-b border-slate-200 dark:border-[#1e2530] bg-white/90 dark:bg-[#0a0c12]/90 backdrop-blur-md flex items-center justify-between z-20 flex-shrink-0 transition-colors">
        {/* Left: Mobile Back Button & Profile/Group Info */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button for mobile view */}
          <button
            onClick={onBackMobile}
            className="md:hidden p-2 -ml-1 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#161b22] transition cursor-pointer"
            aria-label="Back to conversations list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Profile / Group trigger */}
          <button
            onClick={() => setShowDetails(true)}
            className="flex items-center gap-3 text-left group min-w-0 cursor-pointer"
          >
            {isGroup ? (
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {conversation?.groupAvatar?.startsWith('emoji:') ? (
                  <span className="text-xl">{conversation.groupAvatar.replace('emoji:', '')}</span>
                ) : conversation?.groupAvatar ? (
                  <img
                    src={conversation.groupAvatar}
                    alt={conversation.groupName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
            ) : (
              <Avatar
                src={recipient?.photoURL}
                name={recipient?.displayName || 'User'}
                size="md"
                isOnline={recipient?.isOnline}
                showOnlineStatus
              />
            )}

            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                {isGroup ? conversation?.groupName : recipient?.displayName}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isGroup ? (
                  <span>
                    Group • {conversation?.participantIds?.length || 0} members
                  </span>
                ) : recipient?.isOnline ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Online</span>
                ) : (
                  formatLastSeen(recipient?.lastSeen, recipient?.isOnline)
                )}
              </p>
            </div>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={handleCall}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#161b22] hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            title="Audio Call"
            aria-label="Start audio call"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            onClick={handleVideo}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#161b22] hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            title="Video Call"
            aria-label="Start video call"
          >
            <Video className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowDetails(true)}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#161b22] hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            title={isGroup ? "Group Info" : "Contact Info"}
            aria-label="View info"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal: Group Info or User Contact Details */}
      {showDetails && (
        isGroup && conversation ? (
          <GroupInfoModal
            conversation={conversation}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onClose={() => setShowDetails(false)}
            onGroupUpdated={onGroupUpdated}
            onLeaveGroup={onLeaveGroup}
          />
        ) : recipient ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact Details</h4>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center space-y-3 pt-2">
                <Avatar
                  src={recipient.photoURL}
                  name={recipient.displayName}
                  size="xl"
                  isOnline={recipient.isOnline}
                  showOnlineStatus
                />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {recipient.displayName}
                  </h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    @{recipient.username}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#0d1117] border border-transparent dark:border-[#1e2530] rounded-2xl space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">About</span>
                  <p className="text-slate-700 dark:text-slate-200 mt-0.5">{recipient.about || 'Available on Connecto'}</p>
                </div>
                <div className="border-t border-slate-200/60 dark:border-[#1e2530] pt-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Email</span>
                  <p className="text-slate-700 dark:text-slate-200 mt-0.5">{recipient.email}</p>
                </div>
                <div className="border-t border-slate-200/60 dark:border-[#1e2530] pt-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status</span>
                  <p className="text-slate-700 dark:text-slate-200 mt-0.5 font-medium">
                    {formatLastSeen(recipient.lastSeen, recipient.isOnline)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#0d1117] hover:bg-slate-200 dark:hover:bg-[#1e2530] text-slate-800 dark:text-slate-200 text-xs font-semibold border border-transparent dark:border-[#1e2530] transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : null
      )}
    </>
  );
};
