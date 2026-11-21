import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Permite subir fotos de estudiantes de hasta 5MB (+ margen multipart)
      bodySizeLimit: "6mb",
    },
  },
};

export default withNextIntl(nextConfig);
