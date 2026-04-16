import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { BRAND } from "../types";

interface ProgressBarProps {
  /** 0.0 to 1.0 — overall reel progress */
  progress: number;
}

/**
 * Thin coral progress bar at the very bottom of the frame.
 * Shows overall reel completion.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const { width } = useVideoConfig();
  const barHeight = 4;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "flex-end",
      }}
    >
      {/* Background track */}
      <div
        style={{
          width,
          height: barHeight,
          backgroundColor: `rgba(247,242,234,0.15)`,
          position: "relative",
        }}
      >
        {/* Filled portion */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: barHeight,
            width: `${Math.min(progress * 100, 100)}%`,
            backgroundColor: BRAND.coral,
            boxShadow: `0 0 10px ${BRAND.coral}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
