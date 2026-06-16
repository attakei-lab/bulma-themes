import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as sass from "sass";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, "src");
const DIST_DIR = resolve(__dirname, "dist");
const PACKAGE_IMPORTER = new sass.NodePackageImporter();

type Variant = {
  name: "theme" | "theme.data" | "theme.full";
  entry: (theme: string) => string;
};

const VARIANTS: Variant[] = [
  {
    name: "theme",
    entry: () => `@use "_variables" as v;\n:root { @include v.variables; }\n`,
  },
  {
    name: "theme.data",
    entry: (theme) =>
      `@use "_variables" as v;\n[data-theme=${theme}] { @include v.variables; }\n`,
  },
  {
    name: "theme.full",
    entry: () =>
      `@use "pkg:bulma";\n@use "_variables" as v;\n:root { @include v.variables; }\n`,
  },
];

async function listThemes(): Promise<string[]> {
  const entries = await readdir(SRC_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function compileVariant(
  theme: string,
  variant: Variant,
  debug: boolean,
): Promise<void> {
  const themeDir = join(SRC_DIR, theme);
  const outDir = join(DIST_DIR, theme);
  const ext = debug ? "css" : "min.css";
  const outFile = join(outDir, `${variant.name}.${ext}`);

  const result = sass.compileString(variant.entry(theme), {
    loadPaths: [themeDir],
    importers: [PACKAGE_IMPORTER],
    style: debug ? "expanded" : "compressed",
    sourceMap: debug,
    url: new URL(`file://${themeDir}/entry.scss`),
  });

  await mkdir(outDir, { recursive: true });

  let css = result.css;
  if (debug && result.sourceMap) {
    const mapFile = `${outFile}.map`;
    css += `\n/*# sourceMappingURL=${variant.name}.${ext}.map */\n`;
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
    for (const variant of VARIANTS) {
      await compileVariant(theme, variant, debug);
    }
  }
}

await main();
