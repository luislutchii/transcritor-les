// Web Worker para tradução de textos usando @xenova/transformers
// Modelo otimizado: Xenova/nllb-200-distilled-600M para textos longos, modelo menor para textos curtos

/// <reference lib="webworker" />

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.0/+esm';

// Configuração do ambiente Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

// Detectar se estamos em ambiente sem suporte a SharedArrayBuffer
var hasCrossOriginIsolation = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolation;

if (hasCrossOriginIsolation) {
  env.backends = ['webgpu', 'wasm'];
} else {
  env.backends = ['wasm'];
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    console.warn('[TranslationWorker] Ambiente sem crossOriginIsolated - usando fallback WASM');
  }
}

// Estado do worker
var translator = null;
var currentModelId = 'Xenova/nllb-200-distilled-600M';
var isModelLoading = false;
var modelReady = false;

// Modelos disponíveis por tamanho do texto
var MODELS = {
  small: 'Xenova/nllb-200-distilled-600M', // Para textos até ~1000 chars
  large: 'Xenova/nllb-200-distilled-600M', // Para textos longos
};

// Função auxiliar para enviar mensagens
function postMessage(message) {
  self.postMessage(message);
}

function log(message) {
  postMessage({ type: 'LOG', message: '[TranslationWorker] ' + message });
  console.log('[TranslationWorker] ' + message);
}

// Mapear códigos de idioma para NLLB
var LANGUAGE_CODES = {
  'auto': 'eng_Latn', // NLLB não suporta auto, usar inglês como fallback
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
    log('Modelo ' + modelId + ' ja carregado');
    modelReady = true;
    postMessage({ type: 'READY', modelId: modelId });
    return;
  }

  isModelLoading = true;
  currentModelId = modelId;

  try {
    log('Inicializando pipeline de traducao para ' + modelId + '...');

    translator = await pipeline(
      'translation',
      modelId,
      {
        progress_callback: function(progress) {
          postMessage({
            type: 'PROGRESS',
            progress: progress.progress ?? 0,
            status: progress.status ?? 'Carregando modelo de traducao...',
            file: progress.file,
          });
        },
      }
    );

    log('Modelo de traducao ' + modelId + ' carregado com sucesso');
    isModelLoading = false;
    modelReady = true;

    postMessage({
      type: 'READY',
      modelId: modelId,
    });
  } catch (error) {
    isModelLoading = false;
    var errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    log('Erro ao carregar modelo de traducao: ' + errorMessage);
    
    postMessage({
      type: 'ERROR',
      error: 'Falha ao carregar modelo de traducao: ' + errorMessage,
      code: 'MODEL_LOAD_ERROR',
    });
  }
}

// Traduzir texto (para textos curtos - uso direto)
async function translateText(text, sourceLang, targetLang, options) {
  if (!translator) {
    postMessage({
      type: 'ERROR',
      error: 'Modelo de traducao nao inicializado. Chame INIT primeiro.',
      code: 'MODEL_NOT_READY',
    });
    return;
  }

  var startTime = performance.now();

  try {
    log('Iniciando traducao (' + text.length + ' caracteres)...');

    var sourceLangCode = LANGUAGE_CODES[sourceLang] || 'eng_Latn';
    var targetLangCode = LANGUAGE_CODES[targetLang] || 'eng_Latn';

    // NLLB não suporta 'auto' como source_lang
    if (sourceLangCode === 'auto' || sourceLangCode === 'auto') {
      sourceLangCode = 'eng_Latn';
    }

    var result = await translator(text, {
      src_lang: sourceLangCode,
      tgt_lang: targetLangCode,
      max_length: options.maxLength ?? 512,
      num_beams: options.numBeams ?? 4,
      early_stopping: true,
    });

    var duration = (performance.now() - startTime) / 1000;
    var translatedText = result[0]?.translation_text ?? '';

    log('Traducao concluida em ' + duration.toFixed(2) + 's');

    postMessage({
      type: 'RESULT',
      originalText: text,
      translatedText: translatedText,
      sourceLang: sourceLang,
      targetLang: targetLang,
      duration: duration,
    });
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    log('Erro na traducao: ' + errorMessage);
    postMessage({
      type: 'ERROR',
      error: 'Falha na traducao: ' + errorMessage,
      code: 'TRANSLATION_ERROR',
    });
  }
}

// Traduzir texto longo em chunks
async function translateLongText(text, sourceLang, targetLang, options) {
  if (!translator) {
    postMessage({
      type: 'ERROR',
      error: 'Modelo de traducao nao inicializado.',
      code: 'MODEL_NOT_READY',
    });
    return;
  }

  var maxChunkSize = options.maxChunkSize ?? 400;
  var overlap = options.overlap ?? 50;
  
  // Dividir texto em sentenças
  var sentences = text.split(/(?<=[.!?])\s+/).filter(function(s) { return s.trim().length > 0; });
  
  var chunks = [];
  var currentChunk = '';
  
  for (var i = 0; i < sentences.length; i++) {
    var sentence = sentences[i];
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

  log('Traduzindo ' + chunks.length + ' chunks...');

  var sourceLangCode = LANGUAGE_CODES[sourceLang] || 'eng_Latn';
  var targetLangCode = LANGUAGE_CODES[targetLang] || 'eng_Latn';
  
  if (sourceLangCode === 'auto') {
    sourceLangCode = 'eng_Latn';
  }
  
  var fullTranslation = '';
  
  for (var i = 0; i < chunks.length; i++) {
    try {
      postMessage({
        type: 'PROGRESS',
        progress: Math.round((i / chunks.length) * 100),
        status: 'Traduzindo chunk ' + (i + 1) + '/' + chunks.length,
      });

      var result = await translator(chunks[i], {
        src_lang: sourceLangCode,
        tgt_lang: targetLangCode,
        max_length: 512,
        num_beams: 4,
        early_stopping: true,
      });

      fullTranslation += (fullTranslation ? ' ' : '') + (result[0]?.translation_text ?? '');
    } catch (error) {
      log('Erro no chunk ' + i + ': ' + error.message);
      fullTranslation += (fullTranslation ? ' ' : '') + chunks[i];
    }
  }

  postMessage({
    type: 'RESULT',
    originalText: text,
    translatedText: fullTranslation,
    sourceLang: sourceLang,
    targetLang: targetLang,
    duration: 0,
  });
}

// Handler principal de mensagens
self.onmessage = async function(event) {
  var message = event.data;

  switch (message.type) {
    case 'INIT':
      // Escolher modelo baseado no tamanho estimado do texto
      var modelId = message.modelId || 'Xenova/nllb-200-distilled-600M';
      await initializePipeline(modelId);
      break;

    case 'TRANSLATE':
      // Para textos curtos (< 500 chars), usar translateText direto
      // Para textos longos, usar chunking
      if (message.text.length > 500) {
        await translateLongText(message.text, message.sourceLang, message.targetLang, message.options);
      } else {
        await translateText(message.text, message.sourceLang, message.targetLang, message.options);
      }
      break;

    case 'TERMINATE':
      log('Encerrando worker de traducao...');
      translator = null;
      self.close();
      break;

    default:
      log('Mensagem desconhecida: ' + message.type);
  }
};

self.onerror = function(error) {
  log('Erro nao capturado: ' + error.message);
  postMessage({
    type: 'ERROR',
    error: 'Erro interno do worker: ' + error.message,
    code: 'WORKER_ERROR',
  });
};

self.onunhandledrejection = function(event) {
  log('Promise rejeitada: ' + event.reason);
  postMessage({
    type: 'ERROR',
    error: 'Erro assincrono: ' + event.reason,
    code: 'UNHANDLED_REJECTION',
  });
};

log('TranslationWorker iniciado e aguardando mensagens...');
log('Ambiente: ' + (hasCrossOriginIsolation ? 'crossOriginIsolated (WebGPU+WASM)' : 'Sem crossOriginIsolated - WASM fallback'));