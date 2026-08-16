# TranscritorLES

**Transcrição de áudio e vídeo 100% no navegador** usando Whisper via Transformers.js. Privacidade total, sem servidores, deploy em um clique na Vercel.

![TranscritorLES](https://img.shields.io/badge/Next.js-14+-black?logo=next.js)
![Transformers.js](https://img.shields.io/badge/Transformers.js-2.17+-orange?logo=huggingface)
![WebGPU](https://img.shields.io/badge/WebGPU-Supported-blue?logo=webgpu)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Funcionalidades

- **🎯 100% Client-Side**: Todo processamento ocorre no seu navegador via WebGPU/WASM
- **🔒 Privacidade Total**: Nenhum dado de áudio/vídeo sai do seu dispositivo
- **🚀 Múltiplos Modelos**: Whisper Tiny (39MB), Base (74MB), Small (244MB)
- **📁 Suporte Amplo**: MP3, WAV, M4A, WebM, OGG, MP4, WebM, MOV, AVI
- **⏱️ Timestamps Precisos**: Segmentos clicáveis sincronizados com o player
- **🌍 Multi-idioma**: Detecção automática + 10+ idiomas suportados
- **📤 Exportação**: TXT, SRT (legendas) e cópia para área de transferência
- **🌙 Dark Mode**: Interface moderna com Tailwind CSS
- **⚡ Web Worker**: Inferência não bloqueia a interface
- **📱 Responsivo**: Funciona em desktop e mobile

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 14 (App Router)                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ FileUploader│  │ MediaPlayer │  │ TranscriptionView   │  │
│  │  (Drag/Drop)│  │ (Audio/Video)│  │ (Segments + Export) │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │             │
│         └────────────────┼────────────────────┘             │
│                          ▼                                   │
│              ┌─────────────────────┐                         │
│              │   Main Thread       │                         │
│              │   (UI + Orquestração)│                        │
│              └──────────┬──────────┘                         │
│                         │ postMessage                        │
│                         ▼                                    │
│              ┌─────────────────────┐                         │
│              │   Web Worker        │                         │
│              │   @xenova/transformers│                        │
│              │   Whisper Pipeline  │                         │
│              │   (WebGPU/WASM)     │                         │
│              └─────────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js 20+**
- **npm 10+** (ou yarn/pnpm)
- **Git**

### Instalação Local

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/transcritor-les.git
cd transcritor-les

# 2. Instale as dependências
npm install

# 3. Execute em modo desenvolvimento
npm run dev
```

A aplicação estará disponível em **http://localhost:3000**

### Build de Produção

```bash
# Build otimizado para produção
npm run build

# Preview local do build
npm run start
```

---

## ☁️ Deploy na Vercel (Um Clique)

### Opção 1: Botão Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/seu-usuario/transcritor-les&project-name=transcritor-les&repository-name=transcritor-les)

### Opção 2: CLI Vercel

```bash
# 1. Instale a CLI da Vercel
npm i -g vercel

# 2. Faça login
vercel login

# 3. Deploy
vercel --prod
```

### Opção 3: GitHub Integration

1. Push para GitHub
2. Conecte o repositório no [Vercel Dashboard](https://vercel.com/dashboard)
3. Deploy automático a cada push

---

## ⚙️ Configuração Avançada

### Variáveis de Ambiente

Crie `.env.local` (opcional):

```env
# Configurações opcionais
NEXT_PUBLIC_APP_NAME=TranscritorLES
NEXT_PUBLIC_DEFAULT_MODEL=Xenova/whisper-tiny
NEXT_PUBLIC_MAX_FILE_SIZE_MB=500
```

### next.config.js - Detalhes

```javascript
// Configuração chave para Vercel + Transformers.js
module.exports = {
  output: 'export',           // Exportação estática
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    // WebAssembly support
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };
    
    // ONNX binaries handling
    config.module.rules.push({
      test: /\.onnx$/,
      type: 'asset/resource',
    });
    
    // Server externals
    if (isServer) {
      config.externals = [
        '@xenova/transformers',
        'onnxruntime-web',
      ];
    }
    return config;
  },
  // Headers para SharedArrayBuffer (WebGPU)
  async headers() {
    return [{
      source: '/worker.js',
      headers: [
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      ],
    }];
  },
};
```

---

## 📁 Estrutura do Projeto

```
transcritor-les/
├── app/
│   ├── globals.css          # Estilos globais + Tailwind
│   ├── layout.tsx           # Layout raiz + metadados SEO
│   ├── page.tsx             # Página principal (client component)
│   └── favicon.ico
├── components/
│   ├── FileUploader.tsx     # Drag-drop + extração áudio 16kHz
│   ├── MediaPlayer.tsx      # Player HTML5 sincronizado
│   ├── TranscriptionView.tsx# Segmentos + export TXT/SRT
│   └── ProgressBar.tsx      # Progresso animado + stepper
├── public/
│   ├── worker.js            # Web Worker (Transformers.js)
│   ├── manifest.json        # PWA manifest
│   └── icons/               # Ícones PWA
├── next.config.js           # Config Next.js + WASM
├── tailwind.config.ts       # Design system
├── tsconfig.json            # TypeScript config
├── package.json
└── README.md
```

---

## 🔧 Como Funciona

### 1. Extração de Áudio (Main Thread)
```typescript
// FileUploader.tsx
const audioContext = new AudioContext({ sampleRate: 16000 });
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
const offlineContext = new OfflineAudioContext(1, duration * 16000, 16000);
// Resample para 16kHz mono
const renderedBuffer = await offlineContext.startRendering();
const audioData = renderedBuffer.getChannelData(0); // Float32Array
```

### 2. Inferência Whisper (Web Worker)
```javascript
// public/worker.js
import { pipeline, env } from '@xenova/transformers';
env.backends = ['webgpu', 'wasm'];

const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
const result = await transcriber(audioData, {
  chunk_length_s: 30,
  stride_length_s: 5,
  return_timestamps: true,
  language: 'pt', // opcional
});
```

### 3. Sincronização Player ↔ Transcrição
```typescript
// TranscriptionView.tsx - clique no timestamp
const handleSegmentClick = (index) => {
  onSeek(segments[index].timestamp[0]); // Salta player para tempo exato
};
```

---

## 🎯 Modelos Disponíveis

| Modelo | Tamanho | Velocidade | Precisão | Uso Recomendado |
|--------|---------|------------|----------|-----------------|
| `whisper-tiny` | 39 MB | ⚡⚡⚡ Mais rápido | Boa | Tempo real, mobile |
| `whisper-base` | 74 MB | ⚡⚡ Equilibrado | Melhor | Uso geral |
| `whisper-small` | 244 MB | ⚡ Mais lento | Alta | Precisão máxima |

> **Nota**: Modelos são baixados automaticamente na primeira uso e ficam em cache do navegador (IndexedDB).

---

## 🌐 Compatibilidade

| Navegador | WebGPU | WASM Fallback | Status |
|-----------|--------|---------------|--------|
| Chrome 113+ | ✅ | ✅ | Total |
| Edge 113+ | ✅ | ✅ | Total |
| Firefox 120+ | 🔄 (flag) | ✅ | Parcial |
| Safari 17+ | 🔄 (experimental) | ✅ | Parcial |
| Mobile Chrome | ✅ | ✅ | Total |

> **WebGPU** oferece 10-50x mais velocidade que WASM. Ative em `chrome://flags/#enable-unsafe-webgpu` se necessário.

---

## 📝 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra Pull Request

---

## 🙏 Créditos

- **[Transformers.js](https://github.com/xenova/transformers.js)** - Xenova/Hugging Face
- **[Whisper](https://github.com/openai/whisper)** - OpenAI
- **[ONNX Runtime Web](https://github.com/microsoft/onnxruntime)** - Microsoft
- **[Next.js](https://nextjs.org/)** - Vercel
- **[Tailwind CSS](https://tailwindcss.com/)** - Tailwind Labs
- **[Lucide Icons](https://lucide.dev/)** - Lucide Contributors

---

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/transcritor-les/issues)
- **Website**: [lutchi.vercel.app](https://lutchi.vercel.app)
- **Empresa**: Lutchi Enterprise Systems

---

<div align="center">
  <strong>Desenvolvido com ❤️ por Lutchi Enterprise Systems</strong><br>
  <sub>Fundador e CEO: Luís Lutchi</sub>
</div>