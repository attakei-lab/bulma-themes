import type { EleventyConfig } from "@11ty/eleventy";
import fontAwesomePlugin from "@11ty/font-awesome";

export const config = {
  dir: {
    input: "./src",
    includes: "_includes",
    layouts: "_layouts",
  },
  htmlTemplateEngine: "njk",
};

export default async function (eleventyConfig: EleventyConfig) {
  eleventyConfig.addPlugin(fontAwesomePlugin);
  eleventyConfig.addPassthroughCopy({
    "./assets/": "assets",
  });
}
