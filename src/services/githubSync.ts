import { DEFAULT_MVRT_DATA } from '../data/mvrtData';
import type { MvrtEventItem, MvrtSiteData } from '../types/mvrt';
import type { UploadedAsset } from './zipBuilder';

export interface GitHubAuthSession {
  token: string;
  username: string;
  avatarUrl: string;
  repoSlug: string;
  defaultBranch: string;
  lastSyncedAt?: string;
  lastMainSha?: string;
}

export interface GitHubRepoOption {
  fullName: string;
  defaultBranch: string;
  private: boolean;
}

export interface AutoPullResult {
  ok: boolean;
  repoSlug: string;
  branch: string;
  headSha: string;
  siteData?: MvrtSiteData;
  remoteAssetPaths: string[];
  message: string;
}

export interface DatedPushResult {
  ok: boolean;
  branchName: string;
  commitSha: string;
  branchUrl: string;
  prUrl: string;
  filesCommitted: number;
}

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };
}

function decodeBase64Utf8(b64: string): string {
  const clean = b64.replace(/\s+/g, '');
  const binStr = atob(clean);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Parses human-readable event date strings like:
 * - "January 9, 2027, 9:00 AM –18:00 PM" -> isoDate: "2027-01-09"
 * - "March 19-21, 2027" -> isoDate: "2027-03-19", endDate: "2027-03-21"
 */
function parseHumanEventDates(dateText: string): {
  isoDate?: string;
  endDate?: string;
} {
  const months: Record<string, number> = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12
  };
  const m = dateText.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?,?\s*(20\d{2})\b/i
  );
  if (!m) return {};
  const monthNum = months[m[1].toLowerCase()];
  const startDay = Number(m[2]);
  const endDay = m[3] ? Number(m[3]) : undefined;
  const year = Number(m[4]);
  if (!monthNum || !startDay || !year) return {};
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoDate = `${year}-${pad(monthNum)}-${pad(startDay)}`;
  const endDate = endDay
    ? `${year}-${pad(monthNum)}-${pad(endDay)}`
    : undefined;
  return { isoDate, endDate };
}

/**
 * Hydrates a single MvrtSiteData JSON object directly from raw HTML files
 * on `mvrt-115/mvrt-115.github.io` when `site-data/mvrt-site.json` isn't present yet.
 */
function parseMvrtHtmlRepoIntoJson(params: {
  indexHtml?: string;
  calendarHtml?: string;
  joinHtml?: string;
  repoSlug: string;
}): MvrtSiteData {
  const base = structuredClone(DEFAULT_MVRT_DATA);
  const parser = new DOMParser();

  if (params.indexHtml) {
    const doc = parser.parseFromString(params.indexHtml, 'text/html');

    // 1. Hero slides
    const slideImgs = Array.from(
      doc.querySelectorAll('.hero-area .splashing img.splash-img')
    )
      .map((img) => img.getAttribute('src')?.trim() || '')
      .filter(Boolean)
      .map((src) =>
        src.startsWith('http')
          ? src
          : `https://mvrt.com/${src.replace(/^\.?\//, '')}`
      );
    if (slideImgs.length > 0) {
      base.meta.heroSlides = slideImgs;
    }

    // 2. Typewriter phrases
    const typedPs = Array.from(doc.querySelectorAll('#typed-strings p'))
      .map((p) => p.textContent?.trim() || '')
      .filter(Boolean);
    if (typedPs.length > 0) {
      base.meta.typewriterPhrases = typedPs;
    }

    // 3. Upcoming Events (Team Meetings, Team Events, Demos and Outreach)
    const parsedEvents: MvrtEventItem[] = [];
    const eventColumns = Array.from(
      doc.querySelectorAll('section.feature .events')
    );
    for (const col of eventColumns) {
      const colLabel =
        col.querySelector('p')?.textContent?.trim().toLowerCase() || '';
      const category: MvrtEventItem['category'] = colLabel.includes('meeting')
        ? 'team_meeting'
        : colLabel.includes('demo') || colLabel.includes('outreach')
          ? 'demo_outreach'
          : 'team_event';

      const cards = Array.from(col.querySelectorAll('.event'));
      cards.forEach((card, idx) => {
        const title =
          card.querySelector('.big')?.textContent?.trim() || 'MVRT Event';
        const dateText =
          card.querySelector('h4')?.textContent?.trim() || '';
        const { isoDate, endDate } = parseHumanEventDates(dateText);
        parsedEvents.push({
          id: `evt-${category}-${idx}-${title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)}`,
          title,
          dateText,
          isoDate,
          endDate,
          category
        });
      });
    }
    if (parsedEvents.length > 0) {
      base.eventsConfig.items = parsedEvents;
    }

    // 4. Registration Banner Headline
    const regHeadline = doc
      .querySelector('section.third-section h2')
      ?.textContent?.trim();
    if (regHeadline) {
      base.meta.registrationHeadline = regHeadline;
      base.meta.registrationOpen = !/closed/i.test(regHeadline);
    }
  }

  if (params.calendarHtml) {
    const doc = parser.parseFromString(params.calendarHtml, 'text/html');
    const iframeSrc = doc
      .querySelector('iframe[src*="calendar.google.com"]')
      ?.getAttribute('src')
      ?.trim();
    if (iframeSrc) {
      base.meta.calendarEmbedUrl = iframeSrc;
    }
  }

  if (params.joinHtml) {
    const doc = parser.parseFromString(params.joinHtml, 'text/html');
    const formHref = doc
      .querySelector('a[href*="docs.google.com/forms"]')
      ?.getAttribute('href')
      ?.trim();
    if (formHref) {
      base.meta.interestFormUrl = formHref;
    }
  }

  return base;
}

export async function tryGetLocalGitCredential(): Promise<{
  ok: boolean;
  username?: string;
  token?: string;
}> {
  const desktop = (window as any).mvrtDesktop;
  if (desktop?.getGitCredential) {
    try {
      return await desktop.getGitCredential();
    } catch {
      // fall through
    }
  }
  try {
    const res = await fetch('/api/mvrt/git-credential');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore in standalone static mode
  }
  return { ok: false };
}

export async function fetchGitHubUserAndRepos(token: string): Promise<{
  username: string;
  avatarUrl: string;
  repos: GitHubRepoOption[];
}> {
  const headers = ghHeaders(token);
  const userRes = await fetch('https://api.github.com/user', { headers });
  if (!userRes.ok) {
    throw new Error(`GitHub authentication failed (${userRes.status})`);
  }
  const userJson = await userRes.json();

  const reposRes = await fetch(
    'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
    { headers }
  );
  const reposJson = reposRes.ok ? await reposRes.json() : [];
  const repos: GitHubRepoOption[] = Array.isArray(reposJson)
    ? reposJson.map((r: any) => ({
        fullName: r.full_name,
        defaultBranch: r.default_branch || 'main',
        private: Boolean(r.private)
      }))
    : [];

  return {
    username: userJson.login,
    avatarUrl: userJson.avatar_url || '',
    repos
  };
}

/**
 * Automatically pulls the latest `main`/`master` branch state from GitHub:
 * - Reads `site-data/mvrt-site.json` if present, OR parses the original HTML pages
 *   (`index.html`, `calendar.html`, `join.html`) into `MvrtSiteData` JSON
 * - Lists all `assets/` files present on the branch
 */
export async function autoPullFromMain(
  token: string,
  repoSlug: string
): Promise<AutoPullResult> {
  const headers = ghHeaders(token);
  const slug = repoSlug.trim();

  const repoRes = await fetch(`https://api.github.com/repos/${slug}`, {
    headers
  });
  if (!repoRes.ok) {
    throw new Error(`Cannot access repo "${slug}" (${repoRes.status})`);
  }
  const repoJson = await repoRes.json();
  const branch = repoJson.default_branch || 'main';

  const refRes = await fetch(
    `https://api.github.com/repos/${slug}/git/ref/heads/${branch}`,
    { headers }
  );
  if (!refRes.ok) {
    throw new Error(`Branch "${branch}" not found on ${slug}`);
  }
  const refJson = await refRes.json();
  const headSha: string = refJson.object.sha;

  const treeRes = await fetch(
    `https://api.github.com/repos/${slug}/git/trees/${headSha}?recursive=1`,
    { headers }
  );
  const treeJson = treeRes.ok ? await treeRes.json() : { tree: [] };
  const treeItems: Array<{ path: string; type: string; sha: string }> =
    Array.isArray(treeJson.tree) ? treeJson.tree : [];

  const remoteAssetPaths = treeItems
    .filter(
      (t) =>
        t.type === 'blob' &&
        (t.path.startsWith('assets/') ||
          t.path.startsWith('generated-site/assets/'))
    )
    .map((t) => t.path.replace(/^generated-site\//, ''));

  const readBlobText = async (filePath: string): Promise<string | undefined> => {
    const entry = treeItems.find((t) => t.path === filePath);
    if (!entry) return undefined;
    const blobRes = await fetch(
      `https://api.github.com/repos/${slug}/git/blobs/${entry.sha}`,
      { headers }
    );
    if (!blobRes.ok) return undefined;
    const blobJson = await blobRes.json();
    return blobJson.content ? decodeBase64Utf8(blobJson.content) : undefined;
  };

  // 1. Prefer unified JSON file `site-data/mvrt-site.json` if it exists
  const jsonText =
    (await readBlobText('site-data/mvrt-site.json')) ||
    (await readBlobText('generated-site/site-data/mvrt-site.json'));

  let siteData: MvrtSiteData | undefined;
  let hydratedFromHtml = false;

  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText) as MvrtSiteData;
      if (parsed?.meta && Array.isArray(parsed?.seasons)) {
        siteData = parsed;
      }
    } catch {
      // fall through to HTML parsing
    }
  }

  // 2. If no JSON file yet (e.g. original mvrt-115/mvrt-115.github.io), parse live HTML into JSON!
  if (!siteData) {
    const [indexHtml, calendarHtml, joinHtml] = await Promise.all([
      readBlobText('index.html'),
      readBlobText('calendar.html'),
      readBlobText('join.html')
    ]);
    if (indexHtml || calendarHtml || joinHtml) {
      siteData = parseMvrtHtmlRepoIntoJson({
        indexHtml,
        calendarHtml,
        joinHtml,
        repoSlug: slug
      });
      hydratedFromHtml = true;
    }
  }

  return {
    ok: true,
    repoSlug: slug,
    branch,
    headSha,
    siteData,
    remoteAssetPaths,
    message: hydratedFromHtml
      ? `Pulled ${siteData?.eventsConfig.items.length || 0} events & live content from ${slug}@${branch} into JSON!`
      : siteData
        ? `Synced site-data/mvrt-site.json from ${slug}@${branch} (${headSha.slice(0, 7)})`
        : `Connected to ${slug}@${branch} (${headSha.slice(0, 7)})`
  };
}

/**
 * Generates and pushes all static HTML/CSS/JSON + uploaded binary assets
 * directly to a dated branch (`update-YYYY-MM-DD`) off `main`/`master`.
 */
export async function pushSiteToDatedBranch(params: {
  token: string;
  repoSlug: string;
  branchName: string;
  commitMessage: string;
  staticFiles: Array<{ filename: string; content: string }>;
  uploadedAssets: UploadedAsset[];
  writeToGeneratedSubdir?: boolean;
}): Promise<DatedPushResult> {
  const {
    token,
    repoSlug,
    branchName,
    commitMessage,
    staticFiles,
    uploadedAssets,
    writeToGeneratedSubdir = false
  } = params;

  const headers = ghHeaders(token);
  const slug = repoSlug.trim();

  const repoRes = await fetch(`https://api.github.com/repos/${slug}`, {
    headers
  });
  if (!repoRes.ok) {
    throw new Error(`Cannot access repo "${slug}" (${repoRes.status})`);
  }
  const repoJson = await repoRes.json();
  const defaultBranch = repoJson.default_branch || 'main';

  const refRes = await fetch(
    `https://api.github.com/repos/${slug}/git/ref/heads/${defaultBranch}`,
    { headers }
  );
  if (!refRes.ok) {
    throw new Error(`Could not read "${defaultBranch}" branch ref`);
  }
  const refJson = await refRes.json();
  const baseSha: string = refJson.object.sha;

  const prefix = writeToGeneratedSubdir ? 'generated-site/' : '';

  const treeEntries: Array<{
    path: string;
    mode: string;
    type: string;
    content?: string;
    sha?: string;
  }> = staticFiles.map((f) => ({
    path: `${prefix}${f.filename}`,
    mode: '100644',
    type: 'blob',
    content: f.content
  }));

  for (const asset of uploadedAssets) {
    if (!asset.dataUrl || !asset.dataUrl.startsWith('data:')) continue;
    const commaIdx = asset.dataUrl.indexOf(',');
    if (commaIdx < 0) continue;
    const base64Body = asset.dataUrl.slice(commaIdx + 1);
    const blobRes = await fetch(
      `https://api.github.com/repos/${slug}/git/blobs`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: base64Body,
          encoding: 'base64'
        })
      }
    );
    if (blobRes.ok) {
      const blobJson = await blobRes.json();
      const rel = asset.path.replace(/^\/+/, '');
      treeEntries.push({
        path: `${prefix}${rel}`,
        mode: '100644',
        type: 'blob',
        sha: blobJson.sha
      });
    }
  }

  const treeRes = await fetch(`https://api.github.com/repos/${slug}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base_tree: baseSha,
      tree: treeEntries
    })
  });
  if (!treeRes.ok) {
    const errText = await treeRes.text();
    throw new Error(`Failed to create Git tree: ${errText}`);
  }
  const treeJson = await treeRes.json();

  const commitRes = await fetch(
    `https://api.github.com/repos/${slug}/git/commits`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: commitMessage,
        tree: treeJson.sha,
        parents: [baseSha]
      })
    }
  );
  if (!commitRes.ok) {
    throw new Error('Failed to create commit on GitHub');
  }
  const commitJson = await commitRes.json();

  const createRefRes = await fetch(
    `https://api.github.com/repos/${slug}/git/refs`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: commitJson.sha
      })
    }
  );
  if (!createRefRes.ok) {
    const patchRes = await fetch(
      `https://api.github.com/repos/${slug}/git/refs/heads/${branchName}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sha: commitJson.sha,
          force: true
        })
      }
    );
    if (!patchRes.ok) {
      throw new Error(`Failed to update branch "${branchName}"`);
    }
  }

  return {
    ok: true,
    branchName,
    commitSha: commitJson.sha,
    branchUrl: `https://github.com/${slug}/tree/${branchName}`,
    prUrl: `https://github.com/${slug}/compare/${defaultBranch}...${branchName}?expand=1`,
    filesCommitted: treeEntries.length
  };
}
