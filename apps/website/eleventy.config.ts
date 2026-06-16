import { pathToFileURL } from "node:url";
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
  eleventyConfig.addDataExtension("ts", {
    read: false,
    parser: async (filePath) => {
      const mod = await import(pathToFileURL(filePath).href);
      const value = mod.default;
      if (typeof value === "function") {
        return await value(eleventyConfig.globalData);
      }
      return value;
    },
  });
  eleventyConfig.addPassthroughCopy({
    "./assets/": "assets",
  });
}
