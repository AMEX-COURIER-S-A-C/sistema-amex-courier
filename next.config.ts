import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.126', '192.168.*.*', '10.*.*.*', 'localhost:3000'],
  async headers() {
    return [
      {
        source: '/wasm/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/((?!_next/static|_next/image|images|wasm|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/clientes',
        destination: 'https://clientes.sistemaamexcourier.online',
        permanent: false,
      },
      {
        source: '/clientes/:path*',
        destination: 'https://clientes.sistemaamexcourier.online/:path*',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: '/dashboard', destination: '/' },
        { source: '/amex-excel', destination: '/' },
        { source: '/amex-excel/:path*', destination: '/' },
        { source: '/inventario', destination: '/' },
        { source: '/cobros', destination: '/' },
        { source: '/directorio-clientes', destination: '/' },
        { source: '/directorio', destination: '/' },
        { source: '/clientes-360', destination: '/' },
        { source: '/clientes360', destination: '/' },
        { source: '/crm-clientes', destination: '/' },
        { source: '/escaner', destination: '/' },
        { source: '/matriz-dni', destination: '/' },
        { source: '/rotulos', destination: '/' },
        { source: '/boletas-shalom', destination: '/' },
        // Aliases para retrocompatibilidad
        { source: '/live-sheets', destination: '/' },
        { source: '/sheets', destination: '/' },
        { source: '/dni-matrix', destination: '/' },
        { source: '/rotulos-a4', destination: '/' },
        { source: '/mobile-scanner', destination: '/' },
        { source: '/fico-cobros', destination: '/' },
        { source: '/mm-lince', destination: '/' },
        { source: '/mm-inventory', destination: '/' },
        { source: '/completar-inventario', destination: '/' },
        { source: '/admin-usuarios', destination: '/' },
      ],
      fallback: [
        {
          source: '/:path*',
          destination: '/',
        },
      ],
    };
  },
};

export default withSentryConfig(nextConfig, {
  org: "mm-kk",
  project: "sistema-amex-courier",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
