import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setPublicDir("./public");
Config.setCodec("h264");

/**
 * Webpack override: disable URL resolution in css-loader.
 *
 * fonts.css uses @font-face with src: url('/fonts/...') — these are runtime
 * URLs served by Remotion's static file server from the public/ directory.
 * Without url:false, webpack tries to resolve them as file paths and fails.
 */
Config.overrideWebpackConfig((config) => {
  const newRules = (config.module?.rules ?? []).map((rule) => {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) return rule;
    const r = rule as Record<string, unknown>;
    // Match the CSS rule
    if (!(r.test instanceof RegExp) || !r.test.test("test.css")) return rule;
    const uses = (Array.isArray(r.use) ? r.use : [r.use]) as Record<string, unknown>[];
    const newUse = uses.map((u) => {
      if (!u || typeof u !== "object") return u;
      const loader = u.loader as string | undefined;
      if (!loader?.includes("css-loader")) return u;
      return {
        ...u,
        options: { ...((u.options as object) ?? {}), url: false },
      };
    });
    return { ...r, use: newUse };
  });

  return {
    ...config,
    module: {
      ...config.module,
      rules: newRules,
    },
  };
});
