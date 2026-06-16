/* -----
 * Site data.
 */
type GlobalData = {
  url: string;
  base_path: string;
};
type SiteData = {
  url: string;
  base_path: string;
  title: string;
  repo_url: string;
};

const defaults: SiteData = {
  url: "http://localhost:8080",
  base_path: "",
  title: "Color Themes for Bulma",
  repo_url: "https://github.com/attakei-lab/bulma-themes",
};

export default function (configData: { site?: Partial<GlobalData> }): SiteData {
  return { ...defaults, ...(configData.site ?? {}) };
}
