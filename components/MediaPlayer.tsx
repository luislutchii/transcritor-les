'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Maximize2, Minimize2 } from 'lucide-react';

interface MediaPlayerProps {
  src: string | null;
  type: 'audio' | 'video';
  onTimeUpdate?: (currentTime: number) => void;
  onSeek?: (time: number) => void;
  className?: string;
}

export function MediaPlayer({ src, type, onTimeUpdate, onSeek, className = '' }: MediaPlayerProps) {
  const mediaRef = useRef<HTMLMediaElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const formatTime = useCallback((time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    const time = media.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    setDuration(media.duration);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (isPlaying) {
      media.pause();
    } else {
      media.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const media = mediaRef.current;
    if (!media || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    media.currentTime = newTime;
    setCurrentTime(newTime);
    onSeek?.(newTime);
  }, [duration, onSeek]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const media = mediaRef.current;
    if (!media) return;
    const newVolume = parseFloat(e.target.value);
    media.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (isMuted) {
      media.volume = volume;
      setIsMuted(false);
    } else {
      media.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const media = mediaRef.current;
    if (!media) return;

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        media.currentTime = Math.max(0, media.currentTime - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        media.currentTime = Math.min(duration, media.currentTime + 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        media.volume = Math.min(1, media.volume + 0.1);
        setVolume(media.volume);
        setIsMuted(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        media.volume = Math.max(0, media.volume - 0.1);
        setVolume(media.volume);
        setIsMuted(media.volume === 0);
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen();
        break;
    }
  }, [togglePlay, duration, toggleMute]);

  const toggleFullscreen = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (!isFullscreen) {
      media.requestFullscreen?.().catch(console.error);
    } else {
      document.exitFullscreen?.().catch(console.error);
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Sync src changes
  useEffect(() => {
    const media = mediaRef.current;
    if (media && src) {
      media.src = src;
      media.load();
    }
  }, [src, type]);

  if (!src) {
    return (
      <div className={`w-full aspect-video bg-secondary rounded-xl flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium mb-1">Nenhum arquivo carregado</p>
          <p className="text-sm">Selecione um arquivo de áudio ou vídeo para começar</p>
        </div>
      </div>
    );
  }

  const isVideo = type === 'video';
  const MediaElement = isVideo ? 'video' : 'audio';

  return (
    <div
      className={`relative w-full ${isVideo ? 'aspect-video' : 'h-24'} bg-black rounded-xl overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <MediaElement
        ref={mediaRef}
        src={src}
        type={isVideo ? 'video/mp4' : 'audio/mpeg'}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        playsInline
        crossOrigin="anonymous"
        className="w-full h-full object-contain"
      />

      {/* Overlay de controles */}
      <div
        className={`
          absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
          flex flex-col justify-end p-4 transition-opacity duration-300
          ${showControls || isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        {/* Barra de progresso */}
        <div
          className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group"
          onClick={handleSeek}
          role="slider"
          tabIndex={0}
          aria-label="Progresso da reprodução"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={duration > 0 ? Math.round((currentTime / duration) * 100) : 0}
          onKeyDown={(e) => {
            const media = mediaRef.current;
            if (!media || duration === 0) return;
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              media.currentTime = Math.max(0, media.currentTime - 5);
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              media.currentTime = Math.min(duration, media.currentTime + 5);
            }
          }}
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
          <div
            className="absolute top-1/2 left-0 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>

        {/* Tempo e controles */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-white/90 w-16 text-right">{formatTime(currentTime)}</span>

          <div className="flex items-center gap-3 flex-1 justify-center">
            <button
              onClick={() => { const media = mediaRef.current; if (media) media.currentTime = Math.max(0, media.currentTime - 10); }}
              className="p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Voltar 10s"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>

            <button
              onClick={() => { const media = mediaRef.current; if (media) media.currentTime = Math.min(duration, media.currentTime + 10); }}
              className="p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Avançar 10s"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          <span className="text-sm font-mono text-white/90 w-16">{formatTime(duration)}</span>

          {/* Controles de volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 text-white/80 hover:text-white transition-colors"
              aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-24 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-primary"
              aria-label="Volume"
            />
          </div>

          {/* Fullscreen (apenas vídeo) */}
          {isVideo && (
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/80 hover:text-white transition-colors ml-2"
              aria-label={isFullscreen ? 'Sair de tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Indicador de carregamento */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10" style={{ display: isPlaying ? 'none' : 'flex' }}>
        <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    </div>
  );
}