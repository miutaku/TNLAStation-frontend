import type { MetadataRoute } from "next";

/**
 * Web App Manifest。app/manifest.ts (ファイル規約) を使うと Next.js が
 * <link rel="manifest"> を crossorigin なしで出力するが、仕様上その fetch は
 * credentials を送らない。Cloudflare Access 配下では Cookie が付かないぶん未認証
 * 扱いになり、ログイン画面へ 302 されて manifest を読めず PWA としてインストール
 * できなくなる。crossOrigin="use-credentials" を付けた link を layout.tsx から
 * 自前で出すため、ファイル規約をやめて Route Handler で同じ内容を配信する。
 */
const manifest: MetadataRoute.Manifest = {
  name: "TNLAStation",
  short_name: "TNLAStation",
  description: "TNLAStation recording dashboard",
  id: "/",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#f6f7fb",
  theme_color: "#f6f7fb",
  icons: [
    { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
  ],
};

// ファイル規約と同じくビルド時に確定させ、リクエストごとの再生成を避ける。
export const dynamic = "force-static";

export function GET() {
  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json" },
  });
}
