import type { NextConfig } from "next";

const isDemoBuild = process.env.TNLASTATION_DEMO === "1";

function normalizeBasePath(value: string | undefined): string {
  const trimmed = value?.trim().replace(/^\/+|\/+$/g, "") ?? "";
  if (!trimmed) return "";
  return `/${trimmed}`;
}

const basePath = isDemoBuild ? normalizeBasePath(process.env.GITHUB_PAGES_BASE_PATH) : "";

const nextConfig: NextConfig = {
  output: isDemoBuild ? "export" : "standalone",
  basePath,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
