import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  audioURL: string;
  duration?: number;
  isSender?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioURL, duration = 0, isSender = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(Math.round(audio.currentTime));
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioURL]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((err) => console.error('Audio play error:', err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const targetTime = Number(e.target.value);
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Generate bar heights for wave visualizer
  const waveBars = [35, 65, 45, 90, 70, 40, 85, 60, 100, 50, 75, 30, 80, 55, 95, 40, 70, 85, 45, 60];

  return (
    <div
      className={`flex flex-col space-y-2 p-3 rounded-2xl min-w-[240px] max-w-[320px] border shadow-lg ${
        isSender
          ? 'bg-slate-900/90 border-[#00e5ff]/30 text-white'
          : 'bg-slate-900 border-white/10 text-slate-100'
      }`}
    >
      <audio ref={audioRef} src={audioURL} preload="metadata" />

      <div className="flex items-center space-x-3">
        <button
          onClick={togglePlay}
          className={`p-2.5 rounded-full transition-all flex items-center justify-center shrink-0 shadow-md ${
            isSender
              ? 'bg-[#00e5ff] text-slate-950 hover:bg-[#00e5ff]/90 shadow-[0_0_15px_rgba(0,229,255,0.4)]'
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        {/* Waveform Visualization Bars */}
        <div className="flex-1 flex items-center space-x-1 h-8 px-1">
          {waveBars.map((barHeight, idx) => {
            const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
            const isPassed = idx / waveBars.length <= progress;

            return (
              <div
                key={idx}
                style={{ height: `${barHeight}%` }}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isPassed
                    ? isSender
                      ? 'bg-[#00e5ff]'
                      : 'bg-emerald-400'
                    : 'bg-slate-700/80'
                }`}
              />
            );
          })}
        </div>

        <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors p-1">
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Seek Slider & Timer */}
      <div className="flex items-center space-x-2 px-1">
        <input
          type="range"
          min={0}
          max={totalDuration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00e5ff]"
        />
        <span className="text-[11px] font-mono text-slate-400 shrink-0">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>
    </div>
  );
};
