import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * iOS の「ホーム画面に追加」用アイコン。iOS 側が自動で角丸にするため、ここでは
 * 背景を正方形いっぱいに敷くだけにする (自前で角丸にすると二重に丸まる)。
 */
export default function AppleIcon() {
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
        <svg
          width={104}
          height={104}
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
    { ...size },
  );
}
