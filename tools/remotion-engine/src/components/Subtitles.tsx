import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { SubtitleWord, BRAND } from "../types";

interface SubtitlesProps {
  subtitles: SubtitleWord[];
  /** Current time in seconds within this scene */
  sceneTimeSeconds: number;
}

/**
 * Karaoke-style subtitle renderer.
 *
 * Active word: gold (#FFD700) bold, scale-up pop animation, glow.
 * Recent words: semi-transparent bone, fade out.
 * Future words: hidden.
 *
 * Instagram safe zone: positioned above 320px bottom margin.
 */
export const Subtitles: React.FC<SubtitlesProps> = ({
  subtitles,
  sceneTimeSeconds,
}) => {
  if (!subtitles || subtitles.length === 0) return null;

  // Rolling 3-second window of visible words
  const windowStart = Math.max(0, sceneTimeSeconds - 2.5);

  const visibleWords = subtitles.filter(
    (w) => w.start <= sceneTimeSeconds + 0.05 && w.end >= windowStart
  );

  if (visibleWords.length === 0) return null;

  return (
    // paddingBottom: 340px keeps subtitles above Instagram safe zone (320px bottom)
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 340,
        paddingLeft: 60,
        paddingRight: 120,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "0 10px",
          backgroundColor: "rgba(23,18,29,0.72)",
          borderRadius: 20,
          padding: "16px 28px",
          maxWidth: 900,
        }}
      >
        {visibleWords.map((w, i) => {
          const isActive =
            sceneTimeSeconds >= w.start && sceneTimeSeconds <= w.end;
          const isPast = sceneTimeSeconds > w.end + 0.05;

          // Scale pop for active word
          const scale = isActive ? 1.12 : 1.0;

          return (
            <span
              key={`${w.word}-${i}`}
              style={{
                fontFamily: BRAND.fontDisplay,
                fontWeight: isActive ? 800 : 600,
                fontSize: isActive ? 58 : 52,
                lineHeight: 1.35,
                color: isActive
                  ? "#FFD700"
                  : isPast
                  ? "rgba(247,242,234,0.45)"
                  : BRAND.bone,
                textShadow: isActive
                  ? "0 0 24px rgba(255,215,0,0.7), 0 2px 8px rgba(0,0,0,0.9)"
                  : "0 2px 6px rgba(0,0,0,0.8)",
                transform: `scale(${scale})`,
                display: "inline-block",
                transition: "transform 0.05s, color 0.05s",
                letterSpacing: isActive ? "0.5px" : "0px",
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
