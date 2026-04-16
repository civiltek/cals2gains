import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { SceneData, BRAND } from "../types";
import { Background } from "./Background";
import { TitleText } from "./TitleText";
import { Subtitles } from "./Subtitles";
import { Logo } from "./Logo";
import { Watermark } from "./Watermark";

interface SceneLayerProps {
  scene: SceneData;
  /** Total frames of this scene (passed from parent, matches Sequence durationInFrames) */
  sceneDurationFrames: number;
  sceneIndex: number;
  watermark: string;
}

/**
 * Renders one scene: background + title + subtitles + logo + audio.
 *
 * useCurrentFrame() here is LOCAL because this component is wrapped in <Sequence>.
 * frame=0 means start of this scene, frame=sceneDurationFrames-1 means last frame.
 * <Audio> starts automatically at the correct global timeline position via Sequence.
 */
export const SceneLayer: React.FC<SceneLayerProps> = ({
  scene,
  sceneDurationFrames,
  sceneIndex,
  watermark,
}) => {
  const frame = useCurrentFrame(); // LOCAL frame — 0 = scene start
  const { fps } = useVideoConfig();

  const sceneTimeSeconds = frame / fps;

  // --- Entrance transition (viral pacing: corta y seca, 6 frames ≈ 0.2s) ---
  const transitionInFrames = 6;
  let opacity = 1;
  let translateY = 0;
  let scale = 1;

  if (scene.transition === "fade") {
    opacity = interpolate(frame, [0, transitionInFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (scene.transition === "slide_up") {
    translateY = interpolate(frame, [0, transitionInFrames], [60, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    opacity = interpolate(frame, [0, transitionInFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (scene.transition === "slide_left") {
    const tx = interpolate(frame, [0, transitionInFrames], [80, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    opacity = interpolate(frame, [0, transitionInFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (scene.transition === "zoom") {
    // Zoom-punch viral: 1.15 → 1.0 en 6 frames (sensación de golpe)
    scale = interpolate(frame, [0, transitionInFrames], [1.15, 1.0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    opacity = interpolate(frame, [0, transitionInFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  // Fade out corto al final (4f ≈ 0.13s) — corte duro viral
  const fadeOutStart = sceneDurationFrames - 4;
  if (frame > fadeOutStart) {
    opacity = opacity * interpolate(frame, [fadeOutStart, sceneDurationFrames], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        backgroundColor: BRAND.dark,
        fontFamily: BRAND.fontDisplay,
        overflow: "hidden",
      }}
    >
      {/* Layer 1: Background video or image */}
      <Background scene={scene} />

      {/* Layer 2: Title text */}
      <TitleText
        title={scene.title}
        frame={frame}
        sceneDurationFrames={sceneDurationFrames}
        isHook={sceneIndex === 0}
      />

      {/* Layer 3: Word-by-word subtitles */}
      <Subtitles
        subtitles={scene.subtitles}
        sceneTimeSeconds={sceneTimeSeconds}
      />

      {/* Layer 4: Logo */}
      <Logo frame={frame} sceneDurationFrames={sceneDurationFrames} />

      {/* Layer 5: Watermark */}
      <Watermark handle={watermark} />

      {/* Audio: voiceover — starts at scene start (handled by parent Sequence) */}
      {scene.voiceoverFile && (
        <Audio
          src={staticFile(scene.voiceoverFile)}
          volume={1}
        />
      )}
    </AbsoluteFill>
  );
};
