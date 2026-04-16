import React from "react";
import { AbsoluteFill, Img, staticFile, interpolate } from "remotion";

interface LogoProps {
  /** LOCAL frame (0 = scene start) */
  frame: number;
  sceneDurationFrames: number;
}

/**
 * Cals2Gains logomark — top-LEFT corner (Instagram safe zone).
 *
 * Uses C2G-Logomark-2048.png (transparent background).
 * CSS filter converts brand colors to white for visibility on any background.
 *
 * Opacity: 75% at steady state (per brand guidelines).
 * Fades in during first 15 frames, fades out last 8 frames.
 */
export const Logo: React.FC<LogoProps> = ({ frame, sceneDurationFrames }) => {
  const opacity = interpolate(
    frame,
    [0, 15, sceneDurationFrames - 8, sceneDurationFrames],
    [0, 0.75, 0.75, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "flex-start",
        flexDirection: "column",
        paddingTop: 120,
        paddingLeft: 60,
      }}
    >
      <Img
        src={staticFile("C2G-Logomark-2048.png")}
        style={{
          height: 52,
          width: 52,
          opacity,
          // brightness(0) = black silhouette, invert(1) = white
          filter: "brightness(0) invert(1) drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
        }}
      />
    </AbsoluteFill>
  );
};
