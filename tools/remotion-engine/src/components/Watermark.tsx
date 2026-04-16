import React from "react";
import { AbsoluteFill } from "remotion";
import { BRAND } from "../types";

interface WatermarkProps {
  handle: string;
}

/** Small @handle watermark at bottom-left */
export const Watermark: React.FC<WatermarkProps> = ({ handle }) => (
  <AbsoluteFill
    style={{
      justifyContent: "flex-end",
      alignItems: "flex-start",
      paddingBottom: 100,
      paddingLeft: 50,
    }}
  >
    <span
      style={{
        fontFamily: BRAND.fontDisplay,
        fontWeight: 600,
        fontSize: 26,
        color: BRAND.textSecondary,
        letterSpacing: "0.5px",
      }}
    >
      {handle}
    </span>
  </AbsoluteFill>
);
