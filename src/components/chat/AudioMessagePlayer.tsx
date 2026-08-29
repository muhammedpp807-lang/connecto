import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Volume2 } from 'lucide-react';

interface AudioMessagePlayerProps {
  audioUrl?: string;
  duration?: number;
  waveform?: number[];
  isMe: boolean;
}

export const AudioMessagePlayer: React.FC<AudioMessagePlayerProps> = ({
  audioUrl,
  duration = 5,
  waveform,
  isMe
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate realistic default waveform bars if none provided
  const bars = React.useMemo(() => {
    if (waveform && waveform.length > 0) return waveform;
    // 28 realistic voice amplitude heights
    return [
      25, 45, 70, 30, 85, 95, 60, 40, 75, 90, 50, 35, 65, 80, 100, 70, 45, 60,
      85, 95, 50, 40, 70, 55, 35, 60, 45, 30
    ];
  }, [waveform]);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current && !audioUrl) {
      // Simulation mode if audioUrl is a placeholder
      if (isPlaying) {
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        let cur = currentTime;
        const interval = setInterval(() => {
          cur += 0.25;
          if (cur >= duration) {
            clearInterval(interval);
            setIsPlaying(false);
            setCurrentTime(0);
          } else {
            setCurrentTime(cur);
          }
        }, 250);
      }
      return;
    }

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch((err) => {
        console.warn('Audio playback note:', err);
      });
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * (duration || 5);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const cycleSpeed = () => {
    const nextSpeed = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const effectiveDuration = duration || 5;
  const progressRatio = Math.min(1, currentTime / effectiveDuration);

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-3 py-1.5 min-w-[240px] max-w-xs select-none">
      {/* Play / Pause Circular Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md ${
          isMe
            ? 'bg-white text-blue-600 hover:bg-slate-100 shadow-blue-900/30'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-900/20'
        }`}
        aria-label={isPlaying ? 'Pause Voice Note' : 'Play Voice Note'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform Visualization & Time */}
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        <div
          onClick={handleSeek}
          className="h-7 flex items-center gap-[2.5px] cursor-pointer group"
          title="Click to seek"
        >
          {bars.map((height, idx) => {
            const barRatio = idx / bars.length;
            const isFilled = barRatio <= progressRatio;
            return (
              <div
                key={idx}
                className={`w-[3px] rounded-full transition-all duration-100 ${
                  isFilled
                    ? isMe
                      ? 'bg-white shadow-xs'
                      : 'bg-blue-600 dark:bg-blue-400'
                    : isMe
                    ? 'bg-blue-300/50 dark:bg-blue-300/40 group-hover:bg-blue-200/70'
                    : 'bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400'
                }`}
                style={{
                  height: `${Math.max(15, (height / 100) * 28)}px`
                }}
              />
            );
          })}
        </div>

        {/* Duration & Speed Controller */}
        <div className="flex items-center justify-between text-[11px] font-mono leading-none">
          <span className={isMe ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}>
            {isPlaying ? formatSecs(currentTime) : formatSecs(effectiveDuration)}
          </span>

          <button
            type="button"
            onClick={cycleSpeed}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight transition cursor-pointer ${
              isMe
                ? 'bg-blue-700/60 hover:bg-blue-700 text-blue-100'
                : 'bg-slate-200 dark:bg-[#0d1117] hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
            title="Cycle Playback Speed"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};
