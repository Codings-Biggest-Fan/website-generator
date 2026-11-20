import type { MvrtSiteData } from '../types/mvrt';
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
 * Automatically pulls the latest `main` branch state from GitHub:
 * - Reads `site-data/mvrt-site.json` (or `generated-site/site-data/mvrt-site.json`)
 * - Lists any `assets/` files present on `main`
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

  // Read recursive tree to discover mvrt-site.json & assets
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

  // Prefer site-data/mvrt-site.json on default branch (main/master)
  const dataEntry =
    treeItems.find((t) => t.path === 'site-data/mvrt-site.json') ||
    treeItems.find((t) => t.path === 'generated-site/site-data/mvrt-site.json');

  let siteData: MvrtSiteData | undefined;
  if (dataEntry) {
    const blobRes = await fetch(
      `https://api.github.com/repos/${slug}/git/blobs/${dataEntry.sha}`,
      { headers }
    );
    if (blobRes.ok) {
      const blobJson = await blobRes.json();
      if (blobJson.content) {
        try {
          const decoded = decodeBase64Utf8(blobJson.content);
          const parsed = JSON.parse(decoded) as MvrtSiteData;
          if (parsed?.meta && Array.isArray(parsed?.seasons)) {
            siteData = parsed;
          }
        } catch {
          // ignore invalid JSON
        }
      }
    }
  }

  return {
    ok: true,
    repoSlug: slug,
    branch,
    headSha,
    siteData,
    remoteAssetPaths,
    message: siteData
      ? `Synced latest site data from ${slug}@${branch} (${headSha.slice(0, 7)})`
      : `Connected to ${slug}@${branch} (${headSha.slice(0, 7)}) — loaded ${remoteAssetPaths.length} assets from ${branch}`
  };
}

/**
 * Generates and pushes all static HTML/CSS/JSON + uploaded binary assets
 * directly to a dated branch (`update-YYYY-MM-DD`) off `main`.
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

  // Upload any local binary assets (images/PDFs) as base64 Git blobs
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
