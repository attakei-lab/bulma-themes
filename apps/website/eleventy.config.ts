import type { EleventyConfig } from "@11ty/eleventy";

export const config = {
  dir: {
    input: "./src",
    includes: "_includes",
    layouts: "_layouts",
  },
  htmlTemplateEngine: "njk",
};

export default async function (eleventyConfig: EleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    "./assets/": "assets",
  });
}
