import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/**
 * PWA マニフェスト用のアイコンを、必要なサイズごとに動的に生成する。バイナリの画像
 * ファイルを用意する代わりに、app-shell.tsx の Brand (角丸の正方形 + Tv アイコン) と
 * 同じ見た目をコードで再現する。
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const parsed = Number.parseInt(sizeParam, 10);
  const size = Number.isFinite(parsed) && parsed > 0 ? parsed : 512;
  const glyphSize = Math.round(size * 0.58);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e6365f",
        }}
      >
        {/* lucide の Tv アイコンと同じパス。app-shell.tsx の Brand が使っているものに揃える。 */}
        <svg
          width={glyphSize}
          height={glyphSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fcfcfc"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
          <polyline points="17 2 12 7 7 2" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
