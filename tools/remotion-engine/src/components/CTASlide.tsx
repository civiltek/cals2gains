import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND } from "../types";

/**
 * Slide final de CTA — aparece siempre como última pantalla del reel.
 *
 * Duración: 3.5 segundos (105 frames @ 30fps).
 * Fondo: gradiente coral → violet (colores corporativos).
 * Contenido: logo Cals2Gains + "@cals2gains" + "Descarga la app gratis".
 */

export const CTA_DURATION_SECONDS = 3.5;

export const CTASlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = Math.round(CTA_DURATION_SECONDS * fps);

  // Fade in/out del slide completo
  const slideOpacity = interpolate(
    frame,
    [0, 12, totalFrames - 10, totalFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Logo: spring scale desde 0.7 a 1.0
  const logoScale = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 100 },
    durationInFrames: 20,
    from: 0.7,
    to: 1.0,
  });

  // Texto principal: slide-up desde +30px
  const textTranslateY = interpolate(
    frame,
    [8, 28],
    [30, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const textOpacity = interpolate(
    frame,
    [8, 24],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Badge "Descarga" — aparece más tarde
  const badgeOpacity = interpolate(
    frame,
    [20, 36],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        // Gradiente diagonal coral → violet
        background: `linear-gradient(150deg, ${BRAND.coral} 0%, #c97aff 55%, ${BRAND.violet} 100%)`,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 48,
        opacity: slideOpacity,
      }}
    >
      {/* Logo — versión clara (sobre fondo oscuro usa la light) */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Img
          src={staticFile("C2G-Logo-Light.png")}
          style={{
            height: 130,
            objectFit: "contain",
            filter: "drop-shadow(0 6px 24px rgba(0,0,0,0.35))",
          }}
        />
      </div>

      {/* Texto central */}
      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${textTranslateY}px)`,
          textAlign: "center",
          paddingLeft: 80,
          paddingRight: 80,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* Síguenos */}
        <span
          style={{
            fontFamily: BRAND.fontDisplay,
            fontWeight: 800,
            fontSize: 78,
            lineHeight: 1.1,
            color: "#FFFFFF",
            textShadow: "0 4px 24px rgba(0,0,0,0.35)",
            letterSpacing: "-1px",
          }}
        >
          Síguenos
        </span>

        {/* Handle */}
        <span
          style={{
            fontFamily: BRAND.fontDisplay,
            fontWeight: 700,
            fontSize: 56,
            lineHeight: 1.1,
            color: "rgba(255,255,255,0.92)",
            textShadow: "0 3px 14px rgba(0,0,0,0.3)",
            letterSpacing: "-0.5px",
          }}
        >
          @cals2gains
        </span>
      </div>

      {/* Badge de descarga */}
      <div
        style={{
          opacity: badgeOpacity,
          backgroundColor: "rgba(0,0,0,0.22)",
          borderRadius: 60,
          paddingTop: 18,
          paddingBottom: 18,
          paddingLeft: 48,
          paddingRight: 48,
        }}
      >
        <span
          style={{
            fontFamily: BRAND.fontBody,
            fontWeight: 700,
            fontSize: 40,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: "0.3px",
          }}
        >
          Descarga la app gratis
        </span>
      </div>
    </AbsoluteFill>
  );
};
