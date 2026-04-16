// Cals2Gains Remotion Engine — Shared Types
// All scene/reel data passed via inputProps to ReelComposition

export type TransitionType = "fade" | "slide_up" | "slide_left" | "zoom";

export type TemplateType =
  | "educational_tips"
  | "before_after"
  | "myth_buster"
  | "motivational";

export interface SubtitleWord {
  word: string;
  /** Start time in seconds from beginning of this scene */
  start: number;
  /** End time in seconds from beginning of this scene */
  end: number;
}

export interface SceneData {
  /** Unique scene ID */
  id: string;
  /** "video" if we have a Sora clip, "image" if DALL-E 3 fallback */
  backgroundType: "video" | "image";
  /**
   * Filename relative to public/ folder
   * e.g. "scene_0_bg.mp4" or "scene_0_bg.png"
   */
  backgroundFile: string;
  /** Short scene title — max 7 words, ASCII only */
  title: string;
  /** Optional path to voiceover MP3 relative to public/ */
  voiceoverFile?: string;
  /** Duration of this scene in seconds */
  durationSeconds: number;
  /** Word-level timestamps for subtitles */
  subtitles: SubtitleWord[];
  /** Transition FROM previous scene into this one */
  transition: TransitionType;
}

export interface ReelProps {
  scenes: SceneData[];
  /** "es" | "en" — affects watermark text */
  lang: "es" | "en";
  /** Show bottom progress bar */
  showProgressBar: boolean;
  /** Template style */
  template: TemplateType;
  /** Watermark handle e.g. "@cals2gains" */
  watermark: string;
  /**
   * Optional background music file (relative to public/).
   * e.g. "background_music.mp3". Plays at 25% volume under voiceover.
   */
  backgroundMusicFile?: string;
  /**
   * Whether to append the branded CTA slide (3.5s) at the end.
   * Default: true.
   */
  showCTASlide?: boolean;
}

// Brand constants mirrored here so React components don't import Python brand_config
export const BRAND = {
  coral: "#FF6A4D",
  violet: "#9C8CFF",
  dark: "#17121D",
  bone: "#F7F2EA",
  orange: "#FF9800",
  card: "#1E1829",
  textSecondary: "rgba(247,242,234,0.6)",
  fontDisplay: "Outfit",
  fontBody: "Instrument Sans",
  reelWidth: 1080,
  reelHeight: 1920,
  fps: 30,
} as const;
