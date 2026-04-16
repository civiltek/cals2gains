import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { ReelProps, BRAND } from "./types";
import { SceneLayer } from "./components/SceneLayer";
import { ProgressBar } from "./components/ProgressBar";

/**
 * Main Cals2Gains Reel Composition.
 *
 * Uses <Sequence> per scene so that:
 * - useCurrentFrame() inside each SceneLayer is LOCAL (0 = scene start)
 * - <Audio> components are automatically placed at the correct global timeline position
 * - Scene duration is enforced — audio stops when the scene ends
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
        overflow: "hidden",
      }}
    >
      {scenes.map((scene, index) => {
        const sceneDurationFrames = Math.round(scene.durationSeconds * fps);
        return (
          <Sequence
            key={scene.id}
            from={sceneOffsets[index]}
            durationInFrames={sceneDurationFrames}
            layout="none"
          >
            <SceneLayer
              scene={scene}
              sceneDurationFrames={sceneDurationFrames}
              sceneIndex={index}
              watermark={watermark}
            />
          </Sequence>
        );
      })}

      {showProgressBar && <ProgressBar progress={globalProgress} />}
    </AbsoluteFill>
  );
};
