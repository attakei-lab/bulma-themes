import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { EleventyConfig } from "@11ty/eleventy";
import fontAwesomePlugin from "@11ty/font-awesome";

const require = createRequire(import.meta.url);
// CJS-only package; load via require in ESM context
const markdownCopyButton = require("eleventy-plugin-markdown-copy-button");

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
  eleventyConfig.addPlugin(markdownCopyButton);
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
  // Colocated images for docs pages: an asset next to `src/docs/<name>/index.md`
  // is copied to `/docs/<name>/`, so the page can reference it with a plain
  // relative path (the folder-form page and its assets share an output dir).
  eleventyConfig.addPassthroughCopy(
    "./src/docs/**/*.{png,svg,jpg,jpeg,webp,gif}",
  );
  eleventyConfig.addCollection("theme", (api) =>
    api.getFilteredByGlob("./src/theme/*.md"),
  );
}
