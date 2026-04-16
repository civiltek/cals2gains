import React from "react";
import { AbsoluteFill, Img, staticFile, interpolate } from "remotion";

interface LogoProps {
  /** LOCAL frame (0 = scene start) */
  frame: number;
  sceneDurationFrames: number;
}

/**
 * Cals2Gains logomark — top-right corner.
 *
 * Uses C2G-Logomark-2048.png which has a TRANSPARENT background
 * and brand colors (violet + coral). CSS filter makes it white
 * so it's visible on any video background.
 *
 * Fades in during first 15 frames, fades out last 8 frames.
 */
export const Logo: React.FC<LogoProps> = ({ frame, sceneDurationFrames }) => {
  const opacity = interpolate(
    frame,
    [0, 15, sceneDurationFrames - 8, sceneDurationFrames],
    [0, 0.85, 0.85, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "flex-end",
        flexDirection: "column",
        paddingTop: 55,
        paddingRight: 50,
      }}
    >
      <Img
        src={staticFile("C2G-Logomark-2048.png")}
        style={{
          height: 52,
          width: 52,
          opacity,
          // Convert brand colors to white so it's visible on any background
          filter: "brightness(0) invert(1) drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
        }}
      />
    </AbsoluteFill>
  );
};
