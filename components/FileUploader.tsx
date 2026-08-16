'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileAudio, FileVideo, Loader2 } from 'lucide-react';

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

// 2GB = 2048MB
const MAX_SIZE_MB = 2048;

// Magic bytes para validação real de tipo de arquivo (anti-spoofing)
const FILE_SIGNATURES: Record<string, number[][]> = {
  'audio/mpeg': [[0xFF, 0xFB], [0xFF, 0xF3], [0xFF, 0xF2]], // MP3
  'audio/wav': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WAV)
  'audio/mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]], // M4A/MP4
  'audio/x-m4a': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]], // M4A
  'audio/webm': [[0x1A, 0x45, 0xDF, 0xA3]], // WebM/MKV
  'audio/ogg': [[0x4F, 0x67, 0x67, 0x53]], // OggS (OGG)
  'video/mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]], // MP4
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]], // WebM
  'video/quicktime': [[0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70]], // MOV
  'video/x-msvideo': [[0x52, 0x49, 0x46, 0x46]], // AVI (RIFF)
};

// Validar assinatura do arquivo (magic bytes)
async function validateFileSignature(file: File, expectedType: string): Promise<boolean> {
  const signatures = FILE_SIGNATURES[expectedType];
  if (!signatures) return true; // Se não temos assinatura, permite (fallback)

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer, 0, 12);
      const match = signatures.some(sig => 
        sig.every((b, i) => bytes[i] === b)
      );
      resolve(match);
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

// Sanitizar nome do arquivo (prevenir path traversal, XSS)
function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"|?*\x00-\x1F]/g, '') // Remover caracteres perigosos
    .replace(/\.\.+/g, '.') // Prevenir path traversal
    .substring(0, 255); // Limitar comprimento
}

// Verificar se o arquivo é potencialmente malicioso
async function securityScan(file: File): Promise<{ safe: boolean; reason?: string }> {
  // 1. Verificar extensão vs MIME type
  const ext = file.name.split('.').pop()?.toLowerCase();
  const mimeExtMap: Record<string, string[]> = {
    'audio/mpeg': ['mp3'],
    'audio/wav': ['wav'],
    'audio/mp4': ['m4a', 'mp4'],
    'audio/x-m4a': ['m4a'],
    'audio/webm': ['webm'],
    'audio/ogg': ['ogg'],
    'video/mp4': ['mp4'],
    'video/webm': ['webm'],
    'video/quicktime': ['mov'],
    'video/x-msvideo': ['avi'],
  };
  
  const allowedExts = mimeExtMap[file.type];
  if (allowedExts && ext && !allowedExts.includes(ext)) {
    return { safe: false, reason: 'Extensão não corresponde ao tipo MIME' };
  }

  // 2. Verificar magic bytes
  const validSig = await validateFileSignature(file, file.type);
  if (!validSig) {
    return { safe: false, reason: 'Assinatura do arquivo inválida (possível spoofing)' };
  }

  // 3. Verificar tamanho mínimo (arquivos vazios ou muito pequenos)
  if (file.size < 100) {
    return { safe: false, reason: 'Arquivo muito pequeno ou vazio' };
  }

  return { safe: true };
}

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
      
      // Detectar se é vídeo ou áudio
      const isVideo = file.type.startsWith('video/');
      
      if (isVideo) {
                    // Para vídeo: usar elemento <video> para extrair áudio
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    video.crossOrigin = 'anonymous';
                    video.muted = true;
                    video.playsInline = true;

                    const objectUrl = URL.createObjectURL(file);
                    video.src = objectUrl;

                    video.onloadedmetadata = async () => {
                      try {
                        const duration = video.duration;

                        // Estratégia 1: Tentar OfflineAudioContext.createMediaStreamSource (navegadores modernos)
                        // @ts-expect-error - captureStream exists on HTMLVideoElement but not in TS types
                        const stream = video.captureStream();
                  
                        let audioData: Float32Array;

                        try {
                          // Tentar método moderno: OfflineAudioContext.createMediaStreamSource
                          const offlineContext = new OfflineAudioContext(
                            1, // mono
                            duration * 16000,
                            16000
                          );
                    
                          // @ts-expect-error - createMediaStreamSource exists on OfflineAudioContext but not in TS types
                          const source = offlineContext.createMediaStreamSource(stream);
                          source.connect(offlineContext.destination);

                          video.currentTime = 0;
                          await video.play();

                          const renderedBuffer = await offlineContext.startRendering();
                          audioData = renderedBuffer.getChannelData(0);
                        } catch (offlineError) {
                                                  // Estratégia 2: Fallback para navegadores sem OfflineAudioContext.createMediaStreamSource
                                                  // Usar audioContext principal + MediaRecorder
                                                  console.warn('[FileUploader] OfflineAudioContext.createMediaStreamSource não suportado, usando fallback MediaRecorder');

                                                  // Usar audioContext principal
                                                  const destination = audioContext.createMediaStreamDestination();
                                                  const mediaElementSource = audioContext.createMediaStreamSource(stream);
                                                  mediaElementSource.connect(destination);

                                                  // Gravar com MediaRecorder
                                                  const mediaRecorder = new MediaRecorder(destination.stream);
                                                  const chunks: BlobPart[] = [];

                                                  mediaRecorder.ondataavailable = (e) => {
                                                    if (e.data.size > 0) chunks.push(e.data);
                                                  };

                                                  // Função assíncrona para aguardar a gravação
                                                  const recordAndWait = async () => {
                                                    mediaRecorder.start();
                                                    video.currentTime = 0;
                                                    await video.play();

                                                    // Aguardar o vídeo terminar
                                                    await new Promise<void>((resolve) => {
                                                      video.onended = () => {
                                                        mediaRecorder.stop();
                                                        resolve();
                                                      };

                                                      // Timeout de segurança (duração + 5s)
                                                      setTimeout(() => {
                                                        if (mediaRecorder.state === 'recording') {
                                                          mediaRecorder.stop();
                                                          resolve();
                                                        }
                                                      }, (duration + 5) * 1000);
                                                    });
                                                  };

                                                  await recordAndWait();

                                                  // Decodificar o blob gravado
                                                  const blob = new Blob(chunks, { type: 'audio/webm' });
                                                  const arrayBuffer = await blob.arrayBuffer();
                                                  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                                                  // Resample para 16kHz mono usando OfflineAudioContext
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
                                                  audioData = renderedBuffer.getChannelData(0);
                                                }

                        URL.revokeObjectURL(objectUrl);

                        resolve({
                          audioData: new Float32Array(audioData),
                          duration: video.duration,
                        });
                      } catch (error) {
                        URL.revokeObjectURL(objectUrl);
                        reject(new Error(`Erro ao processar vídeo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`));
                      }
                    };

                    video.onerror = () => {
                      URL.revokeObjectURL(objectUrl);
                      reject(new Error('Erro ao carregar vídeo'));
                    };

                    // Carregar o vídeo
                    video.load();
                  } else {
        // Para áudio: usar decodeAudioData (método original)
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
      }
    });
  }, [getAudioContext]);

  const handleFile = useCallback(async (file: File) => {
    if (isProcessing) return;

    // Validar tipo
    if (!acceptedTypes.includes(file.type)) {
      onError(`Tipo de arquivo não suportado: ${file.type}. Use áudio (MP3, WAV, M4A, WebM) ou vídeo (MP4, WebM, MOV).`);
      return;
    }

    // Validar tamanho (2GB limit)
    if (file.size > maxSizeMB * 1024 * 1024) {
      onError(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: ${maxSizeMB}MB.`);
      return;
    }

    // Security scan (magic bytes, extension validation, etc.)
    const security = await securityScan(file);
    if (!security.safe) {
      onError(`Arquivo rejeitado por segurança: ${security.reason}`);
      return;
    }

    // Sanitizar nome do arquivo
    const sanitizedName = sanitizeFileName(file.name);
    if (sanitizedName !== file.name) {
      console.warn('[Security] Nome do arquivo sanitizado:', file.name, '->', sanitizedName);
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

      // Criar novo File object com nome sanitizado para o callback
      const sanitizedFile = new File([file], sanitizedName, { type: file.type });
      onFileSelect(sanitizedFile, audioData, duration);
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
              Tamanho máximo: {maxSizeMB >= 1024 ? `${(maxSizeMB / 1024).toFixed(1)}GB` : `${maxSizeMB}MB`}
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