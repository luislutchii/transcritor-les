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
    ];
  },
};

module.exports = nextConfig;