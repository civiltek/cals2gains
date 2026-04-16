import React from "react";
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { BRAND } from "../types";

interface TitleTextProps {
  title: string;
  /** LOCAL frame (0 = scene start) */
  frame: number;
  sceneDurationFrames: number;
  isHook: boolean;
}

/**
 * Animated title text with slide-up spring entrance.
 * Hook scene (index 0): large coral text, centered.
 * Regular scenes: medium bone text, upper third.
 */
export const TitleText: React.FC<TitleTextProps> = ({
  title,
  frame,
  sceneDurationFrames,
  isHook,
}) => {
  const { fps } = useVideoConfig();

  const enterFrames = 12;
  const exitFrames = 8;

  const translateY = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 120 },
    durationInFrames: enterFrames,
    from: 40,
    to: 0,
  });

  const opacity = interpolate(
    frame,
    [0, enterFrames, sceneDurationFrames - exitFrames, sceneDurationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (isHook) {
    return (
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 60,
          paddingRight: 60,
        }}
      >
        <div style={{ opacity, transform: `translateY(${translateY}px)`, textAlign: "center" }}>
          <span
            style={{
              fontFamily: BRAND.fontDisplay,
              fontWeight: 800,
              fontSize: 84,
              lineHeight: 1.1,
              color: BRAND.coral,
              textShadow: `0 4px 32px rgba(255,106,77,0.45)`,
              letterSpacing: "-1px",
            }}
          >
            {title}
          </span>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "flex-start",
        paddingTop: 140,
        paddingLeft: 60,
        paddingRight: 60,
      }}
    >
      <div style={{ opacity, transform: `translateY(${translateY}px)` }}>
        <span
          style={{
            fontFamily: BRAND.fontDisplay,
            fontWeight: 700,
            fontSize: 56,
            lineHeight: 1.2,
            color: BRAND.bone,
            textShadow: "0 2px 16px rgba(0,0,0,0.8)",
            letterSpacing: "-0.5px",
          }}
        >
          {title}
        </span>
      </div>
    </AbsoluteFill>
  );
};
