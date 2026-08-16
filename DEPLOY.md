# TranscritorLES - Guia de Instalação e Deploy

## 📋 Pré-requisitos

- **Node.js 20.0.0 ou superior**
- **npm 10.0.0 ou superior** (ou yarn/pnpm)
- **Git**
- Navegador moderno com suporte a WebGPU (Chrome 113+, Edge 113+) ou WASM fallback

---

## 🛠️ Instalação Local

### 1. Clonar e Entrar no Diretório

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/transcritor-les.git
cd transcritor-les
```

### 2. Instalar Dependências

```bash
# Usando npm
npm install

# Ou usando yarn
yarn install

# Ou usando pnpm (recomendado para velocidade)
pnpm install
```

### 3. Configurar Variáveis de Ambiente (Opcional)

```bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Edite se necessário
# NEXT_PUBLIC_DEFAULT_MODEL=Xenova/whisper-tiny
# NEXT_PUBLIC_MAX_FILE_SIZE_MB=500
```

### 4. Executar em Desenvolvimento

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

A aplicação abrirá em **http://localhost:3000**

---

## 🏗️ Build de Produção

### Build Local

```bash
# Gerar build otimizado
npm run build

# Verificar build localmente
npm run start
```

### Verificar Tipo (TypeScript)

```bash
npm run lint
# ou
npx tsc --noEmit
```

---

## ☁️ Deploy na Vercel

### Método 1: Vercel CLI (Recomendado)

```bash
# 1. Instalar CLI globalmente
npm install -g vercel@latest

# 2. Login na Vercel
vercel login

# 3. Deploy de preview
vercel

# 4. Deploy de produção
vercel --prod
```

### Método 2: GitHub Integration (Automático)

1. **Push para GitHub:**
```bash
git add .
git commit -m "feat: initial TranscritorLES release"
git push origin main
```

2. **Conectar no Vercel Dashboard:**
   - Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
   - Clique em "Add New..." → "Project"
   - Importe o repositório GitHub
   - Configure:
     - **Framework Preset**: Next.js
     - **Build Command**: `npm run build` (padrão)
     - **Output Directory**: `out` (padrão para export estático)
     - **Install Command**: `npm install` (padrão)

3. **Deploy Automático:**
   - Todo push para `main` fará deploy automático
   - Preview deployments para Pull Requests

### Método 3: Botão Deploy (One-Click)

Adicione ao seu README.md:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SEU_USUARIO/transcritor-les&project-name=transcritor-les&repository-name=transcritor-les)
```

---

## 🔧 Configurações Importantes para Vercel

### next.config.js - Configurações Críticas

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exportação estática para hospedagem gratuita na Vercel
  output: 'export',
  images: { unoptimized: true },
  
  // WebAssembly support para Transformers.js
  webpack: (config, { isServer }) => {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };
    
    // ONNX binaries
    config.module.rules.push({
      test: /\.onnx$/,
      type: 'asset/resource',
      generator: { filename: 'static/media/[hash][ext]' },
    });
    
    // Worker
    config.module.rules.push({
      test: /worker\.js$/,
      type: 'asset/resource',
      generator: { filename: 'static/worker/[hash][ext]' },
    });
    
    // Server externals
    if (isServer) {
      config.externals = [
        '@xenova/transformers',
        'onnxruntime-web',
        'onnxruntime-node',
      ];
    }
    
    return config;
  },
  
  // Headers para SharedArrayBuffer (necessário para WebGPU)
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

module.exports = nextConfig;
```

### .vercelignore

```
# Ignorar arquivos de desenvolvimento no deploy
*.ts
*.tsx
*.md
*.css
*.d.ts
.env*
.vercel
.idea
.vscode
.next
node_modules
coverage
*.log
```

---

## 🐛 Solução de Problemas

### Erro: "WebAssembly not supported"
```bash
# Verifique se o Node.js suporta WASM
node --version  # Deve ser 20+
```

### Erro: "Cross-Origin Isolation failed"
- Certifique-se que o `next.config.js` tem os headers COEP/COOP
- No Vercel, isso é automático com `output: 'export'`

### Erro: "Model download failed"
- Verifique conexão com internet (modelos vêm do Hugging Face CDN)
- Tente modelo menor: `Xenova/whisper-tiny` (39MB)

### Build falha no Vercel
```bash
# Verifique localmente primeiro
npm run build

# Limpe cache
rm -rf .next node_modules
npm install
npm run build
```

### WebGPU não ativa
- Chrome: `chrome://flags/#enable-unsafe-webgpu` → Enabled
- Firefox: `about:config` → `dom.webgpu.enabled` → true
- O fallback WASM funciona automaticamente

---

## 📱 Testando em Dispositivos Móveis

```bash
# Expor localhost na rede local
npx serve -l 3000 --host 0.0.0.0

# Ou use ngrok para tunnel público
npx ngrok http 3000
```

---

## 📊 Monitoramento

### Vercel Analytics
```bash
# Adicionar ao projeto
npm install @vercel/analytics

# Em app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
<Analytics />
```

### Logs de Build
- Vercel Dashboard → Project → Deployments → View Build Logs

---

## 🔄 Atualizações

### Atualizar Dependências
```bash
# Verificar outdated
npm outdated

# Atualizar (cuidado com breaking changes)
npm update

# Major updates
npx npm-check-updates -u
npm install
```

### Atualizar Modelos Whisper
Modelos são versionados no Hugging Face. Para forçar update:
```javascript
// Em public/worker.js, adicione version no pipeline
const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
  revision: 'main', // ou tag específica
});
```

---

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/transcritor-les/issues)
- **Documentação**: [README.md](README.md)
- **Website**: [lutchi.vercel.app](https://lutchi.vercel.app)

---

## ✅ Checklist Pré-Deploy

- [ ] `npm run build` passa localmente
- [ ] `npm run lint` sem erros
- [ ] Variáveis de ambiente configuradas no Vercel (se necessário)
- [ ] Domínio personalizado configurado (opcional)
- [ ] Analytics ativado (opcional)
- [ ] Testado em Chrome, Firefox, Safari
- [ ] Testado em mobile
- [ ] README.md atualizado com badge de deploy

---

<div align="center">
  <strong>TranscritorLES - Powered by Lutchi Enterprise Systems</strong><br>
  <sub>Fundador e CEO: Luís Lutchi</sub>
</div>