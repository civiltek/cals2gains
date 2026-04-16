import React from "react";
import {
  AbsoluteFill,
  Video,
  Img,
  staticFile,
  useVideoConfig,
} from "remotion";
import { SceneData, BRAND } from "../types";

interface BackgroundProps {
  scene: SceneData;
}

/**
 * Renders either a Sora 2 video clip or a DALL-E 3 still image as background.
 * Video clips loop if shorter than scene duration.
 * Images use a subtle Ken Burns zoom to add motion.
 */
export const Background: React.FC<BackgroundProps> = ({ scene }) => {
  const { width, height } = useVideoConfig();

  const style: React.CSSProperties = {
    width,
    height,
    objectFit: "cover",
  };

  if (scene.backgroundType === "video") {
    return (
      <AbsoluteFill>
        <Video
          src={staticFile(scene.backgroundFile)}
          style={style}
          loop
          muted
        />
        {/* Dark vignette overlay for text readability */}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(to bottom, rgba(23,18,29,0.35) 0%, rgba(23,18,29,0.0) 40%, rgba(23,18,29,0.0) 55%, rgba(23,18,29,0.85) 100%)",
          }}
        />
      </AbsoluteFill>
    );
  }

  // Static image fallback (DALL-E 3)
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.dark }}>
      <Img
        src={staticFile(scene.backgroundFile)}
        style={style}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(23,18,29,0.40) 0%, rgba(23,18,29,0.0) 40%, rgba(23,18,29,0.0) 55%, rgba(23,18,29,0.88) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
