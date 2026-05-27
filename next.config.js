/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
            {
                protocol: 'http',
                hostname: '**',
            },
        ],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
        outputFileTracingIncludes: {
            '/api/**/*': ['./data/**/*', './lib/db/schema.sql'],
        },
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    async redirects() {
        return [
            {
                source: '/dispatch',
                destination: '/dispatch-center',
                permanent: true,
            },
        ];
    },
};

module.exports = nextConfig;
