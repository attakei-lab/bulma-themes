import type { EleventyConfig } from "@11ty/eleventy";
import baseConfig, { config } from "./eleventy.config.ts";

export { config };

export default async function (eleventyConfig: EleventyConfig) {
  await baseConfig(eleventyConfig);
  eleventyConfig.addGlobalData("site", {
    url: "https://bulma-themes.attakei.dev",
    base_path: "",
  });
}
