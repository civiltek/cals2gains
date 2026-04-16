import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ReelProps, BRAND } from "./types";
import { SceneLayer } from "./components/SceneLayer";
import { ProgressBar } from "./components/ProgressBar";

/**
 * Main Cals2Gains Reel Composition.
 * Stacks all scenes sequentially on the timeline.
 * Each scene is absolutely positioned and transitions in/out independently.
 */
export const ReelComposition: React.FC<ReelProps> = ({
  scenes,
  lang,
  showProgressBar,
  template,
  watermark,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Pre-compute start frame for each scene
  const sceneOffsets = useMemo(() => {
    const offsets: number[] = [];
    let accum = 0;
    for (const scene of scenes) {
      offsets.push(accum);
      accum += Math.round(scene.durationSeconds * fps);
    }
    return offsets;
  }, [scenes, fps]);

  const globalProgress = frame / durationInFrames;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.dark,
        width: BRAND.reelWidth,
        height: BRAND.reelHeight,
        overflow: "hidden",
      }}
    >
      {scenes.map((scene, index) => (
        <SceneLayer
          key={scene.id}
          scene={scene}
          startFrame={sceneOffsets[index]}
          totalDurationFrames={durationInFrames}
          sceneIndex={index}
          watermark={watermark}
          showProgressBar={showProgressBar}
        />
      ))}

      {showProgressBar && <ProgressBar progress={globalProgress} />}
    </AbsoluteFill>
  );
};
