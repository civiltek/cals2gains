import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { SubtitleWord, BRAND } from "../types";

interface SubtitlesProps {
  subtitles: SubtitleWord[];
  /** Current time in seconds within this scene */
  sceneTimeSeconds: number;
}

/**
 * Word-by-word subtitle renderer.
 * Shows words highlighted in coral as they are spoken.
 * Previously spoken words appear in semi-transparent bone.
 * Future words are hidden.
 *
 * Renders at bottom third of frame (y ~1580-1820).
 */
export const Subtitles: React.FC<SubtitlesProps> = ({
  subtitles,
  sceneTimeSeconds,
}) => {
  if (!subtitles || subtitles.length === 0) return null;

  // Determine visible window: show words within a rolling ~3s window ending at now
  const windowStart = Math.max(0, sceneTimeSeconds - 3.0);

  const visibleWords = subtitles.filter(
    (w) => w.start <= sceneTimeSeconds + 0.1 && w.end >= windowStart
  );

  if (visibleWords.length === 0) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 200,
        paddingLeft: 50,
        paddingRight: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 8px",
          // Semi-transparent dark pill for readability
          backgroundColor: "rgba(23,18,29,0.65)",
          borderRadius: 16,
          padding: "14px 24px",
          maxWidth: 980,
        }}
      >
        {visibleWords.map((w, i) => {
          const isActive =
            sceneTimeSeconds >= w.start && sceneTimeSeconds <= w.end;
          const isPast = sceneTimeSeconds > w.end;

          return (
            <span
              key={`${w.word}-${i}`}
              style={{
                fontFamily: BRAND.fontDisplay,
                fontWeight: isActive ? 700 : 500,
                fontSize: 42,
                lineHeight: 1.4,
                color: isActive
                  ? BRAND.coral
                  : isPast
                  ? BRAND.textSecondary
                  : BRAND.bone,
                transition: "color 0.1s",
                textShadow: isActive
                  ? "0 0 20px rgba(255,106,77,0.6)"
                  : "none",
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
