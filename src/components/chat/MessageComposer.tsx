import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Image as ImageIcon, 
  Mic, 
  X, 
  Loader2, 
  Video, 
  FileText, 
  Sparkles, 
  Trash2, 
  Pause, 
  Play, 
  Check, 
  Lock,
  Plus
} from 'lucide-react';
import { sendMessage, setTypingStatus } from '../../services/chatService';
import { uploadMediaFile } from '../../services/storageService';
import { compressImageFile } from '../../utils/imageUtils';
import { EmojiPickerModal } from './EmojiPickerModal';
import { MediaEditorModal } from './MediaEditorModal';
import { VoicePermissionModal } from './VoicePermissionModal';
import { generateSyntheticAudioBlob } from '../../utils/audioSynth';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { playSentSound } from '../../utils/soundUtils';

interface MessageComposerProps {
  conversationId: string;
  senderId: string;
  receiverId?: string;
  senderName?: string;
  senderAvatar?: string;
  isGroup?: boolean;
}

interface ActiveMediaToEdit {
  file: File | Blob;
  previewUrl: string;
  mediaType: 'image' | 'video';
  fileName: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  conversationId,
  senderId,
  receiverId,
  senderName,
  senderAvatar,
  isGroup
}) => {
  const { profile } = useAuth();
  const { showToast, settings } = useNotifications();

  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [mediaToEdit, setMediaToEdit] = useState<ActiveMediaToEdit | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  const [showVoicePermissionModal, setShowVoicePermissionModal] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([15, 20, 25, 18, 30, 22, 16, 28, 35, 20]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simWaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recordedWaveformSamples = useRef<number[]>([]);

  // Close attachment menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(e.target as Node)
      ) {
        setShowAttachmentMenu(false);
      }
    };
    if (showAttachmentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachmentMenu]);

  // Handle clipboard paste (e.g. Ctrl+V screenshots or copied images)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          openImageInEditor(file);
          break;
        }
      }
    }
  };

  const openImageInEditor = (file: File | Blob) => {
    if (file.size > 100 * 1024 * 1024) {
      showToast('error', 'Image exceeds the maximum allowed size of 100MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMediaToEdit({
        file,
        previewUrl: reader.result as string,
        mediaType: 'image',
        fileName: file instanceof File ? file.name : `screenshot_${Date.now()}.jpg`
      });
    };
    reader.readAsDataURL(file);
  };

  const openVideoInEditor = (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      showToast('error', 'Video exceeds the maximum allowed size of 100MB.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setMediaToEdit({
      file,
      previewUrl,
      mediaType: 'video',
      fileName: file.name
    });
  };

  const handleMediaSend = async (
    editedBlob: Blob,
    caption: string,
    mediaType: 'image' | 'video',
    metadata: { fileName: string; duration?: number; size: number }
  ) => {
    try {
      setIsUploading(true);
      setUploadProgress(15);

      const path =
        mediaType === 'image'
          ? `chats/${conversationId}/images/${Date.now()}_${metadata.fileName}`
          : `chats/${conversationId}/videos/${Date.now()}_${metadata.fileName}`;

      const url = await uploadMediaFile(path, editedBlob, (p) => {
        setUploadProgress(p);
      });

      await sendMessage(conversationId, senderId, receiverId, {
        text: caption || undefined,
        type: mediaType,
        fileUrl: url,
        fileName: metadata.fileName,
        fileSize: metadata.size,
        videoDuration: metadata.duration,
        senderName,
        senderAvatar
      });

      if (settings.sounds) playSentSound();
      showToast('success', `${mediaType === 'image' ? 'Image' : 'Video'} sent!`);
    } catch (err) {
      showToast('error', `Failed to send ${mediaType}.`);
      console.error('Media send error:', err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setMediaToEdit(null);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Typing status triggers
    setTypingStatus(conversationId, senderId, true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setTypingStatus(conversationId, senderId, false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (isUploading) return;
    if (profile?.isLocked) {
      showToast('error', 'Your messaging privileges are locked.');
      return;
    }

    // Standard Text Message
    const clean = text.trim();
    if (!clean) return;

    setText('');
    setTypingStatus(conversationId, senderId, false);

    try {
      await sendMessage(conversationId, senderId, receiverId, {
        text: clean,
        type: 'text',
        senderName,
        senderAvatar
      });

      if (settings.sounds) playSentSound();
      textareaRef.current?.focus();
    } catch (err) {
      showToast('error', 'Failed to send message.');
      console.error('Send error:', err);
    }
  };

  const handleImagePickerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setShowAttachmentMenu(false);
    openImageInEditor(file);
  };

  const handleVideoPickerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setShowAttachmentMenu(false);
    openVideoInEditor(file);
  };

  const handleGeneralFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setShowAttachmentMenu(false);

    if (file.size > 100 * 1024 * 1024) {
      showToast('error', 'File size exceeds the maximum limit of 100MB.');
      return;
    }

    if (file.type.startsWith('image/')) {
      openImageInEditor(file);
      return;
    }

    if (file.type.startsWith('video/')) {
      openVideoInEditor(file);
      return;
    }

    // Document file upload
    try {
      setIsUploading(true);
      setUploadProgress(10);

      const path = `chats/${conversationId}/files/${Date.now()}_${file.name}`;
      const url = await uploadMediaFile(path, file, (p) => {
        setUploadProgress(p);
      });

      await sendMessage(conversationId, senderId, receiverId, {
        text: file.name,
        type: 'file',
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size,
        senderName,
        senderAvatar
      });

      if (settings.sounds) playSentSound();
      showToast('success', 'Document sent!');
    } catch (err) {
      showToast('error', 'Failed to upload document.');
      console.error('Document upload error:', err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  // ==========================================
  // REALISTIC AUDIO / VOICE RECORDING SYSTEM
  // ==========================================
  const startVoiceRecordingWithStream = (stream: MediaStream) => {
    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordedWaveformSamples.current = [];
      setIsSimulatedMode(false);

      // Setup Web Audio analyser for realistic waveform animation
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const sampleAudio = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          const normalized = Math.min(100, Math.max(15, Math.round((average / 128) * 100)));
          
          setLiveWaveform((prev) => {
            const next = [...prev.slice(1), normalized];
            return next;
          });

          recordedWaveformSamples.current.push(normalized);
          animFrameRef.current = requestAnimationFrame(sampleAudio);
        };

        animFrameRef.current = requestAnimationFrame(sampleAudio);
      } catch (err) {
        console.warn('AudioContext not supported, using fallback waveform', err);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
      return true;
    } catch (err) {
      console.warn('MediaRecorder error:', err);
      return false;
    }
  };

  const startVoiceRecording = async () => {
    if (profile?.isLocked) {
      showToast('error', 'Your messaging privileges are locked.');
      return;
    }
    setShowAttachmentMenu(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setShowVoicePermissionModal(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startVoiceRecordingWithStream(stream);
    } catch (err) {
      console.warn('Microphone permission needed or blocked:', err);
      // Display friendly permission guidance modal instead of harsh error toast
      setShowVoicePermissionModal(true);
    }
  };

  const handleRequestVoicePermission = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const started = startVoiceRecordingWithStream(stream);
      return started;
    } catch (err) {
      console.warn('Could not grant mic access:', err);
      return false;
    }
  };

  const startSimulatedVoiceRecording = () => {
    cleanupAudioRecording();
    setIsSimulatedMode(true);
    setIsRecording(true);
    setIsPaused(false);
    setRecordingSeconds(0);
    recordedWaveformSamples.current = [];

    // Simulate natural human voice waveform fluctuations
    simWaveIntervalRef.current = setInterval(() => {
      const randomLevel = Math.floor(25 + Math.random() * 65);
      setLiveWaveform((prev) => [...prev.slice(1), randomLevel]);
      recordedWaveformSamples.current.push(randomLevel);
    }, 150);

    recordIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const togglePauseVoiceRecording = () => {
    if (isSimulatedMode) {
      if (isPaused) {
        setIsPaused(false);
        simWaveIntervalRef.current = setInterval(() => {
          const randomLevel = Math.floor(25 + Math.random() * 65);
          setLiveWaveform((prev) => [...prev.slice(1), randomLevel]);
          recordedWaveformSamples.current.push(randomLevel);
        }, 150);
        recordIntervalRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      } else {
        setIsPaused(true);
        if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
        if (simWaveIntervalRef.current) clearInterval(simWaveIntervalRef.current);
      }
      return;
    }

    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    }
  };

  const cleanupAudioRecording = () => {
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    if (simWaveIntervalRef.current) clearInterval(simWaveIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setIsPaused(false);
    setIsSimulatedMode(false);
    setRecordingSeconds(0);
  };

  const cancelVoiceRecording = () => {
    cleanupAudioRecording();
    showToast('info', 'Voice recording discarded');
  };

  const stopAndSendVoiceRecording = async () => {
    const finalDuration = Math.max(1, recordingSeconds);
    const capturedSamples = [...recordedWaveformSamples.current];

    // Pick 28 evenly spaced waveform points
    const downsampledWaveform: number[] = [];
    const step = Math.max(1, Math.floor(capturedSamples.length / 28));
    for (let i = 0; i < 28; i++) {
      const sample = capturedSamples[i * step] || Math.floor(20 + Math.random() * 60);
      downsampledWaveform.push(sample);
    }

    if (isSimulatedMode) {
      cleanupAudioRecording();
      try {
        setIsUploading(true);
        setUploadProgress(25);

        const syntheticBlob = await generateSyntheticAudioBlob(finalDuration);
        const fileName = `voice_${Date.now()}.wav`;
        const path = `chats/${conversationId}/audio/${fileName}`;

        const url = await uploadMediaFile(path, syntheticBlob, (p) => {
          setUploadProgress(p);
        });

        await sendMessage(conversationId, senderId, receiverId, {
          text: `Voice note (${Math.floor(finalDuration / 60)}:${finalDuration % 60 < 10 ? '0' : ''}${finalDuration % 60})`,
          type: 'audio',
          fileUrl: url,
          fileName,
          fileSize: syntheticBlob.size,
          audioDuration: finalDuration,
          audioWaveform: downsampledWaveform,
          senderName,
          senderAvatar
        });

        if (settings.sounds) playSentSound();
        showToast('success', 'Voice note sent!');
      } catch (err) {
        showToast('error', 'Failed to send voice note.');
        console.error('Audio upload error:', err);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
      return;
    }

    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || 'audio/webm'
      });

      cleanupAudioRecording();

      try {
        setIsUploading(true);
        setUploadProgress(20);

        const fileName = `voice_${Date.now()}.webm`;
        const path = `chats/${conversationId}/audio/${fileName}`;

        const url = await uploadMediaFile(path, audioBlob, (p) => {
          setUploadProgress(p);
        });

        await sendMessage(conversationId, senderId, receiverId, {
          text: `Voice note (${Math.floor(finalDuration / 60)}:${finalDuration % 60 < 10 ? '0' : ''}${finalDuration % 60})`,
          type: 'audio',
          fileUrl: url,
          fileName,
          fileSize: audioBlob.size,
          audioDuration: finalDuration,
          audioWaveform: downsampledWaveform,
          senderName,
          senderAvatar
        });

        if (settings.sounds) playSentSound();
        showToast('success', 'Voice note sent!');
      } catch (err) {
        showToast('error', 'Failed to send voice note.');
        console.error('Audio upload error:', err);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    };

    mediaRecorderRef.current.stop();
  };

  // If user is locked from messaging by admin
  if (profile?.isLocked) {
    return (
      <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-t border-rose-200 dark:border-rose-900 flex items-center justify-center gap-2.5 text-rose-700 dark:text-rose-300">
        <Lock className="w-5 h-5 flex-shrink-0" />
        <p className="text-xs font-bold tracking-tight">
          Your messaging privileges have been suspended by an administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-white dark:bg-[#0d1117] border-t border-slate-200 dark:border-[#1e2530] relative select-none">
      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100 dark:bg-blue-950 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300 rounded-r-full"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Media Editor Modal for Image & Video */}
      {mediaToEdit && (
        <MediaEditorModal
          file={mediaToEdit.file}
          previewUrl={mediaToEdit.previewUrl}
          mediaType={mediaToEdit.mediaType}
          fileName={mediaToEdit.fileName}
          onSend={handleMediaSend}
          onClose={() => setMediaToEdit(null)}
        />
      )}

      {/* Emoji Picker Modal */}
      {showEmoji && (
        <EmojiPickerModal
          onSelectEmoji={handleEmojiSelect}
          onClose={() => setShowEmoji(false)}
        />
      )}

      {/* Voice & Microphone Permission Guidance Modal */}
      <VoicePermissionModal
        isOpen={showVoicePermissionModal}
        onClose={() => setShowVoicePermissionModal(false)}
        onRequestPermission={handleRequestVoicePermission}
        onStartSimulatedVoice={startSimulatedVoiceRecording}
      />

      {/* Voice Recording Mode (WhatsApp / Instagram realistic layout) */}
      {isRecording ? (
        <div className="flex items-center justify-between bg-slate-50 dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-2xl px-4 py-2.5 animate-in fade-in">
          {/* Pulsing Recording Indicator & Timer */}
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${
                isPaused ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
              }`}
            />
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-white">
              {Math.floor(recordingSeconds / 60)}:
              {recordingSeconds % 60 < 10 ? `0${recordingSeconds % 60}` : recordingSeconds % 60}
            </span>
          </div>

          {/* Live Dynamic Waveform Visualizer */}
          <div className="flex-1 max-w-xs mx-4 flex items-center justify-center gap-1 h-6">
            {liveWaveform.map((height, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-blue-600 dark:bg-blue-400 transition-all duration-75"
                style={{
                  height: `${Math.max(4, Math.round((height / 100) * 24))}px`,
                  opacity: isPaused ? 0.4 : 1
                }}
              />
            ))}
          </div>

          {/* Controls: Discard, Pause/Resume, Send */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelVoiceRecording}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
              title="Discard Recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePauseVoiceRecording}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#0d1117] transition cursor-pointer"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={stopAndSendVoiceRecording}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/20 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      ) : (
        /* Standard Composer with Unified WhatsApp Attachment Hub */
        <div className="flex items-end gap-2 relative">
          {/* Hidden File Pickers */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImagePickerChange}
            accept="image/*"
            className="hidden"
            id="chat-unified-image-input"
          />

          <input
            type="file"
            ref={videoInputRef}
            onChange={handleVideoPickerChange}
            accept="video/*"
            className="hidden"
            id="chat-unified-video-input"
          />

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleGeneralFileUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,image/*,video/*"
            className="hidden"
            id="chat-unified-doc-input"
          />

          {/* Unified WhatsApp-style Attachment Trigger Button */}
          <div className="relative" ref={attachmentMenuRef}>
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              disabled={isUploading}
              className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
                showAttachmentMenu
                  ? 'bg-blue-600 text-white rotate-45 shadow-md shadow-blue-900/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#161b22] hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Add Attachments & Media"
              aria-label="Add attachment"
            >
              <Plus className="w-5 h-5 transition-transform duration-200" />
            </button>

            {/* WhatsApp Unified Attachment Popup */}
            {showAttachmentMenu && (
              <div className="absolute bottom-12 left-0 z-40 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-2xl p-3 shadow-2xl w-64 animate-in fade-in slide-in-from-bottom-3 duration-200">
                <div className="grid grid-cols-3 gap-2">
                  {/* Photos / Gallery */}
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#0d1117] transition cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Photos</span>
                  </button>

                  {/* Videos */}
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#0d1117] transition cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <Video className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Videos</span>
                  </button>

                  {/* Documents */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#0d1117] transition cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Documents</span>
                  </button>

                  {/* Emojis */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      setShowEmoji(true);
                    }}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#0d1117] transition cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <Smile className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Emojis</span>
                  </button>

                  {/* Stickers / GIFs */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      setShowEmoji(true);
                    }}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#0d1117] transition cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Stickers</span>
                  </button>

                  {/* Audio Note */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      startVoiceRecording();
                    }}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#0d1117] transition cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <Mic className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Audio Note</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Multiline Text Input with Paste Support */}
          <div className="flex-1 bg-slate-100 dark:bg-[#161b22] border border-transparent dark:border-[#1e2530] rounded-xl px-4 py-2.5 flex items-center focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-500/50 transition">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                isUploading
                  ? `Sending attachment (${uploadProgress}%)...`
                  : isGroup
                  ? 'Message in group... (Paste images directly)'
                  : 'Type a message... (Paste images directly)'
              }
              disabled={isUploading}
              rows={1}
              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none focus:outline-none max-h-32 min-h-[22px]"
            />
          </div>

          {/* Send or Voice Note Mic Button */}
          {text.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={isUploading}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white transition shadow-lg shadow-blue-900/20 flex items-center justify-center cursor-pointer"
              title="Send message (Enter)"
              aria-label="Send message"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={startVoiceRecording}
              className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer flex items-center justify-center"
              title="Hold or click to record realistic voice note"
              aria-label="Record voice note"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
