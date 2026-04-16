import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { SubtitleWord, BRAND } from "../types";

interface SubtitlesProps {
  subtitles: SubtitleWord[];
  /** Current time in seconds within this scene */
  sceneTimeSeconds: number;
}

/**
 * Karaoke-style subtitle renderer — viral impersonal format 2026.
 *
 * Active word: GOLD (#FFD700), 72px, scale 1.18, intense glow.
 * Past words: fade ~0.35 alpha (mantienen contexto sin distraer).
 * Future words: fade ~0.75 alpha (visible pero secundario).
 * Ventana: 2s rolling (más ritmo que la anterior 3s).
 *
 * Posicionamiento: tercio central-inferior, 360px desde abajo
 * (respeta safe zone Instagram 320px + margen visual).
 * Peso 900 en activa, 700 en resto — jerarquía tipográfica clara.
 */
export const Subtitles: React.FC<SubtitlesProps> = ({
  subtitles,
  sceneTimeSeconds,
}) => {
  if (!subtitles || subtitles.length === 0) return null;

  // Ventana rodante 2s — ritmo viral, 4-6 palabras visibles máx
  const windowStart = Math.max(0, sceneTimeSeconds - 1.8);
  const windowEnd = sceneTimeSeconds + 0.8;

  const visibleWords = subtitles.filter(
    (w) => w.start <= windowEnd && w.end >= windowStart
  );

  if (visibleWords.length === 0) return null;

  return (
    // paddingBottom 360px deja aire sobre la UI de Instagram
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 360,
        paddingLeft: 40,
        paddingRight: 40,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "4px 12px",
          // Pill oscuro más opaco para contraste sobre B-roll cinemático
          backgroundColor: "rgba(23,18,29,0.82)",
          borderRadius: 24,
          padding: "22px 34px",
          maxWidth: 960,
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
        }}
      >
        {visibleWords.map((w, i) => {
          const isActive =
            sceneTimeSeconds >= w.start && sceneTimeSeconds <= w.end;
          const isPast = sceneTimeSeconds > w.end + 0.05;
          const isFuture = sceneTimeSeconds < w.start - 0.05;

          // Scale pop más agresivo en activa
          const scale = isActive ? 1.18 : 1.0;

          return (
            <span
              key={`${w.word}-${i}`}
              style={{
                fontFamily: BRAND.fontDisplay,
                fontWeight: isActive ? 900 : 700,
                fontSize: isActive ? 72 : 60,
                lineHeight: 1.25,
                color: isActive
                  ? "#FFD700"
                  : isPast
                  ? "rgba(247,242,234,0.38)"
                  : isFuture
                  ? "rgba(247,242,234,0.72)"
                  : BRAND.bone,
                textShadow: isActive
                  ? "0 0 32px rgba(255,215,0,0.85), 0 0 12px rgba(255,215,0,0.6), 0 3px 10px rgba(0,0,0,0.95)"
                  : "0 2px 8px rgba(0,0,0,0.85)",
                transform: `scale(${scale})`,
                display: "inline-block",
                transition: "transform 0.06s, color 0.06s",
                letterSpacing: isActive ? "0.3px" : "-0.2px",
                textTransform: "uppercase",
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
