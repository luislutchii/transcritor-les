// Web Worker para inferência do modelo Whisper usando @xenova/transformers
// Este worker roda em thread separada para não bloquear a UI principal

/// <reference lib="webworker" />

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.0/+esm';

// Configuração do ambiente Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends = ['webgpu', 'wasm'];

// Estado do worker
let transcriber = null;
let currentModelId = 'Xenova/whisper-tiny';
let isModelLoading = false;

// Função auxiliar para enviar mensagens
function postMessage(message) {
  self.postMessage(message);
}

// Função para log
function log(message) {
  postMessage({ type: 'LOG', message: `[Worker] ${message}` });
  console.log(`[Worker] ${message}`);
}

// Inicializar pipeline
async function initializePipeline(modelId) {
  if (transcriber && currentModelId === modelId) {
    log(`Modelo ${modelId} já carregado`);
    return;
  }

  isModelLoading = true;
  currentModelId = modelId;

  try {
    log(`Inicializando pipeline para ${modelId}...`);

    // Criar pipeline de transcrição
    transcriber = await pipeline(
      'automatic-speech-recognition',
      modelId,
      {
        progress_callback: (progress) => {
          postMessage({
            type: 'PROGRESS',
            progress: progress.progress ?? 0,
            status: progress.status ?? 'Carregando...',
            file: progress.file,
          });
        },
      }
    );

    // Obter informações do backend
    const backendInfo = env.backends.find((b) => b === 'webgpu') ? 'WebGPU' : 'WASM';

    log(`Modelo ${modelId} carregado com sucesso (${backendInfo})`);
    isModelLoading = false;

    postMessage({
      type: 'READY',
      backend: backendInfo,
      modelId: modelId,
    });
  } catch (error) {
    isModelLoading = false;
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    log(`Erro ao carregar modelo: ${errorMessage}`);
    postMessage({
      type: 'ERROR',
      error: `Falha ao carregar modelo: ${errorMessage}`,
      code: 'MODEL_LOAD_ERROR',
    });
  }
}

// Processar áudio
async function processAudio(audioData, options = {}) {
  if (!transcriber) {
    postMessage({
      type: 'ERROR',
      error: 'Modelo não inicializado. Chame INIT primeiro.',
      code: 'MODEL_NOT_READY',
    });
    return;
  }

  const startTime = performance.now();

  try {
    log(`Iniciando transcrição (${audioData.length} amostras)...`);

    const result = await transcriber(audioData, {
      chunk_length_s: options.chunkLength ?? 30,
      stride_length_s: options.strideLength ?? 5,
      language: options.language ?? undefined,
      task: options.task ?? 'transcribe',
      return_timestamps: true,
    });

    const duration = (performance.now() - startTime) / 1000;

    log(`Transcrição concluída em ${duration.toFixed(2)}s`);

    // Normalizar resultado
    const segments = result.chunks ?? [];
    const text = segments.map((s) => s.text).join(' ').trim();

    postMessage({
      type: 'RESULT',
      text,
      segments: segments.map((s) => ({
        text: s.text.trim(),
        timestamp: s.timestamp ?? [0, 0],
      })),
      language: result.language ?? options.language ?? 'auto',
      duration,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    log(`Erro na transcrição: ${errorMessage}`);
    postMessage({
      type: 'ERROR',
      error: `Falha na transcrição: ${errorMessage}`,
      code: 'TRANSCRIPTION_ERROR',
    });
  }
}

// Handler principal de mensagens
self.onmessage = async (event) => {
  const message = event.data;

  switch (message.type) {
    case 'INIT':
      await initializePipeline(message.modelId);
      break;

    case 'TRANSCRIBE':
      await processAudio(message.audioData, message.options);
      break;

    case 'SET_PROGRESS_CALLBACK':
      // Progress callback é tratado via postMessage no pipeline
      break;

    case 'TERMINATE':
      log('Encerrando worker...');
      transcriber = null;
      self.close();
      break;

    default:
      log(`Mensagem desconhecida: ${message.type}`);
  }
};

// Handler de erros não capturados
self.onerror = (error) => {
  log(`Erro não capturado: ${error.message}`);
  postMessage({
    type: 'ERROR',
    error: `Erro interno do worker: ${error.message}`,
    code: 'WORKER_ERROR',
  });
};

self.onunhandledrejection = (event) => {
  log(`Promise rejeitada: ${event.reason}`);
  postMessage({
    type: 'ERROR',
    error: `Erro assíncrono: ${event.reason}`,
    code: 'UNHANDLED_REJECTION',
  });
};

log('Worker iniciado e aguardando mensagens...');