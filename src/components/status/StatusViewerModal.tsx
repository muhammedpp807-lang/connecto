import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Eye, 
  Send, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Users,
  Clock,
  Infinity as InfinityIcon,
  Check,
  Edit3,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { StatusItem, UserStatusGroup, StatusExpiryOption } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { 
  markStatusAsViewed, 
  deleteStatus, 
  updateStatusExpiry, 
  calculateExpiresAt, 
  formatStatusTimeRemaining 
} from '../../services/statusService';
import { sendMessage, getOrCreateConversationId } from '../../services/chatService';
import { Avatar } from '../common/Avatar';
import { formatTime } from '../../utils/dateUtils';

interface StatusViewerModalProps {
  groups: UserStatusGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onStatusDeleted?: () => void;
}

const EXPIRY_OPTIONS: { id: StatusExpiryOption; label: string; isPermanent?: boolean }[] = [
  { id: '1h', label: '1 Hour' },
  { id: '6h', label: '6 Hours' },
  { id: '12h', label: '12 Hours' },
  { id: '24h', label: '24 Hours' },
  { id: '48h', label: '48 Hours' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'never', label: 'Never (Permanent)', isPermanent: true },
];

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  groups,
  initialGroupIndex,
  onClose,
  onStatusDeleted
}) => {
  const { profile } = useAuth();
  const { showToast } = useNotifications();

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [statusIndex, setStatusIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFillMode, setIsFillMode] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showViewersList, setShowViewersList] = useState(false);
  const [showExpiryMenu, setShowExpiryMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentGroup = groups[groupIndex];
  const currentStatus: StatusItem | undefined = currentGroup?.statuses[statusIndex];
  const isMe = currentGroup?.userId === profile?.uid;

  // Mark as viewed when status opens
  useEffect(() => {
    if (currentStatus && profile && !isMe) {
      markStatusAsViewed(currentStatus.id, {
        userId: profile.uid,
        userName: profile.displayName,
        userAvatar: profile.photoURL
      }).catch(() => {});
    }
  }, [currentStatus, profile, isMe]);

  const handleNext = useCallback(() => {
    if (!currentGroup) return;

    if (statusIndex < currentGroup.statuses.length - 1) {
      setStatusIndex((prev) => prev + 1);
      setProgress(0);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setStatusIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentGroup, statusIndex, groupIndex, groups.length, onClose]);

  const handlePrev = useCallback(() => {
    if (statusIndex > 0) {
      setStatusIndex((prev) => prev - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex((prev) => prev - 1);
      const prevGroup = groups[groupIndex - 1];
      setStatusIndex(prevGroup.statuses.length - 1);
      setProgress(0);
    }
  }, [statusIndex, groupIndex, groups]);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showExpiryMenu || showViewersList) {
        if (e.key === 'Escape') {
          setShowExpiryMenu(false);
          setShowViewersList(false);
        }
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        handlePrev();
      } else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && isMe && !isDeleting) {
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose, showExpiryMenu, showViewersList, isMe, isDeleting]);

  // Progress Bar timer logic
  useEffect(() => {
    if (!currentStatus || isPaused || showViewersList || showExpiryMenu) return;

    const duration = currentStatus.type === 'video' 
      ? (currentStatus.duration || 10) * 1000 
      : 6000; // 6s for image/text

    const interval = 50; // update every 50ms
    const step = (interval / duration) * 100;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimerRef.current!);
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [currentStatus, isPaused, showViewersList, showExpiryMenu, handleNext]);

  // Reset progress on status change
  useEffect(() => {
    setProgress(0);
    setShowExpiryMenu(false);
  }, [groupIndex, statusIndex]);

  const handleDelete = async () => {
    if (!currentStatus || isDeleting) return;
    setIsDeleting(true);
    try {
      const targetId = currentStatus.id;
      await deleteStatus(targetId);
      showToast('info', 'Status deleted successfully');
      onStatusDeleted?.();

      if (currentGroup.statuses.length <= 1) {
        onClose();
      } else {
        if (statusIndex >= currentGroup.statuses.length - 1) {
          setStatusIndex(Math.max(0, currentGroup.statuses.length - 2));
        }
        setProgress(0);
      }
    } catch {
      showToast('error', 'Failed to delete status');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateExpiry = async (opt: StatusExpiryOption) => {
    if (!currentStatus) return;
    const newExpiresAt = calculateExpiresAt(opt);
    try {
      await updateStatusExpiry(currentStatus.id, newExpiresAt, opt);
      currentStatus.expiresAt = newExpiresAt;
      currentStatus.expiryOption = opt;
      showToast('success', opt === 'never' ? 'Status set to Never expire' : `Expiration updated to ${opt}`);
      setShowExpiryMenu(false);
    } catch {
      showToast('error', 'Failed to update expiry');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !currentStatus || !replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const convId = getOrCreateConversationId(profile.uid, currentStatus.userId);
      const msgText = `Replying to status: "${replyText.trim()}"`;
      await sendMessage(convId, profile.uid, currentStatus.userId, {
        text: msgText,
        type: 'text',
        senderName: profile.displayName,
        senderAvatar: profile.photoURL
      });

      showToast('success', `Replied to ${currentGroup.userName}'s status`);
      setReplyText('');
    } catch (err) {
      console.error('Failed to reply to status:', err);
      showToast('error', 'Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  if (!currentGroup || !currentStatus) return null;

  return (
    <div 
      className="fixed inset-0 z-50 w-full h-full bg-black flex flex-col justify-between overflow-hidden select-none animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      
      {/* 1. Ambient Blurred Backdrop for Full-Screen Media Atmosphere */}
      {currentStatus.type === 'image' && currentStatus.mediaUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110 pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${currentStatus.mediaUrl})` }}
        />
      )}
      {currentStatus.type === 'video' && currentStatus.mediaUrl && (
        <video 
          src={currentStatus.mediaUrl}
          muted
          loop
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-25 scale-125 pointer-events-none transition-all duration-700"
        />
      )}
      {currentStatus.type === 'text' && (
        <div 
          className={`absolute inset-0 ${currentStatus.textBackground || 'bg-gradient-to-tr from-purple-900 to-indigo-950'} opacity-40 blur-2xl pointer-events-none`}
        />
      )}

      {/* 2. Navigation Arrows for Desktop */}
      {groupIndex > 0 || statusIndex > 0 ? (
        <button
          type="button"
          onClick={handlePrev}
          className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/15 transition cursor-pointer z-40 shadow-xl hover:scale-110 active:scale-95"
          title="Previous status (Left Arrow)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      ) : null}

      {groupIndex < groups.length - 1 || statusIndex < currentGroup.statuses.length - 1 ? (
        <button
          type="button"
          onClick={handleNext}
          className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/15 transition cursor-pointer z-40 shadow-xl hover:scale-110 active:scale-95"
          title="Next status (Right Arrow)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      ) : null}

      {/* 3. Main Story Fullscreen Container (True edge-to-edge) */}
      <div 
        className="relative w-full h-full max-w-none mx-auto flex flex-col justify-between z-20"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        
        {/* Top Header & Segmented Progress Bars */}
        <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-5 bg-gradient-to-b from-black/90 via-black/50 to-transparent space-y-2.5 sm:space-y-3">
          
          {/* Segmented Progress Bars */}
          <div className="flex items-center gap-1.5 w-full">
            {currentGroup.statuses.map((item, idx) => {
              let fillPercent = 0;
              if (idx < statusIndex) fillPercent = 100;
              else if (idx === statusIndex) fillPercent = progress;
              else fillPercent = 0;

              return (
                <div
                  key={item.id}
                  className="flex-1 h-1 sm:h-1.5 bg-white/25 rounded-full overflow-hidden backdrop-blur-xs"
                >
                  <div
                    className="h-full bg-white transition-all duration-75 rounded-full"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* User Info Bar & Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Avatar
                src={currentGroup.userAvatar}
                name={currentGroup.userName}
                size="md"
              />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white leading-tight flex items-center gap-2 truncate">
                  <span className="truncate">{currentGroup.userName}</span>
                  {isMe && (
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/25 text-emerald-300 rounded-full font-semibold border border-emerald-500/40 shrink-0">
                      You
                    </span>
                  )}
                </p>
                <p className="text-[10px] sm:text-xs text-white/70">
                  {formatTime(currentStatus.createdAt)}
                </p>
              </div>
            </div>

            {/* Actions: Fullscreen Fill, Mute, Delete, Close */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              
              {/* Toggle Fit / Fill */}
              {(currentStatus.type === 'video' || currentStatus.type === 'image') && (
                <button
                  type="button"
                  onClick={() => setIsFillMode(!isFillMode)}
                  className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer backdrop-blur-xs"
                  title={isFillMode ? 'Fit to Screen' : 'Fill Screen'}
                >
                  {isFillMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              )}

              {/* Video Audio Mute Toggle */}
              {currentStatus.type === 'video' && (
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer backdrop-blur-xs"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
              )}

              {/* Prominent Delete Button for Own Status */}
              {isMe && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/50 backdrop-blur-md text-xs font-bold transition shadow-md hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Delete your status instantly"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}

              {/* Top Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 sm:p-2.5 rounded-full bg-black/50 hover:bg-rose-600/90 text-white backdrop-blur-md border border-white/20 shadow-md transition transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                title="Close Status (Esc)"
                aria-label="Close Status"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Media Content Display (Fullscreen) */}
        <div className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden">
          {/* Tap Zones for Navigation */}
          <div 
            className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer" 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            title="Previous"
          />
          <div 
            className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer" 
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            title="Next"
          />

          {/* Video Player */}
          {currentStatus.type === 'video' && (
            <video
              ref={videoRef}
              src={currentStatus.mediaUrl}
              autoPlay
              playsInline
              muted={isMuted}
              loop
              className={`w-full h-full transition-all duration-300 ${isFillMode ? 'object-cover' : 'object-contain'} ${currentStatus.filter || ''}`}
            />
          )}

          {/* Image Viewer */}
          {currentStatus.type === 'image' && (
            <img
              src={currentStatus.mediaUrl}
              alt="Status"
              className={`w-full h-full transition-all duration-300 ${isFillMode ? 'object-cover' : 'object-contain'} ${currentStatus.filter || ''}`}
            />
          )}

          {/* Text Story Canvas (Fullscreen fulfillment) */}
          {currentStatus.type === 'text' && (
            <div className={`w-full h-full p-8 sm:p-14 flex items-center justify-center text-center ${currentStatus.textBackground || 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-700'}`}>
              <p className="text-white font-bold text-2xl sm:text-3xl md:text-4xl leading-relaxed max-w-xl drop-shadow-lg animate-in zoom-in-95">
                {currentStatus.caption}
              </p>
            </div>
          )}

          {/* Caption Overlay for Image/Video */}
          {currentStatus.type !== 'text' && currentStatus.caption && (
            <div className="absolute bottom-16 sm:bottom-20 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-black/85 via-black/50 to-transparent text-center z-20 pointer-events-none">
              <p className="text-sm sm:text-base font-medium text-white max-w-md mx-auto drop-shadow-md bg-black/40 px-4 py-2 rounded-2xl backdrop-blur-xs inline-block">
                {currentStatus.caption}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Bar: Viewers List / Expiry Info for Own Status OR Reply Input for Others */}
        <div className="p-3 sm:p-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-30">
          {isMe ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowViewersList(!showViewersList);
                  setShowExpiryMenu(false);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md transition cursor-pointer"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>{currentStatus.viewers?.length || 0} Views</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Status Expiration Badge / Edit Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowExpiryMenu(!showExpiryMenu);
                    setShowViewersList(false);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-emerald-300 text-xs font-medium backdrop-blur-md transition cursor-pointer"
                  title="Click to change expiration time"
                >
                  {currentStatus.expiresAt === 0 ? (
                    <>
                      <InfinityIcon className="w-4 h-4 text-purple-300" />
                      <span className="text-purple-200">Never expires</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>{formatStatusTimeRemaining(currentStatus.expiresAt)}</span>
                    </>
                  )}
                  <Edit3 className="w-3.5 h-3.5 text-white/50 ml-0.5" />
                </button>

                {/* Mobile Delete Button */}
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="sm:hidden p-2 rounded-full bg-rose-600/30 text-rose-300 hover:text-white border border-rose-500/40"
                  title="Delete status"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendReply} className="flex items-center gap-2 max-w-xl mx-auto w-full">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${currentGroup.userName}...`}
                className="flex-1 px-4 py-3 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs sm:text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || isSendingReply}
                className="p-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition disabled:opacity-40 cursor-pointer"
                title="Send reply"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Change Expiry Bottom Sheet */}
        {showExpiryMenu && isMe && (
          <div className="absolute inset-x-0 bottom-0 bg-[#161b22] border-t border-slate-700 rounded-t-3xl p-5 z-40 space-y-3.5 animate-in slide-in-from-bottom shadow-2xl max-w-xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white">
                  Change Status Expiration
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowExpiryMenu(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {EXPIRY_OPTIONS.map((opt) => {
                const isCurrent = opt.id === (currentStatus.expiryOption || (currentStatus.expiresAt === 0 ? 'never' : '24h'));
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleUpdateExpiry(opt.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                      isCurrent
                        ? opt.isPermanent
                          ? 'bg-purple-600 text-white ring-2 ring-purple-400/50'
                          : 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                        : 'bg-[#0d1117] text-slate-300 hover:text-white border border-[#1e2530]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {opt.isPermanent && <InfinityIcon className="w-3.5 h-3.5 text-amber-300" />}
                      {opt.label}
                    </span>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Viewers Sheet (when toggled for own status) */}
        {showViewersList && (
          <div className="absolute inset-x-0 bottom-0 max-h-[60%] bg-[#161b22] border-t border-slate-700 rounded-t-3xl p-5 z-40 space-y-4 animate-in slide-in-from-bottom overflow-y-auto max-w-xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white">
                  Viewed by ({currentStatus.viewers?.length || 0})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowViewersList(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {currentStatus.viewers && currentStatus.viewers.length > 0 ? (
              <div className="space-y-2.5">
                {currentStatus.viewers.map((v) => (
                  <div key={v.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={v.userAvatar}
                        name={v.userName}
                        size="sm"
                      />
                      <span className="text-xs font-semibold text-white">
                        {v.userName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {formatTime(v.viewedAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No views yet. Share something with your contacts!
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};


