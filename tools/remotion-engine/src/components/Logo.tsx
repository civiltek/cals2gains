import React from "react";
import { AbsoluteFill, Img, staticFile, interpolate, useVideoConfig } from "remotion";

interface LogoProps {
  /** Frame within current scene */
  sceneFrame: number;
  sceneDurationFrames: number;
}

/**
 * Cals2Gains logo — top-right corner.
 * Fades in during first 15 frames, fades out last 8 frames.
 */
export const Logo: React.FC<LogoProps> = ({ sceneFrame, sceneDurationFrames }) => {
  const opacity = interpolate(
    sceneFrame,
    [0, 15, sceneDurationFrames - 8, sceneDurationFrames],
    [0, 0.90, 0.90, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "flex-end",
        flexDirection: "column",
        paddingTop: 60,
        paddingRight: 50,
      }}
    >
      <Img
        src={staticFile("C2G-Logo-Light.png")}
        style={{
          height: 48,
          width: "auto",
          opacity,
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
        }}
      />
    </AbsoluteFill>
  );
};
