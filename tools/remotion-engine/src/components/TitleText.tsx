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
 * Animated title text — viral impersonal reel format 2026.
 *
 * Hook scene (index 0):
 *   - MASSIVE coral text (110px), centered, zoom-punch entrance (scale 1.2 → 1.0)
 *   - Strong glow + triple text shadow for punch
 *   - Occupies ≥60% horizontal space (text-forward)
 *
 * Regular scenes:
 *   - Bold bone text (78px), upper third on coral pill
 *   - Spring slide-up entrance + subtle scale
 *
 * Both: snap fade-out last 4 frames (no lingering).
 * Titles auto sentence-case.
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

  // Viral pacing: entrada rápida (8f ≈ 0.27s), salida seca (4f ≈ 0.13s)
  const enterFrames = 8;
  const exitFrames = 4;

  const translateY = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 180 },
    durationInFrames: enterFrames,
    from: 60,
    to: 0,
  });

  const opacity = interpolate(
    frame,
    [0, enterFrames, sceneDurationFrames - exitFrames, sceneDurationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // HOOK: zoom-punch scale desde 1.25 → 1.0 en primeros 8 frames
  const hookScale = spring({
    fps,
    frame,
    config: { damping: 12, stiffness: 200 },
    durationInFrames: enterFrames,
    from: 1.25,
    to: 1.0,
  });

  if (isHook) {
    return (
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 40,
          paddingRight: 40,
        }}
      >
        <div
          style={{
            opacity,
            transform: `scale(${hookScale})`,
            textAlign: "center",
            // Pill oscuro translúcido + sombra profunda para legibilidad sobre cualquier fondo
            backgroundColor: "rgba(23,18,29,0.72)",
            borderRadius: 28,
            padding: "32px 44px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
          }}
        >
          <span
            style={{
              fontFamily: BRAND.fontDisplay,
              fontWeight: 800,
              fontSize: 110,
              lineHeight: 1.05,
              color: BRAND.coral,
              // Glow coral triple: disperso, medio, duro
              textShadow:
                "0 0 48px rgba(255,106,77,0.65), 0 0 16px rgba(255,106,77,0.85), 0 6px 20px rgba(0,0,0,0.95)",
              letterSpacing: "-2px",
              display: "block",
              textTransform: "none",
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
        paddingTop: 180,
        paddingLeft: 50,
        paddingRight: 50,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          // Pill coral saturado — impacto tipográfico viral 2026
          backgroundColor: "rgba(255,106,77,0.88)",
          borderRadius: 22,
          padding: "20px 32px",
          boxShadow: "0 14px 40px rgba(255,106,77,0.35), 0 4px 12px rgba(0,0,0,0.35)",
        }}
      >
        <span
          style={{
            fontFamily: BRAND.fontDisplay,
            fontWeight: 800,
            fontSize: 78,
            lineHeight: 1.12,
            color: "#FFFFFF",
            textShadow: "0 3px 16px rgba(0,0,0,0.55)",
            letterSpacing: "-1px",
            display: "block",
          }}
        >
          {displayTitle}
        </span>
      </div>
    </AbsoluteFill>
  );
};
