import type { NextConfig } from "next";

/**
 * Configuração do Next.js.
 *
 * - `output: 'standalone'`: imagem Docker enxuta (D-OB-11). O Dockerfile copia `content/`,
 *   porque o conteúdo é lido em tempo de execução.
 * - `outputFileTracingIncludes`: garante que o conteúdo em Markdown/JSON acompanhe o build.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
  poweredByHeader: false,
  typedRoutes: false,
};

export default nextConfig;
