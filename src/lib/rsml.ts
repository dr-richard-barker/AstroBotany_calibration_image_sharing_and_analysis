// Deep-linking into the AstroRoot RSML root-trace dashboard.
export const ALL_RSML_INDEX_URL = 'https://raw.githubusercontent.com/dr-richard-barker/image-analysis-software-and-R-codes/master/all_rsml_index.json';
export const ASTROROOT_DASHBOARD_URL = 'https://dr-richard-barker.github.io/astroroot/dashboard.html';

export function rsmlDashboardUrl(indexUrl: string, embed = false): string {
  const q = new URLSearchParams({ rsml: indexUrl });
  if (embed) q.set('embed', '1');
  return `${ASTROROOT_DASHBOARD_URL}?${q.toString()}`;
}
