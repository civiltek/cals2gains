import React from "react";
import {
  AbsoluteFill,
  Video,
  Img,
  staticFile,
  useVideoConfig,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { SceneData, BRAND } from "../types";

interface BackgroundProps {
  scene: SceneData;
}

/**
 * Renders either a Sora 2 video clip or a DALL-E 3 still image as background.
 *
 * Video clips: loop if shorter than scene duration.
 * Images: Ken Burns effect — slow zoom-in + subtle pan for motion feel.
 *
 * Dark vignette overlay on both types for text readability.
 */
export const Background: React.FC<BackgroundProps> = ({ scene }) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame(); // LOCAL frame via Sequence
  const sceneDurationFrames = Math.round(scene.durationSeconds * fps);

  const baseStyle: React.CSSProperties = {
    width,
    height,
    objectFit: "cover",
  };

  // Vignette intensificado para reels virales impersonales:
  // top-third 0.55 (título legible), middle 0.20 (mantiene B-roll visible),
  // bottom-third 0.92 (subs legibles sobre cualquier escena).
  const vignette = (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(to bottom, rgba(23,18,29,0.55) 0%, rgba(23,18,29,0.15) 28%, rgba(23,18,29,0.20) 55%, rgba(23,18,29,0.92) 100%)",
      }}
    />
  );

  if (scene.backgroundType === "video") {
    return (
      <AbsoluteFill>
        <Video
          src={staticFile(scene.backgroundFile)}
          style={baseStyle}
          loop
          muted
        />
        {vignette}
      </AbsoluteFill>
    );
  }

  // --- Ken Burns effect for static images ---
  // Slow zoom from 100% to 108% + subtle pan right-to-left
  const scale = interpolate(
    frame,
    [0, sceneDurationFrames],
    [1.0, 1.08],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const translateX = interpolate(
    frame,
    [0, sceneDurationFrames],
    [0, -30],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const translateY = interpolate(
    frame,
    [0, sceneDurationFrames],
    [0, -10],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.dark, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={staticFile(scene.backgroundFile)}
          style={baseStyle}
        />
      </AbsoluteFill>
      {vignette}
    </AbsoluteFill>
  );
};
