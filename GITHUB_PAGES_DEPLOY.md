# 🚀 Deploy no GitHub Pages - Instruções Rápidas

## ✅ Configuração Concluída

O projeto já está configurado para GitHub Pages:

1. **next.config.js** - Configurado com `basePath` e `assetPrefix` para `/transcritor-les/`
2. **Workflow GitHub Actions** - `.github/workflows/deploy-pages.yml` criado
2. **Build** - Gera static export em `./out`

---

## 🚀 Passos para Ativar no GitHub

### 1. Vá no Repositório
```
https://github.com/luislutchii/transcritor-les
```

### 2. Settings → Pages
- **Source**: "GitHub Actions" (não "Deploy from branch")
- Salve

### 3. Verifique Actions
- Aba **Actions** → verá workflow "Deploy to GitHub Pages"
- Push no `main` dispara deploy automático

---

## 🌐 URL Final

Após deploy:
```
https://luislutchii.github.io/transcritor-les/
```

---

## ⚠️ Notas Importantes

### COEP/COOP Headers (SharedArrayBuffer)
**GitHub Pages NÃO suporta headers HTTP customizados.**
- O worker WebAssembly pode não funcionar (SharedArrayBuffer requer COEP/COOP)
- **Solução**: O `@xenova/transformers` tem fallback WASM que funciona sem SharedArrayBuffer
- Modelo `whisper-tiny` (39MB) carrega via WASM normalmente

### CSP Headers
GitHub Pages não suporta CSP customizado via headers.
- O CSP configurado no `next.config.js` não será aplicado
- O app funciona sem CSP (funciona, mas menos seguro)

### HTTPS
✅ GitHub Pages força HTTPS automaticamente

---

## 🚀 Deploy Manual (se quiser testar agora)

```bash
# Build local
npm run build

# Deploy manual via gh-pages (opcional)
npx gh-pages -d out
# URL: https://luislutchii.github.io/transcritor-les/
```

---

## 📋 Checklist Final

- [ ] Settings → Pages → Source: "GitHub Actions"
- [ ] Actions rodando ✅
- [ ] URL funcionando: `https://luislutchii.github.io/transcritor-les/`
- [ ] Worker carregando (fallback WASM)
- [ ] Modelo Whisper baixando e transcrevendo

---

## 🔧 Se Der Erro no Worker

Se o worker não carregar (SharedArrayBuffer), o Transformers.js usa fallback WASM automaticamente.
Pode demorar mais, mas funciona.

Para debug: abra DevTools → Console → veja logs do worker.