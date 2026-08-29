import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Sparkles,
  Pencil,
  Type,
  Crop,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Undo2,
  Trash2,
  Smile,
  Check,
  Loader2,
  Maximize2
} from 'lucide-react';
import { EmojiPickerModal } from './EmojiPickerModal';

interface MediaEditorModalProps {
  file: File | Blob;
  previewUrl: string;
  mediaType: 'image' | 'video';
  fileName?: string;
  onSend: (
    editedBlob: Blob,
    caption: string,
    mediaType: 'image' | 'video',
    metadata: { fileName: string; duration?: number; size: number }
  ) => Promise<void>;
  onClose: () => void;
}

type EditorTab = 'filters' | 'adjust' | 'transform' | 'draw' | 'text' | 'preview';

interface TextOverlay {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  color: string;
  bgColor: boolean;
  fontSize: number;
}

interface DrawStroke {
  points: { x: number; y: number }[];
  color: string;
  size: number;
  isEraser: boolean;
}

const FILTER_PRESETS = [
  { id: 'normal', name: 'Normal', filter: 'none' },
  { id: 'vivid', name: 'Vivid', filter: 'contrast(1.25) saturate(1.35) brightness(1.05)' },
  { id: 'warm', name: 'Warm', filter: 'sepia(0.35) saturate(1.25) hue-rotate(-15deg)' },
  { id: 'cool', name: 'Cool', filter: 'hue-rotate(25deg) saturate(1.15) brightness(1.02)' },
  { id: 'mono', name: 'B&W', filter: 'grayscale(1) contrast(1.2)' },
  { id: 'sepia', name: 'Sepia', filter: 'sepia(0.9) contrast(1.1)' },
  { id: 'vintage', name: 'Vintage', filter: 'sepia(0.4) contrast(1.2) brightness(0.9) saturate(1.1)' },
  { id: 'dramatic', name: 'Dramatic', filter: 'contrast(1.5) brightness(0.85) saturate(1.1)' },
  { id: 'cyber', name: 'Neon', filter: 'saturate(1.8) hue-rotate(90deg) contrast(1.2)' }
];

const COLOR_PALETTE = [
  '#ffffff',
  '#000000',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899'
];

export const MediaEditorModal: React.FC<MediaEditorModalProps> = ({
  file,
  previewUrl,
  mediaType,
  fileName,
  onSend,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>(mediaType === 'image' ? 'filters' : 'preview');
  const [caption, setCaption] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Image editing states
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [brightness, setBrightness] = useState(0); // -50 to 50
  const [contrast, setContrast] = useState(0); // -50 to 50
  const [saturation, setSaturation] = useState(0); // -50 to 50
  const [blur, setBlur] = useState(0); // 0 to 10
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'free' | '1:1' | '4:5' | '16:9' | '9:16'>('free');

  // Drawing states
  const [brushColor, setBrushColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Text overlay states
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [newTextString, setNewTextString] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textBgColor, setTextBgColor] = useState(true);

  // Video playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Refs
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const currentStrokeRef = useRef<DrawStroke | null>(null);

  // Video duration & time listener
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime || 0);
    }
  };

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleVideoSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Drawing Canvas logic
  const handleDrawStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTab !== 'draw' || !drawCanvasRef.current) return;
    setIsDrawing(true);

    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    currentStrokeRef.current = {
      points: [{ x, y }],
      color: brushColor,
      size: brushSize,
      isEraser
    };
  };

  const handleDrawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStrokeRef.current || !drawCanvasRef.current) return;

    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    currentStrokeRef.current.points.push({ x, y });
    renderDrawCanvas();
  };

  const handleDrawEnd = () => {
    if (!isDrawing || !currentStrokeRef.current) return;
    setIsDrawing(false);
    setStrokes((prev) => [...prev, currentStrokeRef.current!]);
    currentStrokeRef.current = null;
  };

  const renderDrawCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allStrokes = currentStrokeRef.current
      ? [...strokes, currentStrokeRef.current]
      : strokes;

    allStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });

    ctx.globalCompositeOperation = 'source-over';
  };

  useEffect(() => {
    renderDrawCanvas();
  }, [strokes]);

  // Add text sticker
  const handleAddText = () => {
    if (!newTextString.trim()) return;
    const newText: TextOverlay = {
      id: `text_${Date.now()}`,
      text: newTextString.trim(),
      x: 50,
      y: 50,
      color: textColor,
      bgColor: textBgColor,
      fontSize: 20
    };
    setTextOverlays((prev) => [...prev, newText]);
    setNewTextString('');
  };

  const removeText = (id: string) => {
    setTextOverlays((prev) => prev.filter((t) => t.id !== id));
  };

  // Reset all filters & adjustments
  const handleResetAll = () => {
    setSelectedFilter('normal');
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setBlur(0);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAspectRatio('free');
    setStrokes([]);
    setTextOverlays([]);
  };

  // Calculate live CSS Filter String
  const computeCSSFilter = () => {
    const preset = FILTER_PRESETS.find((f) => f.id === selectedFilter)?.filter || 'none';
    const brightnessVal = 1 + brightness / 100;
    const contrastVal = 1 + contrast / 100;
    const saturationVal = 1 + saturation / 100;
    const blurVal = blur > 0 ? `blur(${blur}px)` : '';

    let filterStr = `brightness(${brightnessVal}) contrast(${contrastVal}) saturate(${saturationVal}) ${blurVal}`;
    if (preset !== 'none') {
      filterStr = `${filterStr} ${preset}`;
    }
    return filterStr;
  };

  // Export edited canvas to Blob
  const generateEditedImageBlob = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = previewUrl;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const isRotated90or270 = rotation === 90 || rotation === 270;
        const width = isRotated90or270 ? img.height : img.width;
        const height = isRotated90or270 ? img.width : img.height;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Apply transforms
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.filter = computeCSSFilter();

        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        // Overlay drawing strokes
        if (strokes.length > 0 && drawCanvasRef.current) {
          ctx.drawImage(drawCanvasRef.current, 0, 0, width, height);
        }

        // Overlay text stickers
        textOverlays.forEach((item) => {
          ctx.save();
          const posX = (item.x / 100) * width;
          const posY = (item.y / 100) * height;
          ctx.font = `bold ${Math.round((item.fontSize / 300) * width)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (item.bgColor) {
            const metrics = ctx.measureText(item.text);
            const padding = 16;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.roundRect?.(
              posX - metrics.width / 2 - padding,
              posY - 24 - padding / 2,
              metrics.width + padding * 2,
              48 + padding,
              12
            );
            ctx.fill();
          }

          ctx.fillStyle = item.color;
          ctx.fillText(item.text, posX, posY);
          ctx.restore();
        });

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else resolve(file);
          },
          'image/jpeg',
          0.85
        );
      };

      img.onerror = () => resolve(file);
    });
  };

  // Submit and send
  const handleFinalSend = async () => {
    try {
      setIsSending(true);
      if (mediaType === 'image') {
        const finalBlob = await generateEditedImageBlob();
        const safeName = fileName || `image_${Date.now()}.jpg`;
        await onSend(finalBlob, caption.trim(), 'image', {
          fileName: safeName,
          size: finalBlob.size
        });
      } else {
        // Video file
        const safeName = fileName || `video_${Date.now()}.mp4`;
        await onSend(file, caption.trim(), 'video', {
          fileName: safeName,
          duration: duration || undefined,
          size: file.size
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to send media:', err);
    } finally {
      setIsSending(false);
    }
  };

  const formatVideoTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-lg animate-in fade-in select-none">
      {/* Top Navigation & Tool Switcher */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800 text-white z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Discard & close"
            aria-label="Discard"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{mediaType === 'image' ? 'Edit Photo' : 'Preview Video'}</span>
              <span className="text-[11px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </h2>
          </div>
        </div>

        {/* Toolbar Tabs for Image */}
        {mediaType === 'image' && (
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 overflow-x-auto">
            <button
              onClick={() => setActiveTab('filters')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'filters'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
            <button
              onClick={() => setActiveTab('adjust')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'adjust'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Adjust</span>
            </button>
            <button
              onClick={() => setActiveTab('transform')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'transform'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crop className="w-3.5 h-3.5" />
              <span>Crop & Rotate</span>
            </button>
            <button
              onClick={() => setActiveTab('draw')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'draw'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Draw</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'text'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Stickers</span>
            </button>
          </div>
        )}

        {/* Reset Action */}
        {mediaType === 'image' && (
          <button
            onClick={handleResetAll}
            className="text-xs text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-xl hover:bg-slate-800/80 transition"
            title="Reset all adjustments"
          >
            Reset
          </button>
        )}
      </div>

      {/* Main Visual Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Central Media Canvas */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden relative">
          {mediaType === 'image' ? (
            <div className="relative max-h-[62vh] max-w-[85vw] flex items-center justify-center">
              {/* Target Image with CSS transformations applied */}
              <img
                ref={imageRef}
                src={previewUrl}
                alt="Editing target"
                style={{
                  filter: computeCSSFilter(),
                  transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                  aspectRatio:
                    aspectRatio === '1:1'
                      ? '1/1'
                      : aspectRatio === '4:5'
                      ? '4/5'
                      : aspectRatio === '16:9'
                      ? '16/9'
                      : aspectRatio === '9:16'
                      ? '9/16'
                      : 'auto'
                }}
                className="max-h-[62vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl transition-all duration-150"
              />

              {/* Drawing Layer on Top */}
              <canvas
                ref={drawCanvasRef}
                width={800}
                height={800}
                onMouseDown={handleDrawStart}
                onMouseMove={handleDrawMove}
                onMouseUp={handleDrawEnd}
                onTouchStart={handleDrawStart}
                onTouchMove={handleDrawMove}
                onTouchEnd={handleDrawEnd}
                className={`absolute inset-0 w-full h-full rounded-2xl ${
                  activeTab === 'draw' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
                }`}
              />

              {/* Text Overlays Layer */}
              {textOverlays.map((item) => (
                <div
                  key={item.id}
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    transform: 'translate(-50%, -50%)',
                    color: item.color
                  }}
                  className={`absolute font-bold text-sm sm:text-base px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 group select-none ${
                    item.bgColor ? 'bg-black/70 backdrop-blur-xs' : ''
                  }`}
                >
                  <span>{item.text}</span>
                  <button
                    onClick={() => removeText(item.id)}
                    className="p-1 rounded-full bg-rose-600/80 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-700 transition"
                    title="Remove sticker"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Custom Video Player with Rich Controls */
            <div className="relative max-h-[65vh] max-w-[85vw] rounded-2xl overflow-hidden shadow-2xl bg-black flex flex-col items-center justify-center group">
              <video
                ref={videoRef}
                src={previewUrl}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onClick={toggleVideoPlay}
                muted={isMuted}
                playsInline
                className="max-h-[58vh] max-w-[85vw] object-contain cursor-pointer rounded-2xl"
              />

              {/* Center Play/Pause Overlay */}
              {!isPlaying && (
                <button
                  onClick={toggleVideoPlay}
                  className="absolute p-5 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white shadow-2xl transition transform hover:scale-110 cursor-pointer"
                  title="Play video"
                  aria-label="Play video"
                >
                  <Play className="w-8 h-8 fill-current translate-x-0.5" />
                </button>
              )}

              {/* Video Timeline & Controls Bar */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 opacity-90 group-hover:opacity-100 transition">
                {/* Scrubber */}
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleVideoSeek}
                  className="w-full accent-blue-500 h-1.5 bg-white/20 rounded-lg cursor-pointer"
                />

                <div className="flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleVideoPlay}
                      className="p-1 rounded text-white hover:text-blue-400 transition"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>
                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.muted = !isMuted;
                          setIsMuted(!isMuted);
                        }
                      }}
                      className="p-1 rounded text-white hover:text-blue-400 transition"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <span>
                      {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-300 font-mono">
                      Speed:
                    </span>
                    {[1, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.playbackRate = rate;
                            setPlaybackRate(rate);
                          }
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          playbackRate === rate ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side/Bottom Editing Panel for Active Tool */}
        {mediaType === 'image' && (
          <div className="w-full md:w-80 bg-slate-900/90 border-t md:border-t-0 md:border-l border-slate-800 p-4 overflow-y-auto max-h-56 md:max-h-none flex flex-col gap-4 text-white">
            {/* Filters View */}
            {activeTab === 'filters' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Preset Filters
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {FILTER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedFilter(preset.id)}
                      className={`p-2 rounded-xl text-center border transition flex flex-col items-center gap-1 ${
                        selectedFilter === preset.id
                          ? 'border-blue-500 bg-blue-600/20 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-medium">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Adjust View */}
            {activeTab === 'adjust' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Color & Lighting
                </h3>

                {/* Brightness */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Brightness</span>
                    <span className="text-slate-400">{brightness > 0 ? `+${brightness}` : brightness}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Contrast</span>
                    <span className="text-slate-400">{contrast > 0 ? `+${contrast}` : contrast}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Saturation</span>
                    <span className="text-slate-400">{saturation > 0 ? `+${saturation}` : saturation}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Blur */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Blur Effect</span>
                    <span className="text-slate-400">{blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={blur}
                    onChange={(e) => setBlur(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Transform & Crop View */}
            {activeTab === 'transform' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Orientation & Presets
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <RotateCw className="w-4 h-4 text-blue-400" />
                    <span>Rotate 90°</span>
                  </button>

                  <button
                    onClick={() => setFlipH(!flipH)}
                    className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <FlipHorizontal className="w-4 h-4 text-blue-400" />
                    <span>Flip Horiz</span>
                  </button>

                  <button
                    onClick={() => setFlipV(!flipV)}
                    className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <FlipVertical className="w-4 h-4 text-blue-400" />
                    <span>Flip Vert</span>
                  </button>

                  <button
                    onClick={() => setRotation(0)}
                    className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 text-slate-400 hover:text-white"
                  >
                    <span>Reset Angle</span>
                  </button>
                </div>

                <div className="space-y-1.5 pt-2">
                  <span className="text-xs text-slate-400">Aspect Ratio Fit</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['free', '1:1', '4:5', '16:9', '9:16'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`p-1.5 rounded-lg text-xs font-medium border ${
                          aspectRatio === ratio
                            ? 'border-blue-500 bg-blue-600/30 text-white'
                            : 'border-slate-800 bg-slate-800/30 text-slate-400 hover:text-white'
                        }`}
                      >
                        {ratio === 'free' ? 'Original' : ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Draw View */}
            {activeTab === 'draw' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Brush & Markup
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setStrokes((prev) => prev.slice(0, -1))}
                      disabled={strokes.length === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
                      title="Undo stroke"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setStrokes([])}
                      disabled={strokes.length === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-30"
                      title="Clear drawing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Color selection */}
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400">Color</span>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setBrushColor(color);
                          setIsEraser(false);
                        }}
                        style={{ backgroundColor: color }}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          brushColor === color && !isEraser
                            ? 'border-white scale-125 shadow-md'
                            : 'border-transparent hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Brush size */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Brush Size</span>
                    <span className="text-slate-400">{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="24"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => setIsEraser(!isEraser)}
                  className={`w-full py-2 rounded-xl text-xs font-bold border transition ${
                    isEraser
                      ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {isEraser ? 'Eraser Mode (Active)' : 'Switch to Eraser'}
                </button>
              </div>
            )}

            {/* Text & Stickers View */}
            {activeTab === 'text' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Add Text Overlay
                </h3>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={newTextString}
                    onChange={(e) => setNewTextString(e.target.value)}
                    placeholder="Enter sticker text..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddText();
                    }}
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {['#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6'].map((col) => (
                        <button
                          key={col}
                          onClick={() => setTextColor(col)}
                          style={{ backgroundColor: col }}
                          className={`w-5 h-5 rounded-full border ${
                            textColor === col ? 'border-white ring-2 ring-blue-500' : 'border-transparent'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => setTextBgColor(!textBgColor)}
                      className={`text-[10px] px-2 py-1 rounded-lg font-bold border ${
                        textBgColor
                          ? 'bg-slate-800 border-blue-500 text-blue-400'
                          : 'bg-transparent border-slate-700 text-slate-400'
                      }`}
                    >
                      Dark Badge
                    </button>
                  </div>

                  <button
                    onClick={handleAddText}
                    disabled={!newTextString.trim()}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Add Sticker
                  </button>
                </div>

                {/* Emoji Quick Stickers */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs text-slate-400">Quick Emojis</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['🔥', '❤️', '⭐', '👍', '🎉', '😂', '🚀', '💯', '✨', '⚡'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setTextOverlays((prev) => [
                            ...prev,
                            {
                              id: `emoji_${Date.now()}_${emoji}`,
                              text: emoji,
                              x: 50,
                              y: 50,
                              color: '#ffffff',
                              bgColor: false,
                              fontSize: 32
                            }
                          ]);
                        }}
                        className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-lg hover:scale-125 transition transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Caption Input & Send Action Bar */}
      <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-2 z-20">
        {/* Emoji Toggle */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Add Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {showEmojiPicker && (
          <EmojiPickerModal
            onSelectEmoji={(emoji) => setCaption((prev) => prev + emoji)}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}

        {/* Caption Field */}
        <div className="flex-1 bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-2 flex items-center">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFinalSend();
            }}
            placeholder="Add a caption..."
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleFinalSend}
          disabled={isSending}
          className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-sm shadow-xl shadow-blue-600/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Send</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
