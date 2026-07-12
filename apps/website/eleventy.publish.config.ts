import type { EleventyConfig } from "@11ty/eleventy";
import baseConfig, { config } from "./eleventy.config.ts";

export { config };

export default async function (eleventyConfig: EleventyConfig) {
  await baseConfig(eleventyConfig);
  eleventyConfig.addGlobalData("site", {
    url: process.env.PRODUCTION_FQDN
      ? `https://${process.env.PRODUCTION_FQDN}`
      : "",
    base_path: process.env.PRODUCTION_PATH || "",
  });
}
