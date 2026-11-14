import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          background: "#2F5BB8",
          borderRadius: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 88 }}>
          {[36, 64, 88, 64, 36].map((h, i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: h,
                borderRadius: 999,
                background: "#FFFFFF",
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
