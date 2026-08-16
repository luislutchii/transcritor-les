'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, Cpu, Zap, Settings, Info, Github, ExternalLink, Moon, Sun, Trash2, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { FileUploader } from '@/components/FileUploader';
import { MediaPlayer } from '@/components/MediaPlayer';
import { TranscriptionView } from '@/components/TranscriptionView';
import { ProgressBar, Stepper } from '@/components/ProgressBar';
import { Footer } from '@/components/Footer';

const MODELS = [
  { id: 'Xenova/whisper-tiny', label: 'Tiny', size: '~39 MB', speed: 'Mais rápido', recommended: true },
  { id: 'Xenova/whisper-base', label: 'Base', size: '~74 MB', speed: 'Equilibrado', recommended: false },
  { id: 'Xenova/whisper-small', label: 'Small', size: '~244 MB', speed: 'Mais preciso', recommended: false },
] as const;

type ModelId = typeof MODELS[number]['id'];

interface WorkerMessage {
  type: 'READY' | 'PROGRESS' | 'RESULT' | 'ERROR' | 'LOG';
  backend?: string;
  modelId?: string;
  progress?: number;
  status?: string;
  file?: string;
  text?: string;
  segments?: Array<{ text: string; timestamp: [number, number] }>;
  language?: string;
  duration?: number;
  error?: string;
  code?: string;
  message?: string;
}

export default function Home() {
  // Estado principal
  const [selectedModel, setSelectedModel] = useState<ModelId>('Xenova/whisper-tiny');
  const [backend, setBackend] = useState<'WebGPU' | 'WASM' | 'unknown'>('unknown');
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [workerProgress, setWorkerProgress] = useState(0);
  const [workerStatus, setWorkerStatus] = useState('');
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Estado do arquivo
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'audio' | 'video'>('audio');

  // Estado da transcrição
  const [transcriptionText, setTranscriptionText] = useState('');
  const [transcriptionSegments, setTranscriptionSegments] = useState<Array<{ text: string; timestamp: [number, number] }>>([]);
  const [detectedLanguage, setDetectedLanguage] = useState('auto');
  const [transcriptionDuration, setTranscriptionDuration] = useState(0);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeStep, setActiveStep] = useState(0);

  // Worker ref
  const workerRef = useRef<Worker | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Inicializar worker
  useEffect(() => {
    const worker = new Worker('/worker.js', { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;

      switch (message.type) {
        case 'READY':
          setBackend(message.backend === 'WebGPU' ? 'WebGPU' : 'WASM');
          setIsModelLoaded(true);
          setWorkerProgress(100);
          setWorkerStatus('Modelo pronto');
          setWorkerError(null);
          break;

        case 'PROGRESS':
          setWorkerProgress(message.progress ?? 0);
          setWorkerStatus(message.status ?? 'Carregando...');
          break;

        case 'RESULT':
          setTranscriptionText(message.text ?? '');
          setTranscriptionSegments(message.segments ?? []);
          setDetectedLanguage(message.language ?? 'auto');
          setTranscriptionDuration(message.duration ?? 0);
          setIsTranscribing(false);
          setActiveStep(3);
          break;

        case 'ERROR':
          setWorkerError(message.error ?? 'Erro desconhecido');
          setIsTranscribing(false);
          setActiveStep(0);
          break;

        case 'LOG':
          console.log(message.message);
          break;
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      setWorkerError('Erro na comunicação com o worker');
      setIsTranscribing(false);
    };

    // Inicializar modelo padrão
    worker.postMessage({ type: 'INIT', modelId: selectedModel });

    return () => {
      worker.terminate();
    };
  }, [selectedModel]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handlers
  const handleFileSelect = useCallback((file: File, data: Float32Array, duration: number) => {
    setCurrentFile(file);
    setAudioData(data);
    setAudioDuration(duration);
    setFileType(file.type.startsWith('video/') ? 'video' : 'audio');

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    setTranscriptionText('');
    setTranscriptionSegments([]);
    setDetectedLanguage('auto');
    setTranscriptionDuration(0);
    setWorkerError(null);
    setActiveStep(1);
  }, [objectUrl]);

  const handleFileError = useCallback((error: string) => {
    setWorkerError(error);
    setActiveStep(0);
  }, []);

  const handleTranscribe = useCallback(async () => {
    if (!audioData || isTranscribing || !isModelLoaded) return;

    setIsTranscribing(true);
    setActiveStep(2);
    setWorkerProgress(0);
    setWorkerStatus('Iniciando transcrição...');
    setWorkerError(null);

    const language = detectedLanguage === 'auto' ? undefined : detectedLanguage;

    workerRef.current?.postMessage({
      type: 'TRANSCRIBE',
      audioData,
      options: {
        language,
        task: 'transcribe',
        chunkLength: 30,
        strideLength: 5,
      },
    });
  }, [audioData, isTranscribing, isModelLoaded, detectedLanguage]);

  const handleSeek = useCallback((time: number) => {
    // O MediaPlayer já faz o seek, isso é para sincronizar se necessário
  }, []);

  const handleCopy = useCallback(() => {
    // Feedback visual já está no componente
  }, []);

  const handleDownloadTxt = useCallback(() => {
    // Feedback visual já está no componente
  }, []);

  const handleDownloadSrt = useCallback(() => {
    // Feedback visual já está no componente
  }, []);

  const handleClear = useCallback(() => {
    setCurrentFile(null);
    setAudioData(null);
    setAudioDuration(0);
    setObjectUrl(null);
    setTranscriptionText('');
    setTranscriptionSegments([]);
    setDetectedLanguage('auto');
    setTranscriptionDuration(0);
    setWorkerError(null);
    setActiveStep(0);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const handleModelChange = useCallback((modelId: ModelId) => {
    setSelectedModel(modelId);
    setIsModelLoaded(false);
    setWorkerProgress(0);
    setWorkerStatus('Carregando novo modelo...');
    workerRef.current?.postMessage({ type: 'INIT', modelId });
  }, []);

  type StepStatus = 'pending' | 'active' | 'completed' | 'error';

  const steps: { label: string; status: StepStatus }[] = [
    { label: 'Arquivo', status: activeStep >= 1 ? (activeStep === 1 ? 'active' : 'completed') : 'pending' },
    { label: 'Modelo', status: activeStep >= 2 ? (activeStep === 2 ? 'active' : 'completed') : isModelLoaded ? 'completed' : 'pending' },
    { label: 'Transcrição', status: activeStep >= 3 ? 'completed' : isTranscribing ? 'active' : 'pending' },
    { label: 'Resultado', status: transcriptionText ? 'completed' : 'pending' },
  ];

  const currentModel = MODELS.find(m => m.id === selectedModel)!;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {/* Logotipo da LES */}
              <img
                src="/icons/logotipo.jpg"
                alt="Lutchi Enterprise Systems"
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Mic className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">TranscritorLES</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Indicador de backend */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 glass rounded-lg">
                {backend === 'WebGPU' ? (
                  <>
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-foreground">WebGPU</span>
                  </>
                ) : backend === 'WASM' ? (
                  <>
                    <Cpu className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-medium text-foreground">WASM</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Inicializando...</span>
                  </>
                )}
              </div>

              {/* Tema */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 glass rounded-lg hover:bg-secondary/80 transition-colors"
                aria-label={darkMode ? 'Modo claro' : 'Modo escuro'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Configurações */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 glass rounded-lg hover:bg-secondary/80 transition-colors"
                aria-label="Configurações"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Links externos */}
              <div className="hidden md:flex items-center gap-2">
                <a
                  href="https://lutchi.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 glass rounded-lg hover:bg-secondary/80 transition-colors"
                  aria-label="Lutchi Enterprise Systems"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <a
                  href="https://github.com/lutchi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 glass rounded-lg hover:bg-secondary/80 transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="px-2 pb-4">
            <Stepper steps={steps} />
          </div>
        </div>
      </header>

      {/* Painel de configurações */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Configurações</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Modelo Whisper</label>
                <div className="space-y-2">
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => { handleModelChange(model.id); setShowSettings(false); }}
                      className={`
                        w-full glass rounded-lg p-3 text-left transition-all
                        ${selectedModel === model.id ? 'border-primary/50 bg-primary/10' : 'hover:bg-secondary/50'}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                            ${selectedModel === model.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}
                          `}>
                            {model.label[0]}
                          </span>
                          <div>
                            <p className="font-medium text-foreground">{model.label}</p>
                            <p className="text-xs text-muted-foreground">{model.size} • {model.speed}</p>
                          </div>
                        </div>
                        {model.recommended && (
                          <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                            Recomendado
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Idioma da transcrição</label>
                <select
                  value={detectedLanguage}
                  onChange={(e) => setDetectedLanguage(e.target.value)}
                  className="w-full glass rounded-lg px-3 py-2 text-foreground bg-secondary/50 border-border/50 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="auto">🌐 Detecção Automática</option>
                  <option value="pt">🇧🇷 Português</option>
                  <option value="en">🇺🇸 English</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="it">🇮🇹 Italiano</option>
                  <option value="ja">🇯🇵 日本語</option>
                  <option value="zh">🇨🇳 中文</option>
                </select>
              </div>

              <div className="pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  Todos os processamentos ocorrem localmente no seu navegador.
                  Nenhum dado é enviado a servidores externos.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel Esquerdo: Upload + Player */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload */}
            <div className="glass rounded-xl p-6">
              <FileUploader
                onFileSelect={handleFileSelect}
                onError={handleFileError}
                maxSizeMB={2048}
              />

              {currentFile && (
                <div className="mt-4 glass rounded-lg p-4 animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      {fileType === 'video' ? (
                        <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="23 7 16 12 23 17 23 7" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{currentFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {fileType === 'video' ? 'Vídeo' : 'Áudio'} • {Math.round(audioDuration / 60)}:{String(Math.round(audioDuration % 60)).padStart(2, '0')} • {(currentFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <button
                      onClick={handleClear}
                      className="p-2 glass rounded-lg hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-red-400"
                      aria-label="Remover arquivo"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Botão de transcrever */}
              {(currentFile && isModelLoaded && !isTranscribing) && (
                <button
                  onClick={handleTranscribe}
                  disabled={isTranscribing || !audioData}
                  className="w-full mt-4 py-3 px-6 bg-primary text-primary-foreground rounded-lg font-semibold text-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mic className="w-5 h-5" />
                  Iniciar Transcrição
                </button>
              )}

              {(currentFile && !isModelLoaded) && (
                <div className="mt-4 p-4 glass rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p className="text-sm text-yellow-300">
                      Modelo carregando... Aguarde o download completar antes de transcrever.
                    </p>
                  </div>
                </div>
              )}

              {workerError && (
                <div className="mt-4 p-4 glass rounded-lg border border-red-500/30 bg-red-500/10 animate-shake">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{workerError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Media Player */}
            {currentFile && objectUrl && (
              <div className="glass rounded-xl overflow-hidden">
                <MediaPlayer
                  src={objectUrl}
                  type={fileType}
                  onTimeUpdate={handleSeek}
                  onSeek={handleSeek}
                />
              </div>
            )}

            {/* Progress do Worker */}
            {(isTranscribing || workerProgress > 0) && workerProgress < 100 && (
              <div className="glass rounded-xl p-6">
                <ProgressBar
                  progress={workerProgress}
                  status={workerStatus}
                  showDetails={true}
                />
              </div>
            )}
          </div>

          {/* Painel Direito: Transcrição */}
          <div className="space-y-6">
            <TranscriptionView
              text={transcriptionText}
              segments={transcriptionSegments}
              language={detectedLanguage}
              duration={audioDuration || transcriptionDuration}
              onSeek={handleSeek}
              onCopy={handleCopy}
              onDownloadTxt={handleDownloadTxt}
              onDownloadSrt={handleDownloadSrt}
              isProcessing={isTranscribing}
            />

            {/* Info card */}
            <div className="glass rounded-xl p-4">
              <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Sobre o TranscritorLES
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">• <span>Processamento 100% local no navegador (WebGPU/WASM)</span></li>
                <li className="flex items-start gap-2">• <span>Privacidade total: nenhum áudio sai do seu dispositivo</span></li>
                <li className="flex items-start gap-2">• <span>Modelos Whisper da OpenAI via Transformers.js</span></li>
                <li className="flex items-start gap-2">• <span>Suporta áudio (MP3, WAV, M4A, WebM) e vídeo (MP4, WebM, MOV)</span></li>
                <li className="flex items-start gap-2">• <span>Exportação em TXT, SRT e cópia para área de transferência</span></li>
                <li className="flex items-start gap-2">• <span>Desenvolvido por <strong className="text-foreground">Lutchi Enterprise Systems</strong></span></li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Corporativo LES */}
      <Footer />
    </div>
  );
}