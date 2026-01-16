/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // ===========================================================================
  // PERFORMANCE OPTIMIZATIONS
  // ===========================================================================
  
  // Compress responses
  compress: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
  
  // Reduce bundle size - disable unused features
  optimizeFonts: true,
  
  // Strict mode for catching bugs
  reactStrictMode: true,
  
  // Power pack optimizations
  poweredByHeader: false,
  
  // API timeout for large searches
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Optimize package imports
    optimizePackageImports: ['lucide-react', '@heroicons/react'],
  },

  // Webpack config for PDF.js and optimization
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    
    // Production optimizations
    if (!dev && !isServer) {
      // Tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: true,
      };
    }
    
    return config;
  },

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_APP_NAME: 'CENADI Recherche Documentaire',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // Image optimization
  images: {
    domains: ['localhost'],
    unoptimized: false, // Enable optimization in production
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
