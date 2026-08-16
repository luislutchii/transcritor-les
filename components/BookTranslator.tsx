'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Globe, FileText, Languages, Loader2, AlertCircle, CheckCircle, Download, Copy, Trash2, BookOpen, ArrowRightLeft } from 'lucide-react';
import { PDFExtractor } from './PDFExtractor';

const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Detectar Automaticamente', nativeName: 'Auto' },
  { code: 'pt', name: 'Português', nativeName: 'Português' },
  { code: 'en', name: 'Inglês', nativeName: 'English' },
  { code: 'es', name: 'Espanhol', nativeName: 'Español' },
  { code: 'fr', name: 'Francês', nativeName: 'Français' },
  { code: 'de', name: 'Alemão', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italiano', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russo', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinês (Simplificado)', nativeName: '中文' },
  { code: 'ja', name: 'Japonês', nativeName: '日本語' },
  { code: 'ko', name: 'Coreano', nativeName: '한국어' },
  { code: 'ar', name: 'Árabe', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'nl', name: 'Holandês', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polonês', nativeName: 'Polski' },
  { code: 'tr', name: 'Turco', nativeName: 'Türkçe' },
  { code: 'sv', name: 'Sueco', nativeName: 'Svenska' },
  { code: 'da', name: 'Dinamarquês', nativeName: 'Dansk' },
  { code: 'no', name: 'Norueguês', nativeName: 'Norsk' },
  { code: 'fi', name: 'Finlandês', nativeName: 'Suomi' },
  { code: 'cs', name: 'Tcheco', nativeName: 'Čeština' },
  { code: 'hu', name: 'Húngaro', nativeName: 'Magyar' },
  { code: 'ro', name: 'Romeno', nativeName: 'Română' },
  { code: 'bg', name: 'Búlgaro', nativeName: 'Български' },
  { code: 'hr', name: 'Croata', nativeName: 'Hrvatski' },
  { code: 'sk', name: 'Eslovaco', nativeName: 'Slovenčina' },
  { code: 'sl', name: 'Esloveno', nativeName: 'Slovenščina' },
  { code: 'et', name: 'Estoniano', nativeName: 'Eesti' },
  { code: 'lv', name: 'Letão', nativeName: 'Latviešu' },
  { code: 'lt', name: 'Lituano', nativeName: 'Lietuvių' },
  { code: 'uk', name: 'Ucraniano', nativeName: 'Українська' },
  { code: 'be', name: 'Bielorrusso', nativeName: 'Беларуская' },
  { code: 'mk', name: 'Macedônio', nativeName: 'Македонски' },
  { code: 'sq', name: 'Albanês', nativeName: 'Shqip' },
  { code: 'sr', name: 'Sérvio', nativeName: 'Српски' },
  { code: 'bs', name: 'Bósnio', nativeName: 'Bosanski' },
  { code: 'mt', name: 'Maltês', nativeName: 'Malti' },
  { code: 'ga', name: 'Irlandês', nativeName: 'Gaeilge' },
  { code: 'cy', name: 'Galês', nativeName: 'Cymraeg' },
  { code: 'eu', name: 'Basco', nativeName: 'Euskara' },
  { code: 'ca', name: 'Catalão', nativeName: 'Català' },
  { code: 'gl', name: 'Galego', nativeName: 'Galego' },
  { code: 'is', name: 'Islandês', nativeName: 'Íslenska' },
  { code: 'fo', name: 'Feroês', nativeName: 'Føroyskt' },
];

const MAX_PAGES = 500;
const MAX_FILE_SIZE_MB = 100;

interface BookTranslatorProps {
  onError: (error: string) => void;
}

export function BookTranslator({ onError }: BookTranslatorProps) {
  const [step, setStep] = useState<'upload' | 'translate' | 'result'>('upload');
  const [extractedText, setExtractedText] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('pt');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState(0);
  const [translateStatus, setTranslateStatus] = useState('');
  const [workerReady, setWorkerReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Inicializar worker de tradução
  useEffect(() => {
    const basePath = '/transcritor-les';
    const worker = new Worker(`${basePath}/translation-worker.js`, { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const message = event.data;
      
      switch (message.type) {
        case 'LOG':
          console.log(message.message);
          break;
        case 'READY':
          setWorkerReady(true);
          break;
        case 'PROGRESS':
          setTranslateProgress(message.progress);
          setTranslateStatus(message.status);
          break;
        case 'RESULT':
          setTranslatedText(message.translatedText);
          setIsTranslating(false);
          setTranslateProgress(100);
          setTranslateStatus('Tradução concluída!');
          setStep('result');
          break;
        case 'ERROR':
          onError(message.error);
          setIsTranslating(false);
          setTranslateProgress(0);
          break;
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      onError('Erro no worker de tradução');
      setIsTranslating(false);
    };

    // Inicializar modelo
    worker.postMessage({ type: 'INIT', modelId: 'Xenova/nllb-200-distilled-600M' });

    return () => {
      worker.terminate();
    };
  }, [onError]);

  const handleTextExtracted = useCallback((text: string, pages: number) => {
    setExtractedText(text);
    setPageCount(pages);
    setStep('translate');
  }, []);

  const handleExtractError = useCallback((error: string) => {
    onError(error);
  }, [onError]);

  const handleExtractProgress = useCallback((progress: number, status: string) => {
    setTranslateProgress(progress);
    setTranslateStatus(status);
  }, []);

  const handleTranslate = useCallback(() => {
    if (!workerRef.current || !workerReady) {
      onError('Worker de tradução não está pronto. Aguarde o modelo carregar.');
      return;
    }
    if (!extractedText.trim()) {
      onError('Nenhum texto extraído para traduzir');
      return;
    }
    if (sourceLang === targetLang) {
      onError('Idioma de origem e destino devem ser diferentes');
      return;
    }

    setIsTranslating(true);
    setTranslatedText('');
    setTranslateProgress(0);
    setTranslateStatus('Iniciando tradução...');

    workerRef.current.postMessage({
      type: 'TRANSLATE',
      text: extractedText,
      sourceLang,
      targetLang,
      options: {
        maxChunkSize: 400,
        overlap: 50,
      },
    });
  }, [extractedText, sourceLang, targetLang, workerReady, onError]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      onError('Texto copiado para a área de transferência!');
    } catch {
      onError('Erro ao copiar texto');
    }
  }, [translatedText, onError]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([translatedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traducao_${targetLang}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [translatedText, targetLang]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setExtractedText('');
    setPageCount(0);
    setTranslatedText('');
    setIsTranslating(false);
    setTranslateProgress(0);
    setTranslateStatus('');
    abortControllerRef.current = new AbortController();
  }, []);

  const swapLanguages = useCallback(() => {
    if (sourceLang !== 'auto') {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
    }
  }, [sourceLang, targetLang]);

  return (
    <div className="space-y-6">
      {/* Header do Tradutor de Livros */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Tradutor de Livros Digitais</h2>
          <p className="text-sm text-muted-foreground">
            Traduza PDFs de até {MAX_PAGES} páginas para {SUPPORTED_LANGUAGES.length - 1} idiomas
          </p>
        </div>
      </div>

      {/* Step 1: Upload PDF */}
      {step === 'upload' && (
        <PDFExtractor
          onTextExtracted={handleTextExtracted}
          onError={handleExtractError}
          onProgress={handleExtractProgress}
          maxPages={MAX_PAGES}
        />
      )}

      {/* Step 2: Configure Translation */}
      {step === 'translate' && (
        <div className="space-y-6 animate-slide-up">
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              PDF Carregado com Sucesso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Páginas Extraídas</p>
                <p className="text-2xl font-bold text-foreground">{pageCount} / {MAX_PAGES}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Caracteres</p>
                <p className="text-2xl font-bold text-foreground">{extractedText.length.toLocaleString()}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Palavras Aprox.</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(extractedText.split(/\s+/).filter(w => w.length > 0).length).toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-secondary/30 rounded-lg max-h-64 overflow-y-auto">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {extractedText.substring(0, 2000)}{extractedText.length > 2000 ? '...' : ''}
              </p>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Languages className="w-5 h-5" />
              Configurar Tradução
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Idioma de Origem</label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="w-full glass rounded-lg border border-border/50 px-4 py-2 text-foreground bg-background"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center justify-center">
                <button
                  onClick={swapLanguages}
                  disabled={sourceLang === 'auto'}
                  className="p-2 glass rounded-lg hover:bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Inverter idiomas"
                >
                  <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Idioma de Destino</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full glass rounded-lg border border-border/50 px-4 py-2 text-foreground bg-background"
                >
                  {SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center">
              <button
                onClick={handleTranslate}
                disabled={isTranslating || !workerReady}
                className="w-full max-w-md px-8 py-3 glass rounded-lg text-lg font-medium transition-all flex items-center justify-center gap-2
                  ${isTranslating ? 'bg-primary/20 border-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}
                "
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Traduzindo...
                  </>
                ) : !workerReady ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Carregando modelo...
                  </>
                ) : (
                  <>
                    <Globe className="w-5 h-5" />
                    Iniciar Tradução
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Progress / Result */}
      {(step === 'translate' && isTranslating) && (
        <div className="glass rounded-xl p-6 animate-slide-up">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Tradução em Progresso
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>{translateStatus}</span>
                <span>{translateProgress}%</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${translateProgress}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Modelo: NLLB-200 (200 idiomas) | Processamento 100% local no navegador
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && (
        <div className="space-y-6 animate-slide-up">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Tradução Concluída
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 glass rounded-lg hover:bg-secondary/50 transition-colors flex items-center gap-2 text-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Baixar .txt
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-secondary/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Idioma de Origem</p>
                <p className="font-medium text-foreground">
                  {SUPPORTED_LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang}
                </p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Idioma de Destino</p>
                <p className="font-medium text-foreground">
                  {SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || targetLang}
                </p>
              </div>
            </div>

            <div className="bg-secondary/20 rounded-lg p-4 max-h-96 overflow-y-auto">
              <p className="text-sm text-foreground whitespace-pre-wrap">{translatedText}</p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleReset}
              className="px-6 py-2 glass rounded-lg hover:bg-secondary/50 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Novo Livro
            </button>
          </div>
        </div>
      )}

      {/* Worker Status */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className={`glass rounded-lg px-3 py-2 flex items-center gap-2 text-xs ${workerReady ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
          <div className={`w-2 h-2 rounded-full ${workerReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
          <span className="text-muted-foreground">
            {workerReady ? 'Modelo NLLB carregado' : 'Carregando modelo...'}
          </span>
        </div>
      </div>
    </div>
  );
}