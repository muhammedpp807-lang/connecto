import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Video, 
  Image as ImageIcon, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Type, 
  Send, 
  Scissors, 
  Loader2, 
  RotateCw,
  Sliders,
  Palette,
  Clock,
  Infinity as InfinityIcon,
  Check,
  CircleDot
} from 'lucide-react';
import { StatusExpiryOption } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { createStatus, calculateExpiresAt } from '../../services/statusService';
import { uploadMediaFile } from '../../services/storageService';

interface CreateStatusModalProps {
  onClose: () => void;
  onStatusCreated?: () => void;
}

type StatusMediaType = 'video' | 'image' | 'text';
type StatusFilter = 'normal' | 'warm' | 'monochrome' | 'vivid' | 'cyber' | 'sunset';

const FILTERS: { id: StatusFilter; name: string; class: string }[] = [
  { id: 'normal', name: 'Normal', class: 'filter-none' },
  { id: 'warm', name: 'Warm', class: 'sepia-[0.35] contrast-105 saturate-125' },
  { id: 'monochrome', name: 'B&W', class: 'grayscale contrast-125' },
  { id: 'vivid', name: 'Vivid', class: 'saturate-150 contrast-110' },
  { id: 'cyber', name: 'Cyber', class: 'hue-rotate-90 saturate-200 contrast-125' },
  { id: 'sunset', name: 'Sunset', class: 'sepia-[0.2] hue-rotate-[330deg] saturate-150' },
];

const TEXT_BACKGROUNDS = [
  'bg-gradient-to-tr from-blue-600 to-indigo-700',
  'bg-gradient-to-tr from-emerald-600 to-teal-700',
  'bg-gradient-to-tr from-purple-600 to-pink-600',
  'bg-gradient-to-tr from-rose-600 to-orange-500',
  'bg-gradient-to-tr from-amber-500 to-yellow-600',
  'bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900',
  'bg-gradient-to-tr from-cyan-600 to-blue-700',
  'bg-black',
];

const EXPIRY_OPTIONS: { id: StatusExpiryOption; label: string; description: string; isPermanent?: boolean }[] = [
  { id: '1h', label: '1 Hour', description: 'Quick temporary flash story' },
  { id: '6h', label: '6 Hours', description: 'Half-day story' },
  { id: '12h', label: '12 Hours', description: 'Active day story' },
  { id: '24h', label: '24 Hours', description: 'Standard 1 day story' },
  { id: '48h', label: '48 Hours', description: '2 days story' },
  { id: '7d', label: '7 Days', description: '1 week highlight' },
  { id: '30d', label: '30 Days', description: 'Monthly highlight' },
  { id: 'never', label: 'Never (Permanent)', description: 'Stays until you delete it', isPermanent: true },
];

const QUICK_EMOJIS = ['🔥', '❤️', '✨', '🎉', '🚀', '💯', '🤩', '🌸', '⚡', '🙌'];

export const CreateStatusModal: React.FC<CreateStatusModalProps> = ({
  onClose,
  onStatusCreated
}) => {
  const { profile } = useAuth();
  const { showToast } = useNotifications();

  const [mode, setMode] = useState<StatusMediaType>('video');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('normal');
  const [isMuted, setIsMuted] = useState(false);
  const [textBgIndex, setTextBgIndex] = useState(0);
  const [textContent, setTextContent] = useState('');
  const [expiryOption, setExpiryOption] = useState<StatusExpiryOption>('24h');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [autoThumbnail, setAutoThumbnail] = useState<string>('');
  const [customThumbnail, setCustomThumbnail] = useState<string>('');

  // Video playback & trim states
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(90);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Helper to extract frame from video
  const captureVideoThumbnail = (videoEl: HTMLVideoElement): string => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(480, videoEl.videoWidth || 360);
      canvas.height = Math.min(480, videoEl.videoHeight || 360);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (err) {
      console.warn('Frame capture note:', err);
    }
    return '';
  };

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSubmitting]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      showToast('error', 'Media exceeds maximum 100MB limit');
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
    setAutoThumbnail('');
    setCustomThumbnail('');

    if (file.type.startsWith('video/')) {
      setMode('video');
      setIsPlaying(false);
    } else if (file.type.startsWith('image/')) {
      setMode('image');
      setAutoThumbnail(url);
    }
  };

  const handleThumbSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCustomThumbnail(reader.result as string);
      showToast('success', 'Custom thumbnail set!');
    };
    reader.readAsDataURL(file);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 0;
      setVideoDuration(dur);
      setTrimStart(0);
      setTrimEnd(Math.min(dur, 90));

      setTimeout(() => {
        if (videoRef.current) {
          const thumb = captureVideoThumbnail(videoRef.current);
          if (thumb) setAutoThumbnail(thumb);
        }
      }, 300);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      setCurrentTime(curr);
      if (curr >= trimEnd) {
        videoRef.current.currentTime = trimStart;
        videoRef.current.play();
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTrimSeek = (val: number) => {
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      if (!customThumbnail) {
        const thumb = captureVideoThumbnail(videoRef.current);
        if (thumb) setAutoThumbnail(thumb);
      }
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;

    if (mode === 'text' && !textContent.trim()) {
      showToast('warning', 'Please write something for your status');
      return;
    }

    if ((mode === 'video' || mode === 'image') && !selectedFile && !previewUrl) {
      showToast('warning', 'Please select a photo or video to upload');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(100);

    const expiresAt = calculateExpiresAt(expiryOption);

    try {
      const finalMediaUrl = previewUrl || '';
      let finalThumbnail = customThumbnail || autoThumbnail;

      // If video and no thumbnail yet, capture right now from video element
      if (mode === 'video' && !finalThumbnail && videoRef.current) {
        finalThumbnail = captureVideoThumbnail(videoRef.current);
      }

      // Create and save status immediately (<10ms)
      const createdStatus = await createStatus({
        userId: profile.uid,
        userName: profile.displayName,
        userAvatar: profile.photoURL,
        userUsername: profile.username,
        type: mode,
        mediaUrl: finalMediaUrl,
        thumbnailUrl: finalThumbnail || (mode === 'image' ? finalMediaUrl : ''),
        caption: mode === 'text' ? textContent.trim() : caption.trim(),
        filter: (filter || 'normal') as StatusFilter,
        textBackground: mode === 'text' ? (TEXT_BACKGROUNDS[textBgIndex] || '') : undefined,
        duration: mode === 'video' ? Math.round(trimEnd - trimStart) : undefined,
        isMuted: isMuted,
        expiresAt,
        expiryOption
      });

      showToast('success', expiryOption === 'never' ? 'Permanent status published!' : 'Status posted successfully!');
      onStatusCreated?.();
      onClose();

      // Background upload if file exists (non-blocking)
      if (selectedFile) {
        uploadMediaFile(
          `statuses/${profile.uid}/${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`,
          selectedFile
        ).then(async (remoteUrl) => {
          if (remoteUrl && createdStatus?.id) {
            // Update the status item's media URL in storage
            const localStatuses = JSON.parse(localStorage.getItem('connecto_statuses_v1') || '[]');
            const updated = localStatuses.map((s: any) => 
              s.id === createdStatus.id ? { ...s, mediaUrl: remoteUrl, thumbnailUrl: s.thumbnailUrl || remoteUrl } : s
            );
            localStorage.setItem('connecto_statuses_v1', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('connecto_status_updated'));
          }
        }).catch((err) => {
          console.warn('Background status upload note:', err);
        });
      }
    } catch (err) {
      console.error('Failed to post status:', err);
      showToast('error', 'Failed to post status. Please try again.');
      setIsSubmitting(false);
    }
  };

  const activeFilterClass = FILTERS.find((f) => f.id === filter)?.class || '';

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-black text-white overflow-hidden select-none animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 1. Fullscreen Studio Top Header */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white leading-tight">Create New Status</h3>
            <p className="text-[11px] text-white/50 hidden sm:block">Upload photo, trim video (up to 1:30m) or craft a story</p>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition cursor-pointer disabled:opacity-50 hover:scale-105 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Post Status</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-rose-600/90 text-white backdrop-blur-md border border-white/15 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Media Type Switcher Bar */}
      <div className="px-4 sm:px-6 py-2.5 bg-black/60 border-b border-white/10 flex items-center justify-between gap-2 overflow-x-auto z-20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('video');
              fileInputRef.current?.click();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              mode === 'video'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400/50'
                : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Video Status</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('image');
              fileInputRef.current?.click();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              mode === 'image'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400/50'
                : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Photo Status</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('text')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              mode === 'text'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40 ring-1 ring-purple-400/50'
                : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Text Story</span>
          </button>
        </div>

        {previewUrl && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 transition shrink-0"
          >
            Change File
          </button>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="video/*,image/*"
          className="hidden"
        />
      </div>

      {/* 3. Fullscreen Workspace Canvas & Editing Controls */}
      <div className="flex-1 w-full h-full flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left/Center: Huge Fullscreen Media Stage */}
        <div className="flex-1 w-full h-full relative flex items-center justify-center bg-black/90 p-2 sm:p-6 overflow-hidden">
          
          {/* Ambient blurred backdrop for current preview */}
          {previewUrl && mode === 'image' && (
            <div 
              className="absolute inset-0 bg-cover bg-center blur-3xl opacity-25 scale-110 pointer-events-none"
              style={{ backgroundImage: `url(${previewUrl})` }}
            />
          )}

          {/* Media Player / Canvas Container */}
          {(mode === 'video' || mode === 'image') && (
            <div className="relative w-full h-full max-h-[78vh] flex items-center justify-center rounded-2xl overflow-hidden group">
              {previewUrl ? (
                mode === 'video' ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      playsInline
                      muted={isMuted}
                      onLoadedMetadata={handleLoadedMetadata}
                      onTimeUpdate={handleTimeUpdate}
                      className={`max-w-full max-h-full w-auto h-auto object-contain rounded-2xl shadow-2xl transition-all duration-200 ${activeFilterClass}`}
                    />

                    {/* Floating Center Play Button */}
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition transform group-hover:scale-110 cursor-pointer shadow-2xl border border-white/20"
                    >
                      {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                    </button>

                    {/* Floating Sound Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsMuted(!isMuted)}
                      className="absolute top-4 right-4 p-3 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md transition cursor-pointer border border-white/15 shadow-lg"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                    </button>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt="Status Preview"
                      className={`max-w-full max-h-full w-auto h-auto object-contain rounded-2xl shadow-2xl ${activeFilterClass}`}
                    />
                  </div>
                )
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-4 max-w-md w-full border-2 border-dashed border-white/20 rounded-3xl bg-white/5 hover:bg-white/10 hover:border-emerald-500/50 transition cursor-pointer backdrop-blur-md"
                >
                  <div className="p-5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {mode === 'video' ? <Video className="w-10 h-10" /> : <ImageIcon className="w-10 h-10" />}
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-bold text-white">
                      {mode === 'video' ? 'Select Video File' : 'Select Photo'}
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      {mode === 'video' ? 'Upload video up to 100MB (Supports 1m 30s trimming)' : 'Upload high-resolution photo'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 pointer-events-none"
                  >
                    Browse Files
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Text Story Fullscreen Editor */}
          {mode === 'text' && (
            <div className={`w-full h-full max-h-[78vh] rounded-3xl p-8 sm:p-16 flex flex-col items-center justify-center text-center shadow-2xl ${TEXT_BACKGROUNDS[textBgIndex]} transition-all duration-300 relative border border-white/15`}>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type your status story here..."
                maxLength={300}
                className="w-full max-w-2xl bg-transparent text-white font-bold text-2xl sm:text-4xl md:text-5xl placeholder:text-white/50 text-center resize-none focus:outline-none leading-relaxed drop-shadow-md"
                rows={5}
                autoFocus
              />
              <div className="absolute bottom-5 right-6 text-xs text-white/70 font-mono bg-black/30 px-3 py-1 rounded-full backdrop-blur-xs">
                {textContent.length}/300
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Timeline trimmer, Filters, Expiry & Caption Controls */}
        <div className="w-full md:w-96 bg-[#0e1218] border-t md:border-t-0 md:border-l border-white/10 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto space-y-4 max-h-[40vh] md:max-h-full">
          
          <div className="space-y-4">
            {/* Video Timeline Trimmer */}
            {mode === 'video' && previewUrl && videoDuration > 0 && (
              <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-white/90 font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Scissors className="w-4 h-4" />
                    Trim Video (Max 1m 30s)
                  </span>
                  <span className="font-mono text-emerald-300">
                    {currentTime.toFixed(1)}s / {videoDuration.toFixed(1)}s
                  </span>
                </div>

                <input
                  type="range"
                  min={trimStart}
                  max={trimEnd}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => handleTrimSeek(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />

                <div className="flex items-center justify-between gap-3 text-xs text-white/70">
                  <div className="flex items-center">
                    <span>Start:</span>
                    <input
                      type="number"
                      min={0}
                      max={Math.max(0, trimEnd - 1)}
                      value={trimStart}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setTrimStart(val);
                        handleTrimSeek(val);
                      }}
                      className="w-14 px-2 py-1 rounded-lg bg-black/60 border border-white/15 text-white text-center text-xs ml-1.5"
                    />
                    s
                  </div>
                  <div className="flex items-center">
                    <span>End:</span>
                    <input
                      type="number"
                      min={trimStart + 1}
                      max={videoDuration}
                      value={Math.round(trimEnd)}
                      onChange={(e) => {
                        const val = Math.min(videoDuration, Number(e.target.value));
                        setTrimEnd(val);
                      }}
                      className="w-14 px-2 py-1 rounded-lg bg-black/60 border border-white/15 text-white text-center text-xs ml-1.5"
                    />
                    s
                  </div>
                </div>
              </div>
            )}

            {/* Circle Thumbnail Setup / Preview for Contacts */}
            {previewUrl && (mode === 'video' || mode === 'image') && (
              <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                    <CircleDot className="w-3.5 h-3.5 text-emerald-400" />
                    Status Circle Thumbnail
                  </span>
                  <span className="text-[10px] text-white/50">Seen by contacts</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Circle Preview */}
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 shadow-md flex-shrink-0 bg-slate-900">
                    <img
                      src={customThumbnail || autoThumbnail || previewUrl}
                      alt="Thumbnail"
                      className={`w-full h-full object-cover ${activeFilterClass}`}
                    />
                    {mode === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-3 h-3 text-white fill-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <p className="text-[11px] text-white/80 leading-tight">
                      This thumbnail will appear in the status circle for other users.
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => thumbInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition cursor-pointer"
                      >
                        {customThumbnail ? 'Change Custom' : 'Set Custom Image'}
                      </button>
                      {customThumbnail && (
                        <button
                          type="button"
                          onClick={() => setCustomThumbnail('')}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* Visual Filters Bar */}
            {previewUrl && (mode === 'video' || mode === 'image') && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  Visual Filters
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        filter === f.id
                          ? 'bg-purple-600 text-white ring-2 ring-purple-400/50 shadow-md'
                          : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Background Theme Switcher for Text */}
            {mode === 'text' && (
              <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-purple-400" />
                    Gradient Background
                  </span>
                  <button
                    type="button"
                    onClick={() => setTextBgIndex((prev) => (prev + 1) % TEXT_BACKGROUNDS.length)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Next Style
                  </button>
                </div>
              </div>
            )}

            {/* Caption Input for Image/Video */}
            {previewUrl && (mode === 'video' || mode === 'image') && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/80">Caption</label>
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {QUICK_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setCaption((prev) => prev + em)}
                      className="p-1 rounded-lg hover:bg-white/10 text-base transition cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption to your status..."
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            )}

            {/* Status Expiration Time Selection */}
            <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Expiration Time
                </label>
                <span className="text-[11px] font-semibold text-emerald-400">
                  {EXPIRY_OPTIONS.find((o) => o.id === expiryOption)?.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {EXPIRY_OPTIONS.map((opt) => {
                  const isSelected = expiryOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExpiryOption(opt.id)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? opt.isPermanent
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white ring-2 ring-purple-400/50 shadow-md'
                            : 'bg-emerald-600 text-white ring-2 ring-emerald-400/50 shadow-md'
                          : 'bg-black/40 text-white/70 hover:text-white border border-white/10'
                      }`}
                    >
                      <span className="flex items-center gap-1 truncate">
                        {opt.isPermanent && <InfinityIcon className="w-3 h-3 text-amber-300 shrink-0" />}
                        {opt.label}
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upload Progress */}
            {isSubmitting && (
              <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                  <span>Publishing status...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(20, uploadProgress)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Post Action Button */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 hover:scale-102 active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Post Status</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

