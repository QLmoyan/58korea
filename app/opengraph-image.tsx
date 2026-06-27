import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/share/constants";

export const alt = SITE_NAME;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #fff1f2 0%, #fff7ed 55%, #ffffff 100%)",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#18181b",
            lineHeight: 1.1,
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 36,
            color: "#71717a",
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    size,
  );
}
