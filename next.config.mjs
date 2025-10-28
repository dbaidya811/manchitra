/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations for 100k users
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Performance budgets for 100k users
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    optimizeCss: true,
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // Bundle analyzer for development
  ...(process.env.ANALYZE === 'true' && {
    bundleAnalyzer: {
      enabled: true,
      openAnalyzer: true,
    },
  }),

  // Image configuration for external domains with optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn-icons-png.flaticon.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Enable modern image formats for better performance
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimum cache TTL for better performance
    minimumCacheTTL: 60,
    // Enable image optimization
    unoptimized: false,
  },

  // API routes configuration with performance optimizations
  async rewrites() {
    return [
      // Normalize trailing slash for OAuth callbacks
      { source: '/api/auth/callback/facebook/', destination: '/api/auth/callback/facebook' },
      { source: '/api/auth/callback/google/', destination: '/api/auth/callback/google' },
    ];
  },

  // Enhanced headers for better caching and security
  async headers() {
    return [
      {
        source: '/(.*)',
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
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      // Static assets caching for better performance
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Font caching
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Webpack configuration for better performance and compatibility
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Performance optimizations
    if (!dev) {
      // Enable webpack optimizations for production
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            ui: {
              test: /[\\/]@radix-ui[\\/]|[\\/]lucide-react[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 5,
            },
          },
        },
      };
    }

    // Fixes for MongoDB and other Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Handle external dependencies
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'supports-color': 'commonjs supports-color',
    });

    // Add performance monitoring
    if (dev) {
      config.devtool = 'eval-source-map';
    } else {
      config.devtool = 'source-map';
    }

    return config;
  },

  // Environment variables that should be available at build time
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    // Performance monitoring
    PERFORMANCE_BUDGET: '500KB',
  },

  // Enable SWC compiler optimizations
  swcMinify: true,

  // Enable compression
  compress: true,

  // Vercel-specific optimizations for 100k users
  poweredByHeader: false,
  generateEtags: false,

  // Disable unnecessary features for performance
  trailingSlash: false,
  skipTrailingSlashRedirect: true,

  // Enable modern output format
  output: 'standalone',
};

export default nextConfig;
