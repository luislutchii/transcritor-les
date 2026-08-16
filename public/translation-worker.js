// Web Worker para tradução de textos usando @xenova/transformers
// Modelo: Xenova/nllb-200-distilled-600M (suporta 200 idiomas)

/// <reference lib="webworker" />

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.0/+esm';

// Configuração do ambiente Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

// Detectar se estamos em ambiente sem suporte a SharedArrayBuffer
const hasCrossOriginIsolation = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;

if (hasCrossOriginIsolation) {
  env.backends = ['webgpu', 'wasm'];
} else {
  env.backends = ['wasm'];
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    console.warn('[TranslationWorker] Ambiente sem crossOriginIsolated - usando fallback WASM');
  }
}

// Estado do worker
let translator = null;
let currentModelId = 'Xenova/nllb-200-distilled-600M';
let isModelLoading = false;

// Função auxiliar para enviar mensagens
function postMessage(message) {
  self.postMessage(message);
}

function log(message) {
  postMessage({ type: 'LOG', message: `[TranslationWorker] ${message}` });
  console.log(`[TranslationWorker] ${message}`);
}

// Mapear códigos de idioma para NLLB
const LANGUAGE_CODES = {
  'auto': 'auto',
  'pt': 'por_Latn',
  'en': 'eng_Latn',
  'es': 'spa_Latn',
  'fr': 'fra_Latn',
  'de': 'deu_Latn',
  'it': 'ita_Latn',
  'ru': 'rus_Cyrl',
  'zh': 'zho_Hans',
  'ja': 'jpn_Jpan',
  'ko': 'kor_Hang',
  'ar': 'arb_Arab',
  'hi': 'hin_Deva',
  'nl': 'nld_Latn',
  'pl': 'pol_Latn',
  'tr': 'tur_Latn',
  'sv': 'swe_Latn',
  'da': 'dan_Latn',
  'no': 'nob_Latn',
  'fi': 'fin_Latn',
  'cs': 'ces_Latn',
  'hu': 'hun_Latn',
  'ro': 'ron_Latn',
  'bg': 'bul_Cyrl',
  'hr': 'hrv_Latn',
  'sk': 'slk_Latn',
  'sl': 'slv_Latn',
  'et': 'est_Latn',
  'lv': 'lvs_Latn',
  'lt': 'lit_Latn',
  'uk': 'ukr_Cyrl',
  'be': 'bel_Cyrl',
  'mk': 'mkd_Cyrl',
  'sq': 'als_Latn',
  'sr': 'srp_Cyrl',
  'bs': 'bos_Latn',
  'mt': 'mlt_Latn',
  'ga': 'gle_Latn',
  'cy': 'cym_Latn',
  'eu': 'eus_Latn',
  'ca': 'cat_Latn',
  'gl': 'glg_Latn',
  'is': 'isl_Latn',
  'fo': 'fao_Latn',
};

// Inicializar pipeline de tradução
async function initializePipeline(modelId) {
  if (translator && currentModelId === modelId) {
    log(`Modelo ${modelId} já carregado`);
    return;
  }

  isModelLoading = true;
  currentModelId = modelId;

  try {
    log(`Inicializando pipeline de tradução para ${modelId}...`);

    translator = await pipeline(
      'translation',
      modelId,
      {
        progress_callback: (progress) => {
          postMessage({
            type: 'PROGRESS',
            progress: progress.progress ?? 0,
            status: progress.status ?? 'Carregando modelo de tradução...',
            file: progress.file,
          });
        },
      }
    );

    log(`Modelo de tradução ${modelId} carregado com sucesso`);
    isModelLoading = false;

    postMessage({
      type: 'READY',
      modelId: modelId,
    });
  } catch (error) {
    isModelLoading = false;
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    log(`Erro ao carregar modelo de tradução: ${errorMessage}`);
    
    postMessage({
      type: 'ERROR',
      error: `Falha ao carregar modelo de tradução: ${errorMessage}`,
      code: 'MODEL_LOAD_ERROR',
    });
  }
}

// Traduzir texto
async function translateText(text, sourceLang, targetLang, options = {}) {
  if (!translator) {
    postMessage({
      type: 'ERROR',
      error: 'Modelo de tradução não inicializado. Chame INIT primeiro.',
      code: 'MODEL_NOT_READY',
    });
    return;
  }

  const startTime = performance.now();

  try {
    log(`Iniciando tradução (${text.length} caracteres)...`);

    const sourceLangCode = LANGUAGE_CODES[sourceLang] || 'auto';
    const targetLangCode = LANGUAGE_CODES[targetLang] || 'eng_Latn';

    const result = await translator(text, {
      src_lang: sourceLangCode,
      tgt_lang: targetLangCode,
      max_length: options.maxLength ?? 512,
      num_beams: options.numBeams ?? 4,
      early_stopping: true,
    });

    const duration = (performance.now() - startTime) / 1000;
    const translatedText = result[0]?.translation_text ?? '';

    log(`Tradução concluída em ${duration.toFixed(2)}s`);

    postMessage({
      type: 'RESULT',
      originalText: text,
      translatedText,
      sourceLang,
      targetLang,
      duration,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    log(`Erro na tradução: ${errorMessage}`);
    postMessage({
      type: 'ERROR',
      error: `Falha na tradução: ${errorMessage}`,
      code: 'TRANSLATION_ERROR',
    });
  }
}

// Traduzir texto longo em chunks
async function translateLongText(text, sourceLang, targetLang, options = {}) {
  if (!translator) {
    postMessage({
      type: 'ERROR',
      error: 'Modelo de tradução não inicializado.',
      code: 'MODEL_NOT_READY',
    });
    return;
  }

  const maxChunkSize = options.maxChunkSize ?? 400;
  const overlap = options.overlap ?? 50;
  
  // Dividir texto em sentenças
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  
  let chunks = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = currentChunk.slice(-overlap) + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  log(`Traduzindo ${chunks.length} chunks...`);

  const sourceLangCode = LANGUAGE_CODES[sourceLang] || 'auto';
  const targetLangCode = LANGUAGE_CODES[targetLang] || 'eng_Latn';
  
  let fullTranslation = '';
  
  for (let i = 0; i < chunks.length; i++) {
    try {
      postMessage({
        type: 'PROGRESS',
        progress: Math.round((i / chunks.length) * 100),
        status: `Traduzindo chunk ${i + 1}/${chunks.length}`,
      });

      const result = await translator(chunks[i], {
        src_lang: sourceLangCode,
        tgt_lang: targetLangCode,
        max_length: 512,
        num_beams: 4,
        early_stopping: true,
      });

      fullTranslation += (fullTranslation ? ' ' : '') + result[0]?.translation_text ?? '';
    } catch (error) {
      log(`Erro no chunk ${i}: ${error.message}`);
      fullTranslation += (fullTranslation ? ' ' : '') + chunks[i]; // Fallback: manter original
    }
  }

  postMessage({
    type: 'RESULT',
    originalText: text,
    translatedText: fullTranslation,
    sourceLang,
    targetLang,
    duration: 0,
  });
}

// Handler principal de mensagens
self.onmessage = async (event) => {
  const message = event.data;

  switch (message.type) {
    case 'INIT':
      await initializePipeline(message.modelId);
      break;

    case 'TRANSLATE':
      if (message.text.length > 500) {
        await translateLongText(message.text, message.sourceLang, message.targetLang, message.options);
      } else {
        await translateText(message.text, message.sourceLang, message.targetLang, message.options);
      }
      break;

    case 'TERMINATE':
      log('Encerrando worker de tradução...');
      translator = null;
      self.close();
      break;

    default:
      log(`Mensagem desconhecida: ${message.type}`);
  }
};

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

log('TranslationWorker iniciado e aguardando mensagens...');
log(`Ambiente: ${hasCrossOriginIsolation ? 'crossOriginIsolated (WebGPU+WASM)' : 'Sem crossOriginIsolated - WASM fallback'}`);