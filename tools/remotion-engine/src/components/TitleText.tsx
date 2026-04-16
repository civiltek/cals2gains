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
 * Animated title text.
 *
 * Hook scene (index 0):
 *   - Large coral text, centered, semi-transparent dark pill background
 *   - Strong glow + text shadow for punch
 *
 * Regular scenes:
 *   - Medium bone text, upper third, pill with coral/violet tint (0.75 opacity)
 *   - Spring slide-up entrance
 *
 * Both: fade out last 8 frames.
 * Titles are converted to sentence case (only first letter uppercase).
 */

/**
 * Convert any capitalization to sentence case.
 * "Lleva Tu Botella Siempre" → "Lleva tu botella siempre"
 * "¿Sabías que...?" → "¿Sabías que...?" (handles ¿/¡ prefix)
 */
function toSentenceCase(text: string): string {
  if (!text) return text;
  // Lowercase everything, then uppercase the first alphabetic character
  const lower = text.toLowerCase();
  return lower.replace(/[a-záéíóúüñ]/i, (c) => c.toUpperCase());
}

export const TitleText: React.FC<TitleTextProps> = ({
  title,
  frame,
  sceneDurationFrames,
  isHook,
}) => {
  const { fps } = useVideoConfig();

  const displayTitle = toSentenceCase(title);

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
          paddingRight: 120,
        }}
      >
        <div
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            textAlign: "center",
            backgroundColor: "rgba(23,18,29,0.65)",
            borderRadius: 24,
            padding: "24px 36px",
          }}
        >
          <span
            style={{
              fontFamily: BRAND.fontDisplay,
              fontWeight: 800,
              fontSize: 80,
              lineHeight: 1.1,
              color: BRAND.coral,
              textShadow: `0 0 40px rgba(255,106,77,0.55), 0 4px 16px rgba(0,0,0,0.9)`,
              letterSpacing: "-1px",
              display: "block",
            }}
          >
            {displayTitle}
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
        paddingRight: 120,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          // Pill con fondo coral translúcido — distintivo, sin ser plano gris
          backgroundColor: "rgba(255,106,77,0.78)",
          borderRadius: 18,
          padding: "14px 26px",
        }}
      >
        <span
          style={{
            fontFamily: BRAND.fontDisplay,
            fontWeight: 700,
            fontSize: 52,
            lineHeight: 1.2,
            color: "#FFFFFF",
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            letterSpacing: "-0.5px",
            display: "block",
          }}
        >
          {displayTitle}
        </span>
      </div>
    </AbsoluteFill>
  );
};
