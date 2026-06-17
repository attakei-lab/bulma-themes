import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { EleventyConfig } from "@11ty/eleventy";
import fontAwesomePlugin from "@11ty/font-awesome";

const themesDistDir = resolve(
  dirname(
    fileURLToPath(import.meta.resolve("@attakei/bulma-themes/package.json")),
  ),
  "dist",
);

export const config = {
  dir: {
    input: "./src",
    includes: "_includes",
    layouts: "_layouts",
  },
  htmlTemplateEngine: "njk",
};

export default async function (eleventyConfig: EleventyConfig) {
  eleventyConfig.addPlugin(fontAwesomePlugin, {
    defaultAttributes: {
      class: "svg-inline--fa",
      "aria-hidden": "true",
    },
  });
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
    [themesDistDir]: "dist",
  });
  eleventyConfig.addCollection("theme", (api) =>
    api.getFilteredByGlob("./src/theme/*.md"),
  );
}
