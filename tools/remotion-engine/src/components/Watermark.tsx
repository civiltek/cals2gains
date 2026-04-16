import React from "react";
import { AbsoluteFill } from "remotion";
import { BRAND } from "../types";

interface WatermarkProps {
  handle: string;
}

/**
 * @handle watermark at bottom-left, within Instagram safe zone.
 * paddingBottom: 330px ensures it stays above the 320px bottom clip zone.
 * paddingLeft: 60px matches left safe margin.
 */
export const Watermark: React.FC<WatermarkProps> = ({ handle }) => (
  <AbsoluteFill
    style={{
      justifyContent: "flex-end",
      alignItems: "flex-start",
      paddingBottom: 330,
      paddingLeft: 60,
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
