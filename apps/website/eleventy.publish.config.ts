import type { EleventyConfig } from "@11ty/eleventy";
import baseConfig, { config } from "./eleventy.config.ts";

export { config };

export default async function (eleventyConfig: EleventyConfig) {
  await baseConfig(eleventyConfig);
  eleventyConfig.addGlobalData("site", {
    // TODO: Edit it after (until release).
    url: "https://attakei-lab.github.io",
    base_path: "/bulma-themes",
  });
}
