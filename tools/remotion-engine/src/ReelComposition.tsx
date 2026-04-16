import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ReelProps, BRAND } from "./types";
import { SceneLayer } from "./components/SceneLayer";
import { ProgressBar } from "./components/ProgressBar";
import { CTASlide, CTA_DURATION_SECONDS } from "./components/CTASlide";

/**
 * Main Cals2Gains Reel Composition.
 *
 * Uses <Sequence> per scene so that:
 * - useCurrentFrame() inside each SceneLayer is LOCAL (0 = scene start)
 * - <Audio> components are automatically placed at the correct global timeline position
 * - Scene duration is enforced — audio stops when the scene ends
 *
 * CTA slide (3.5s) is appended at the end when showCTASlide !== false.
 * Background music plays at 25% volume under the full reel.
 */
export const ReelComposition: React.FC<ReelProps> = ({
  scenes,
  lang,
  showProgressBar,
  template,
  watermark,
  backgroundMusicFile,
  showCTASlide = true,
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

  // Total frames used by content scenes
  const contentFrames = useMemo(
    () => sceneOffsets.length > 0
      ? sceneOffsets[sceneOffsets.length - 1] + Math.round(scenes[scenes.length - 1].durationSeconds * fps)
      : 0,
    [sceneOffsets, scenes, fps]
  );

  const ctaFrames = showCTASlide ? Math.round(CTA_DURATION_SECONDS * fps) : 0;

  const globalProgress = frame / durationInFrames;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.dark,
        overflow: "hidden",
      }}
    >
      {/* Background music — plays full reel at 25% volume */}
      {backgroundMusicFile && (
        <Audio
          src={staticFile(backgroundMusicFile)}
          volume={0.25}
          // Loop if the music is shorter than the reel
          loop
        />
      )}

      {/* Content scenes */}
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

      {/* CTA slide — always last, after all scenes */}
      {showCTASlide && (
        <Sequence
          from={contentFrames}
          durationInFrames={ctaFrames}
          layout="none"
        >
          <CTASlide />
        </Sequence>
      )}

      {showProgressBar && <ProgressBar progress={globalProgress} />}
    </AbsoluteFill>
  );
};
