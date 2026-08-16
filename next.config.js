/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Suporte a WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Configurações para binários ONNX/Transformers
    config.module.rules.push({
      test: /\.onnx$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/media/[hash][ext]',
      },
    });

    // Ignorar dependências do lado do servidor para Transformers.js
    if (isServer) {
      config.externals = [
        ...config.externals,
        '@xenova/transformers',
        'onnxruntime-web',
        'onnxruntime-node',
      ];
    }

    // Configuração de worker
    config.module.rules.push({
      test: /worker\.js$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext]',
      },
    });

    return config;
  },
  async headers() {
    return [
      {
        source: '/worker.js',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      // Security headers para todas as rotas
      {
        source: '/:path*',
        headers: [
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions policy (feature policy)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
          // Content Security Policy - restritivo mas permite inline scripts/styles do Next.js
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://huggingface.co",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://cdn.jsdelivr.net https://huggingface.co https://*.huggingface.co wss:",
              "worker-src 'self' blob:",
              "manifest-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          // Strict Transport Security (apenas em produção HTTPS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;