import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  experimental: {
    // Las fotos (hasta 2 MB, ver MAX_IMAGEN_BYTES en src/lib/blob.ts) viajan
    // como FormData a una server action; el limite por defecto es 1 MB.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default withNextIntl(nextConfig);
