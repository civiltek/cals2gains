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
  /** Frame offset at which this scene starts in the global timeline */
  startFrame: number;
  totalDurationFrames: number;
  sceneIndex: number;
  watermark: string;
  showProgressBar: boolean;
}

/**
 * Renders one scene: background + title + subtitles + logo + audio.
 * Handles fade/slide transition at scene entry.
 */
export const SceneLayer: React.FC<SceneLayerProps> = ({
  scene,
  startFrame,
  totalDurationFrames,
  sceneIndex,
  watermark,
}) => {
  const { fps } = useVideoConfig();
  const globalFrame = useCurrentFrame();
  const sceneFrame = globalFrame - startFrame;
  const sceneDurationFrames = Math.round(scene.durationSeconds * fps);
  const sceneTimeSeconds = sceneFrame / fps;

  // Only render when this scene is active (or in transition overlap)
  const transitionFrames = 8;
  if (sceneFrame < -transitionFrames || sceneFrame >= sceneDurationFrames + transitionFrames) {
    return null;
  }

  // ---- Transition opacity ----
  let opacity = 1;
  if (scene.transition === "fade") {
    opacity = interpolate(
      sceneFrame,
      [0, transitionFrames, sceneDurationFrames - transitionFrames, sceneDurationFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  }

  // ---- Slide up transition ----
  let translateY = 0;
  if (scene.transition === "slide_up" && sceneFrame < transitionFrames) {
    translateY = interpolate(sceneFrame, [0, transitionFrames], [60, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  // ---- Zoom transition ----
  let scale = 1;
  if (scene.transition === "zoom") {
    scale = interpolate(
      sceneFrame,
      [0, transitionFrames],
      [1.08, 1.0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  }

  const globalProgress = (startFrame + sceneFrame) / totalDurationFrames;

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        backgroundColor: BRAND.dark,
        fontFamily: BRAND.fontDisplay,
      }}
    >
      {/* Layer 1: Background video or image */}
      <Background scene={scene} />

      {/* Layer 2: Title text */}
      <TitleText
        title={scene.title}
        sceneFrame={sceneFrame}
        sceneDurationFrames={sceneDurationFrames}
        isHook={sceneIndex === 0}
      />

      {/* Layer 3: Word-by-word subtitles */}
      <Subtitles
        subtitles={scene.subtitles}
        sceneTimeSeconds={Math.max(0, sceneTimeSeconds)}
      />

      {/* Layer 4: Logo */}
      <Logo sceneFrame={sceneFrame} sceneDurationFrames={sceneDurationFrames} />

      {/* Layer 5: Watermark */}
      <Watermark handle={watermark} />

      {/* Audio: voiceover for this scene */}
      {scene.voiceoverFile && sceneFrame >= 0 && (
        <Audio
          src={staticFile(scene.voiceoverFile)}
          startFrom={0}
          volume={1}
        />
      )}
    </AbsoluteFill>
  );
};
