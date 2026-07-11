// SPDX-License-Identifier: MIT
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as sass from "sass";

const HOMEPAGE = "https://github.com/attakei-lab/bulma-themes";
const banner = (theme: string, debug: boolean): string => {
  const head = `/*! @attakei/bulma-themes/${theme} | MIT License | ${HOMEPAGE} */`;
  return debug ? `${head}\n` : head;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, "src");
const DIST_DIR = resolve(__dirname, "dist");
const ENTRY = resolve(__dirname, "entry.scss");
// Bulma's package root (the directory holding `sass/`). Added to loadPaths so
// `entry.scss` can `@use "sass" with (...)` to configure Bulma — the umbrella
// `pkg:bulma` cannot be configured with `with()`, which is required to inject
// the `secondary` colour into Bulma's `$custom-colors` map.
const BULMA_ROOT = dirname(
  fileURLToPath(import.meta.resolve("bulma/package.json")),
);

async function listThemes(): Promise<string[]> {
  const entries = await readdir(SRC_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function compileTheme(theme: string, debug: boolean): Promise<void> {
  const themeDir = join(SRC_DIR, theme);
  const outDir = join(DIST_DIR, theme);
  const ext = debug ? "css" : "min.css";
  const outFile = join(outDir, `theme.${ext}`);

  const result = sass.compile(ENTRY, {
    loadPaths: [themeDir, BULMA_ROOT],
    style: debug ? "expanded" : "compressed",
    sourceMap: debug,
  });

  await mkdir(outDir, { recursive: true });

  let css = banner(theme, debug) + result.css;
  if (debug && result.sourceMap) {
    const mapFile = `${outFile}.map`;
    css += `\n/*# sourceMappingURL=theme.${ext}.map */\n`;
    await writeFile(mapFile, JSON.stringify(result.sourceMap));
  }
  await writeFile(outFile, css);

  console.log(`  ${outFile}`);
}

async function main() {
  const debug = process.argv.includes("--debug");
  const themes = await listThemes();
  console.log(
    `Building ${themes.length} theme(s) in ${debug ? "debug" : "release"} mode:`,
  );
  for (const theme of themes) {
    console.log(`[${theme}]`);
    await compileTheme(theme, debug);
  }
}

await main();
