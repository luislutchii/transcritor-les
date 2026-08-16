'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileAudio, FileVideo, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File, audioData: Float32Array, duration: number) => void;
  onError: (error: string) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

const ACCEPTED_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/webm',
  'audio/ogg',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
];

const MAX_SIZE_MB = 500;

export function FileUploader({
  onFileSelect,
  onError,
  maxSizeMB = MAX_SIZE_MB,
  acceptedTypes = ACCEPTED_TYPES,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
    }
    return audioContextRef.current;
  }, []);

  const extractAudioData = useCallback(async (file: File): Promise<{ audioData: Float32Array; duration: number }> => {
    return new Promise((resolve, reject) => {
      const audioContext = getAudioContext();
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          // Resample para 16kHz mono
          const offlineContext = new OfflineAudioContext(
            1,
            audioBuffer.duration * 16000,
            16000
          );

          const bufferSource = offlineContext.createBufferSource();
          bufferSource.buffer = audioBuffer;
          bufferSource.connect(offlineContext.destination);
          bufferSource.start(0);

          const renderedBuffer = await offlineContext.startRendering();
          const audioData = renderedBuffer.getChannelData(0);

          resolve({
            audioData: new Float32Array(audioData),
            duration: audioBuffer.duration,
          });
        } catch (error) {
          reject(new Error(`Erro ao processar áudio: ${error instanceof Error ? error.message : 'Erro desconhecido'}`));
        }
      };

      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  }, [getAudioContext]);

  const handleFile = useCallback(async (file: File) => {
    if (isProcessing) return;

    // Validar tipo
    if (!acceptedTypes.includes(file.type)) {
      onError(`Tipo de arquivo não suportado: ${file.type}. Use áudio (MP3, WAV, M4A, WebM) ou vídeo (MP4, WebM, MOV).`);
      return;
    }

    // Validar tamanho
    if (file.size > maxSizeMB * 1024 * 1024) {
      onError(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: ${maxSizeMB}MB.`);
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // Simular progresso de leitura
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 100);

      const { audioData, duration } = await extractAudioData(file);

      clearInterval(progressInterval);
      setProgress(100);

      onFileSelect(file, audioData, duration);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, [acceptedTypes, maxSizeMB, extractAudioData, onFileSelect, onError, isProcessing]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('video/')) return <FileVideo className="w-8 h-8" />;
    return <FileAudio className="w-8 h-8" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="relative w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={isProcessing}
      />

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
          ${isDragging ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-border/50 hover:border-primary/50'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
      >
        {isProcessing ? (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">Processando arquivo...</p>
              <p className="text-sm text-muted-foreground">{progress}%</p>
              <div className="w-full max-w-xs mx-auto h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">
              Arraste e solte ou clique para selecionar
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Áudio: MP3, WAV, M4A, WebM, OGG | Vídeo: MP4, WebM, MOV, AVI
            </p>
            <p className="text-xs text-muted-foreground">
              Tamanho máximo: {maxSizeMB}MB
            </p>
          </>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Preview do arquivo selecionado durante processamento */}
      {isProcessing && progress > 0 && progress < 100 && (
        <div className="mt-4 glass rounded-lg p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Preparando arquivo...</p>
              <p className="text-xs text-muted-foreground">Extraindo áudio e convertendo para 16kHz mono</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}