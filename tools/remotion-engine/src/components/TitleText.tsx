import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BRAND } from "../types";

interface TitleTextProps {
  title: string;
  /** Frame within the current scene (0-based) */
  sceneFrame: number;
  sceneDurationFrames: number;
  /** Is this scene 0 (hook scene)? Hook gets bigger, coral text */
  isHook: boolean;
}

/**
 * Animated title text with slide-up entrance.
 * Hook scene: large coral text, centered, drama.
 * Regular scenes: medium bone text, upper third.
 */
export const TitleText: React.FC<TitleTextProps> = ({
  title,
  sceneFrame,
  sceneDurationFrames,
  isHook,
}) => {
  const { fps } = useVideoConfig();

  // Slide-up + fade entrance over 12 frames
  const enterFrames = 12;
  const exitFrames = 8;

  const translateY = spring({
    fps,
    frame: sceneFrame,
    config: { damping: 18, stiffness: 120 },
    durationInFrames: enterFrames,
    from: 40,
    to: 0,
  });

  const opacity = interpolate(
    sceneFrame,
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
        <div
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: BRAND.fontDisplay,
              fontWeight: 800,
              fontSize: 84,
              lineHeight: 1.1,
              color: BRAND.coral,
              textShadow: "0 4px 32px rgba(255,106,77,0.45)",
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
        paddingTop: 160,
        paddingLeft: 60,
        paddingRight: 60,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px`,
        }}
      >
        <span
          style={{
            fontFamily: BRAND.fontDisplay,
            fontWeight: 700,
            fontSize: 58,
            lineHeight: 1.15,
            color: BRAND.bone,
            textShadow: "0 2px 16px rgba(0,0,0,0.7)",
            letterSpacing: "-0.5px",
          }}
        >
          {title}
        </span>
      </div>
    </AbsoluteFill>
  );
};
