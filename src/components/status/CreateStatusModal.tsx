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
  Check
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

  // Video playback & trim states
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (file.type.startsWith('video/')) {
      setMode('video');
      setIsPlaying(false);
    } else if (file.type.startsWith('image/')) {
      setMode('image');
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 0;
      setVideoDuration(dur);
      setTrimStart(0);
      setTrimEnd(Math.min(dur, 30));
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
    const expiresAt = calculateExpiresAt(expiryOption);

    try {
      let finalMediaUrl = previewUrl;

      if (selectedFile) {
        try {
          const uploadedUrl = await uploadMediaFile(
            `statuses/${profile.uid}/${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`,
            selectedFile,
            (pct) => setUploadProgress(pct)
          );
          if (uploadedUrl) {
            finalMediaUrl = uploadedUrl;
          }
        } catch (uploadErr) {
          console.warn('Direct upload fallback:', uploadErr);
        }
      }

      // Create status
      await createStatus({
        userId: profile.uid,
        userName: profile.displayName,
        userAvatar: profile.photoURL,
        userUsername: profile.username,
        type: mode,
        mediaUrl: finalMediaUrl || '',
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
    } catch (err) {
      console.error('Failed to post status:', err);
      showToast('error', 'Failed to post status. Please try again.');
      setIsSubmitting(false);
    }
  };

  const activeFilterClass = FILTERS.find((f) => f.id === filter)?.class || '';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-[#12161f] border border-[#1e2530] text-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1e2530] flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Create New Status</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 py-2.5 bg-[#0d1117] border-b border-[#1e2530] flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('video');
              fileInputRef.current?.click();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              mode === 'video'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'bg-[#161b22] text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            Status Video
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('image');
              fileInputRef.current?.click();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              mode === 'image'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'bg-[#161b22] text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Photo
          </button>

          <button
            type="button"
            onClick={() => setMode('text')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              mode === 'text'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                : 'bg-[#161b22] text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-4 h-4" />
            Text Story
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="video/*,image/*"
            className="hidden"
          />
        </div>

        {/* Body / Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. Video / Image Preview Screen */}
          {(mode === 'video' || mode === 'image') && (
            <div className="space-y-3">
              <div className="relative w-full aspect-[9/14] sm:aspect-[9/12] max-h-[350px] bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-[#1e2530] shadow-inner group">
                {previewUrl ? (
                  mode === 'video' ? (
                    <>
                      <video
                        ref={videoRef}
                        src={previewUrl}
                        playsInline
                        muted={isMuted}
                        onLoadedMetadata={handleLoadedMetadata}
                        onTimeUpdate={handleTimeUpdate}
                        className={`w-full h-full object-contain ${activeFilterClass}`}
                      />
                      {/* Floating Play/Pause Center Button */}
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white flex items-center justify-center transition transform group-hover:scale-105 cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                      </button>

                      {/* Floating Audio Mute Toggle */}
                      <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition cursor-pointer"
                        title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                      </button>
                    </>
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Status Preview"
                      className={`w-full h-full object-contain ${activeFilterClass}`}
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="p-4 rounded-full bg-[#161b22] border border-[#1e2530] text-emerald-400">
                      {mode === 'video' ? <Video className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                    </div>
                    <p className="text-xs font-semibold text-slate-300">
                      {mode === 'video' ? 'Upload video file up to 100MB' : 'Upload high-resolution photo'}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer"
                    >
                      Choose Media File
                    </button>
                  </div>
                )}
              </div>

              {/* Video Timeline / Trimmer Controls */}
              {mode === 'video' && previewUrl && videoDuration > 0 && (
                <div className="p-3 bg-[#161b22] rounded-2xl border border-[#1e2530] space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                      Trim Video Clip (Max 30s)
                    </span>
                    <span className="text-emerald-400 font-mono">
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
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />

                  <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                    <div>
                      <span>Start: </span>
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
                        className="w-14 px-1.5 py-0.5 rounded bg-[#0d1117] border border-[#1e2530] text-white text-center text-xs ml-1"
                      />
                      s
                    </div>
                    <div>
                      <span>End: </span>
                      <input
                        type="number"
                        min={trimStart + 1}
                        max={videoDuration}
                        value={Math.round(trimEnd)}
                        onChange={(e) => {
                          const val = Math.min(videoDuration, Number(e.target.value));
                          setTrimEnd(val);
                        }}
                        className="w-14 px-1.5 py-0.5 rounded bg-[#0d1117] border border-[#1e2530] text-white text-center text-xs ml-1"
                      />
                      s
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Filters Bar */}
              {previewUrl && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    Visual Filters
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilter(f.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 cursor-pointer ${
                          filter === f.id
                            ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-500/40'
                            : 'bg-[#161b22] text-slate-400 hover:text-white border border-[#1e2530]'
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Caption Input */}
              {previewUrl && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {QUICK_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setCaption((prev) => prev + em)}
                        className="p-1 rounded-lg hover:bg-[#161b22] text-sm transition cursor-pointer"
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
                    className="w-full px-4 py-2.5 rounded-xl bg-[#161b22] border border-[#1e2530] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              )}
            </div>
          )}

          {/* 2. Text Status Mode */}
          {mode === 'text' && (
            <div className="space-y-4">
              {/* Text Canvas */}
              <div className={`w-full aspect-[9/13] max-h-[340px] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xl ${TEXT_BACKGROUNDS[textBgIndex]} transition-all duration-300 relative`}>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Type your status story here..."
                  maxLength={300}
                  className="w-full bg-transparent text-white font-bold text-lg sm:text-xl placeholder:text-white/60 text-center resize-none focus:outline-none leading-relaxed"
                  rows={5}
                />
                <span className="absolute bottom-3 right-4 text-[10px] text-white/60 font-mono">
                  {textContent.length}/300
                </span>
              </div>

              {/* Color Palette Switcher */}
              <div className="flex items-center justify-between bg-[#161b22] p-3 rounded-2xl border border-[#1e2530]">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-purple-400" />
                  Background Theme
                </span>
                <div className="flex items-center gap-2">
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
            </div>
          )}

          {/* 3. Expiring Time Selection (Never or Specified Time) */}
          <div className="p-3.5 bg-[#161b22] rounded-2xl border border-[#1e2530] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Status Expiration Time
              </label>
              <span className="text-[11px] font-semibold text-emerald-400">
                {EXPIRY_OPTIONS.find((o) => o.id === expiryOption)?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                        : 'bg-[#0d1117] text-slate-400 hover:text-white border border-[#1e2530]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {opt.isPermanent && <InfinityIcon className="w-3 h-3 text-amber-300 flex-shrink-0" />}
                      {opt.label}
                    </span>
                    {isSelected && <Check className="w-3 h-3 text-white flex-shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
            
            <p className="text-[11px] text-slate-400">
              {EXPIRY_OPTIONS.find((o) => o.id === expiryOption)?.description}
            </p>
          </div>

          {/* Upload Progress Bar */}
          {isSubmitting && (
            <div className="p-3 bg-[#161b22] rounded-xl border border-[#1e2530] space-y-2">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                <span>Publishing status instantly...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(20, uploadProgress)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#1e2530] bg-[#161b22] flex items-center justify-between">
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            {expiryOption === 'never' ? (
              <span className="text-purple-400 font-medium flex items-center gap-1">
                <InfinityIcon className="w-3 h-3" /> Permanent (Never expires)
              </span>
            ) : (
              <span>Expires after {EXPIRY_OPTIONS.find(o => o.id === expiryOption)?.label}</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#0d1117] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Post Status
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

