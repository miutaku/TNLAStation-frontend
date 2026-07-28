import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <svg
          width={19}
          height={19}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fcfcfc"
          strokeWidth={2.2}
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
