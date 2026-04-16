import React from "react";
import { Composition } from "remotion";
import { ReelComposition } from "./ReelComposition";
import { ReelProps, BRAND } from "./types";
import { CTA_DURATION_SECONDS } from "./components/CTASlide";

/**
 * Remotion entry point.
 * Registers the ReelComposition with default props for Studio preview.
 * The actual props are injected via --props when rendering.
 */

const defaultProps: ReelProps = {
  lang: "es",
  showProgressBar: true,
  template: "educational_tips",
  watermark: "@cals2gains",
  scenes: [
    {
      id: "scene_0",
      backgroundType: "image",
      backgroundFile: "placeholder_dark.png",
      title: "3 Tips para beber mas agua",
      voiceoverFile: undefined,
      durationSeconds: 4,
      subtitles: [],
      transition: "fade",
    },
    {
      id: "scene_1",
      backgroundType: "image",
      backgroundFile: "placeholder_dark.png",
      title: "Tip 1: Empieza el dia con agua",
      voiceoverFile: undefined,
      durationSeconds: 5,
      subtitles: [],
      transition: "slide_up",
    },
    {
      id: "scene_2",
      backgroundType: "image",
      backgroundFile: "placeholder_dark.png",
      title: "Tip 2: Lleva una botella siempre",
      voiceoverFile: undefined,
      durationSeconds: 5,
      subtitles: [],
      transition: "fade",
    },
    {
      id: "scene_3",
      backgroundType: "image",
      backgroundFile: "placeholder_dark.png",
      title: "Tip 3: Pon alarmas de hidratacion",
      voiceoverFile: undefined,
      durationSeconds: 5,
      subtitles: [],
      transition: "zoom",
    },
  ],
};

// Calculate total frames from default props
const totalSeconds = defaultProps.scenes.reduce((sum, s) => sum + s.durationSeconds, 0);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReelComp = ReelComposition as React.ComponentType<any>;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReelComposition"
        component={ReelComp}
        durationInFrames={totalSeconds * BRAND.fps}
        fps={BRAND.fps}
        width={BRAND.reelWidth}
        height={BRAND.reelHeight}
        defaultProps={defaultProps as unknown as Record<string, unknown>}
        calculateMetadata={async ({ props: rawProps }) => {
          const props = rawProps as unknown as ReelProps;
          const fps = BRAND.fps;
          const sceneFrames = props.scenes.reduce(
            (sum: number, s: { durationSeconds: number }) =>
              sum + Math.round(s.durationSeconds * fps),
            0
          );
          // Add CTA slide duration unless explicitly disabled
          const ctaFrames = props.showCTASlide !== false
            ? Math.round(CTA_DURATION_SECONDS * fps)
            : 0;
          return { durationInFrames: Math.max(sceneFrames + ctaFrames, 30) };
        }}
      />
    </>
  );
};
