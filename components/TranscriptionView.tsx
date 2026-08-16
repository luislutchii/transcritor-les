'use client';

import { useState, useCallback, useRef } from 'react';
import { Copy, Download, FileText, FileCode, Check, Loader2, Globe, Languages } from 'lucide-react';

interface TranscriptionSegment {
  text: string;
  timestamp: [number, number];
}

interface TranscriptionViewProps {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
  onSeek: (time: number) => void;
  onCopy: () => void;
  onDownloadTxt: () => void;
  onDownloadSrt: () => void;
  isProcessing?: boolean;
  className?: string;
}

const LANGUAGES: Record<string, { code: string; name: string; flag: string }> = {
  auto: { code: 'auto', name: 'Detecção Automática', flag: '🌐' },
  pt: { code: 'pt', name: 'Português', flag: '🇧🇷' },
  en: { code: 'en', name: 'English', flag: '🇺🇸' },
  es: { code: 'es', name: 'Español', flag: '🇪🇸' },
  fr: { code: 'fr', name: 'Français', flag: '🇫🇷' },
  de: { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  it: { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  ja: { code: 'ja', name: '日本語', flag: '🇯🇵' },
  zh: { code: 'zh', name: '中文', flag: '🇨🇳' },
  ru: { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  ar: { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  hi: { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
};

function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function TranscriptionView({
  text,
  segments,
  language,
  duration,
  onSeek,
  onCopy,
  onDownloadTxt,
  onDownloadSrt,
  isProcessing = false,
  className = '',
}: TranscriptionViewProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(language || 'auto');
  const [copied, setCopied] = useState(false);
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'segments' | 'full'>('segments');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSegmentClick = useCallback((index: number) => {
    if (segments[index]) {
      onSeek(segments[index].timestamp[0]);
    }
  }, [segments, onSeek]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy();
    } catch {
      // Fallback
      if (textareaRef.current) {
        textareaRef.current.value = text;
        textareaRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onCopy();
      }
    }
  }, [text, onCopy]);

  const generateSrt = useCallback(() => {
    return segments
      .map((segment, index) => {
        const start = formatSrtTime(segment.timestamp[0]);
        const end = formatSrtTime(segment.timestamp[1]);
        return `${index + 1}\n${start} --> ${end}\n${segment.text.trim()}\n`;
      })
      .join('\n');
  }, [segments]);

  const handleDownloadSrt = useCallback(() => {
    const srtContent = generateSrt();
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcricao-${Date.now()}.srt`;
    a.click();
    URL.revokeObjectURL(url);
    onDownloadSrt();
  }, [generateSrt, onDownloadSrt]);

  const handleDownloadTxt = useCallback(() => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcricao-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onDownloadTxt();
  }, [text, onDownloadTxt]);

  if (isProcessing) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="glass rounded-xl p-6 text-center">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Transcrevendo...</h3>
          <p className="text-muted-foreground">O modelo está processando o áudio. Isso pode levar alguns instantes.</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <div>
              <p className="text-sm font-medium text-foreground">Inferência do modelo Whisper</p>
              <p className="text-xs text-muted-foreground">Executando no Web Worker (não bloqueia a interface)</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!text && segments.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="glass rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma transcrição ainda</h3>
          <p className="text-muted-foreground">Carregue um arquivo de áudio ou vídeo e clique em transcrever</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header com ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Transcrição</h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
            {segments.length} segmentos
          </span>
          <span className="px-2 py-0.5 text-xs font-medium bg-secondary text-muted-foreground rounded-full">
            {formatTimestamp(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de idioma */}
          <div className="relative">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="appearance-none bg-secondary border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {Object.entries(LANGUAGES).map(([code, lang]) => (
                <option key={code} value={code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
            <Globe className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Botões de ação */}
          <button
            onClick={handleCopy}
            disabled={!text}
            className="glass px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4" />
            {copied ? <Check className="w-4 h-4 text-green-400" /> : 'Copiar'}
          </button>

          <button
            onClick={handleDownloadTxt}
            disabled={!text}
            className="glass px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <FileText className="w-4 h-4" />
          </button>

          <button
            onClick={handleDownloadSrt}
            disabled={segments.length === 0}
            className="glass px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <FileCode className="w-4 h-4" />
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'segments' ? 'full' : 'segments')}
            className="glass px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-secondary/80 transition-colors"
          >
            {viewMode === 'segments' ? 'Texto Completo' : 'Segmentos'}
          </button>
        </div>
      </div>

      {/* Área de transcrição */}
      <div className="glass rounded-xl overflow-hidden">
        {viewMode === 'segments' ? (
          <div className="max-h-96 overflow-y-auto">
            {segments.map((segment, index) => (
              <div
                key={index}
                onClick={() => handleSegmentClick(index)}
                className={`
                  px-4 py-3 border-b border-border/50 transition-colors cursor-pointer
                  hover:bg-primary/5
                  ${expandedSegments.has(index) ? 'bg-primary/5' : ''}
                `}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSegmentClick(index);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Segmento ${index + 1}, ${formatTimestamp(segment.timestamp[0])} a ${formatTimestamp(segment.timestamp[1])}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedSegments((prev) => {
                        const next = new Set(prev);
                        if (next.has(index)) next.delete(index);
                        else next.add(index);
                        return next;
                      });
                    }}
                    className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                    aria-label={expandedSegments.has(index) ? 'Recolher' : 'Expandir'}
                  >
                    {expandedSegments.has(index) ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-primary font-medium px-2 py-0.5 bg-primary/10 rounded">
                        {formatTimestamp(segment.timestamp[0])} - {formatTimestamp(segment.timestamp[1])}
                      </span>
                      {segment.timestamp[0] > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeek(segment.timestamp[0]);
                          }}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-0.5 rounded"
                        >
                          Ir para {formatTimestamp(segment.timestamp[0])}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{segment.text.trim()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 max-h-96 overflow-y-auto">
            <textarea
              ref={textareaRef}
              value={text}
              readOnly
              className="w-full h-full min-h-[300px] bg-transparent border-none resize-none text-sm text-foreground placeholder-muted-foreground font-mono focus:outline-none"
              placeholder="A transcrição aparecerá aqui..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Rodapé com info de idioma detectado */}
        {language && language !== 'auto' && (
          <div className="px-4 py-2 border-t border-border/50 bg-secondary/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Languages className="w-3 h-3" />
              <span>Idioma detectado: <strong className="text-foreground">{LANGUAGES[language]?.name || language}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-foreground font-mono">{segments.length}</p>
          <p className="text-xs text-muted-foreground">Segmentos</p>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-foreground font-mono">{text.split(/\s+/).filter(Boolean).length}</p>
          <p className="text-xs text-muted-foreground">Palavras</p>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-foreground font-mono">{formatTimestamp(duration)}</p>
          <p className="text-xs text-muted-foreground">Duração</p>
        </div>
      </div>
    </div>
  );
}