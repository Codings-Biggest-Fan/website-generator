import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  Edit3,
  Eye,
  FileText,
  FolderOpen,
  GitBranch,
  RotateCcw,
  Search,
  Upload,
  X
} from 'lucide-react';
import { DEFAULT_MVRT_DATA } from '../../data/mvrtData';
import { generateAllStaticSiteFiles } from '../../services/mvrtStaticGenerator';
import {
  downloadMvrtSiteZip,
  fileToUploadedAsset,
  normalizeZipPath,
  type UploadedAsset
} from '../../services/zipBuilder';
import type { MvrtPageId, MvrtSiteData } from '../../types/mvrt';
import { type AssetPickRequest, MvrtLiveSite } from './MvrtLiveSite';
import './MvrtGeneratorApp.css';

type AppMode = 'editor' | 'preview';

const STORAGE_KEY = 'mvrt_website_generator_data_v3';

interface CatalogAssetItem {
  path: string;
  displayUrl: string;
  name: string;
  folder: string;
  isPdf: boolean;
  isLocal: boolean;
}

function collectKnownSiteAssets(data: MvrtSiteData): string[] {
  const urls = new Set<string>();
  data.meta.heroSlides.forEach((u) => urls.add(u));
  if (data.glanceStats.teamPhotoUrl) urls.add(data.glanceStats.teamPhotoUrl);
  data.seasons.forEach((s) => {
    if (s.robotImage) urls.add(s.robotImage);
    if (s.teamImage) urls.add(s.teamImage);
    if (s.technicalBinderUrl) urls.add(s.technicalBinderUrl);
  });
  data.leadership.forEach((l) => {
    if (l.imageUrl) urls.add(l.imageUrl);
  });
  data.outreach.forEach((o) => {
    if (o.imageUrl) urls.add(o.imageUrl);
    if (o.partnerLogoUrl) urls.add(o.partnerLogoUrl);
  });
  data.resources.forEach((r) => {
    r.items.forEach((i) => {
      if (i.thumbnailUrl) urls.add(i.thumbnailUrl);
    });
  });
  data.sponsorsPage.sponsors.forEach((sp) => {
    if (sp.logoUrl) urls.add(sp.logoUrl);
  });
  if (data.sponsorsPage.grantImpactReportUrl) {
    urls.add(data.sponsorsPage.grantImpactReportUrl);
  }
  if (data.sponsorsPage.sponsorPacketUrl) {
    urls.add(data.sponsorsPage.sponsorPacketUrl);
  }
  data.newsletters.forEach((nl) => {
    if (nl.thumbnailUrl) urls.add(nl.thumbnailUrl);
    if (nl.pdfUrl) urls.add(nl.pdfUrl);
  });
  return Array.from(urls);
}

function classifyAssetFolder(relPath: string, isLocal: boolean): string {
  const lower = relPath.toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDFs';
  if (isLocal) return 'Local Folder';
  if (lower.includes('officers/')) return 'Officers';
  if (lower.includes('robot')) return 'Robots';
  if (lower.includes('team/')) return 'Team';
  if (lower.includes('programs/')) return 'Outreach';
  if (lower.includes('resources/')) return 'Resources';
  if (lower.includes('logos/')) return 'Sponsors';
  if (lower.includes('newsletters/')) return 'Newsletters';
  return 'Other';
}

export const MvrtGeneratorApp: React.FC = () => {
  const [siteData, setSiteData] = useState<MvrtSiteData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as MvrtSiteData;
        if (parsed?.meta && Array.isArray(parsed?.seasons)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_MVRT_DATA;
  });

  // Only 2 Modes: Editor | Preview
  const [mode, setMode] = useState<AppMode>('editor');
  const [activePage, setActivePage] = useState<MvrtPageId>('home');
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // On-Screen Asset Picker Modal State
  const [assetPickReq, setAssetPickReq] = useState<AssetPickRequest | null>(
    null
  );
  const [assetFilterTab, setAssetFilterTab] = useState<string>('All');
  const [assetSearch, setAssetSearch] = useState<string>('');

  // GitHub Push to Dated Branch Modal State
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [gitBranchName, setGitBranchName] = useState(`update-${todayStr}`);
  const [gitCommitMsg, setGitCommitMsg] = useState(
    `Update MVRT website (${todayStr})`
  );
  const [gitPushMode, setGitPushMode] = useState<'local' | 'token'>('local');
  const [localRepoPath, setLocalRepoPath] = useState('');
  const [ghRepoSlug, setGhRepoSlug] = useState('mvrt115/mvrt.com');
  const [ghToken, setGhToken] = useState('');
  const [gitBusy, setGitBusy] = useState(false);
  const [gitLogs, setGitLogs] = useState<string[]>([]);

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const singleFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(siteData));
    } catch {
      // ignore quota warnings
    }
  }, [siteData]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 3200);
  };

  const generatedFiles = useMemo(
    () => generateAllStaticSiteFiles(siteData),
    [siteData]
  );

  // Handle selecting a local folder (`assets/` or project root)
  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const loaded: UploadedAsset[] = [];
    let detectedFolder = '';

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const rel =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name;
      if (!detectedFolder && rel.includes('/')) {
        detectedFolder = rel.split('/')[0];
      }

      // If the user selected a folder containing mvrt-site.json, load it too!
      if (file.name === 'mvrt-site.json') {
        try {
          const text = await file.text();
          const parsed = JSON.parse(text) as MvrtSiteData;
          if (parsed?.meta && Array.isArray(parsed?.seasons)) {
            setSiteData(parsed);
          }
        } catch {
          // ignore
        }
        continue;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (
        ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'pdf'].includes(ext)
      ) {
        const asset = await fileToUploadedAsset(file);
        loaded.push(asset);
      }
    }

    if (loaded.length > 0) {
      setUploadedAssets((prev) => {
        const map = new Map<string, UploadedAsset>();
        prev.forEach((a) => map.set(a.path, a));
        loaded.forEach((a) => map.set(a.path, a));
        return Array.from(map.values());
      });
      setSelectedFolderName(detectedFolder || 'assets');
      showToast(
        `Loaded ${loaded.length} files from "${detectedFolder || 'assets'}" folder!`
      );
    }
    e.target.value = '';
  };

  // Handle uploading an individual image/PDF inside the Assets Picker Modal
  const handleSingleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const hint = assetPickReq?.folderHint || 'images';
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const targetSub = isPdf
      ? `assets/${hint === 'newsletters' ? 'newsletters' : 'files'}/${file.name}`
      : `assets/images/${hint}/${file.name}`;
    const asset = await fileToUploadedAsset(file, normalizeZipPath(targetSub));
    setUploadedAssets((prev) => [
      asset,
      ...prev.filter((a) => a.path !== asset.path)
    ]);
    if (assetPickReq) {
      assetPickReq.onSelect(asset.path);
      setAssetPickReq(null);
    }
    showToast(`Added ${asset.name} to ${asset.path}`);
    e.target.value = '';
  };

  // Build combined catalog of local folder files + existing mvrt.com assets
  const catalogAssets = useMemo<CatalogAssetItem[]>(() => {
    const items: CatalogAssetItem[] = [];
    const seen = new Set<string>();

    // 1. Local uploaded folder files first
    for (const loc of uploadedAssets) {
      const cleanPath = loc.path.replace(/\\/g, '/');
      seen.add(cleanPath.toLowerCase());
      const isPdf = cleanPath.toLowerCase().endsWith('.pdf');
      items.push({
        path: cleanPath,
        displayUrl: loc.dataUrl,
        name: loc.name,
        folder: classifyAssetFolder(cleanPath, true),
        isPdf,
        isLocal: true
      });
    }

    // 2. Existing mvrt.com site assets
    const base = (siteData.meta.baseAssetUrl || 'https://mvrt.com').replace(
      /\/$/,
      ''
    );
    for (const rawUrl of collectKnownSiteAssets(siteData)) {
      const rel = rawUrl
        .replace(/^https?:\/\/mvrt\.com\//i, '')
        .replace(/^\.?\//, '');
      if (seen.has(rel.toLowerCase())) continue;
      seen.add(rel.toLowerCase());
      const isPdf = rel.toLowerCase().endsWith('.pdf');
      const name = decodeURIComponent(rel.split('/').pop() || rel);
      items.push({
        path: rel,
        displayUrl: rawUrl.startsWith('http') ? rawUrl : `${base}/${rel}`,
        name,
        folder: classifyAssetFolder(rel, false),
        isPdf,
        isLocal: false
      });
    }

    return items;
  }, [uploadedAssets, siteData]);

  const filteredCatalogAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    return catalogAssets.filter((item) => {
      if (assetPickReq?.accept === 'image' && item.isPdf) return false;
      if (assetPickReq?.accept === 'pdf' && !item.isPdf) return false;
      if (assetFilterTab !== 'All' && item.folder !== assetFilterTab) {
        return false;
      }
      if (
        q &&
        !item.name.toLowerCase().includes(q) &&
        !item.path.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [catalogAssets, assetPickReq, assetFilterTab, assetSearch]);

  const handleExportZip = async () => {
    await downloadMvrtSiteZip(
      generatedFiles,
      uploadedAssets,
      'mvrt-website.zip'
    );
    showToast(
      `Exported mvrt-website.zip (${generatedFiles.length} pages + ${uploadedAssets.length} local assets)!`
    );
  };

  // Push to Dated GitHub Branch (Local Git Repo or GitHub REST API)
  const handleGithubPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setGitBusy(true);
    setGitLogs([]);

    try {
      if (gitPushMode === 'local') {
        const resp = await fetch('/api/mvrt/git-push-dated', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchName: gitBranchName,
            commitMessage: gitCommitMsg,
            repoPath: localRepoPath.trim() || undefined,
            staticFiles: generatedFiles.map((f) => ({
              filename: f.filename,
              content: f.content
            })),
            uploadedAssets: uploadedAssets.map((a) => ({
              path: a.path,
              dataUrl: a.dataUrl
            }))
          })
        });
        const result = await resp.json();
        if (!result.ok) {
          throw new Error(result.error || 'Git push failed');
        }
        setGitLogs(result.logs || [`Committed to branch ${result.branchName}`]);
        showToast(`Committed to dated branch "${result.branchName}"!`);
      } else {
        // Direct GitHub REST API dated branch push
        if (!ghToken.trim() || !ghRepoSlug.includes('/')) {
          throw new Error(
            'Enter a valid repository (e.g. mvrt115/mvrt.com) and GitHub Personal Access Token.'
          );
        }
        const slug = ghRepoSlug.trim();
        const headers = {
          Authorization: `Bearer ${ghToken.trim()}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        };

        const repoRes = await fetch(`https://api.github.com/repos/${slug}`, {
          headers
        });
        if (!repoRes.ok) {
          throw new Error(`GitHub repo check failed (${repoRes.status})`);
        }
        const repoJson = await repoRes.json();
        const defaultBranch = repoJson.default_branch || 'main';

        const refRes = await fetch(
          `https://api.github.com/repos/${slug}/git/ref/heads/${defaultBranch}`,
          { headers }
        );
        if (!refRes.ok) {
          throw new Error(`Could not read ${defaultBranch} branch ref`);
        }
        const refJson = await refRes.json();
        const baseSha = refJson.object.sha;

        // Create blobs & tree entries for generated HTML/CSS/JSON files
        const treeEntries = generatedFiles.map((f) => ({
          path: f.filename,
          mode: '100644',
          type: 'blob',
          content: f.content
        }));

        const treeRes = await fetch(
          `https://api.github.com/repos/${slug}/git/trees`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              base_tree: baseSha,
              tree: treeEntries
            })
          }
        );
        if (!treeRes.ok) {
          throw new Error('Failed to create Git tree on GitHub');
        }
        const treeJson = await treeRes.json();

        const commitRes = await fetch(
          `https://api.github.com/repos/${slug}/git/commits`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              message: gitCommitMsg,
              tree: treeJson.sha,
              parents: [baseSha]
            })
          }
        );
        if (!commitRes.ok) {
          throw new Error('Failed to create commit on GitHub');
        }
        const commitJson = await commitRes.json();

        // Create or update dated branch ref
        const createRefRes = await fetch(
          `https://api.github.com/repos/${slug}/git/refs`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              ref: `refs/heads/${gitBranchName}`,
              sha: commitJson.sha
            })
          }
        );
        if (!createRefRes.ok) {
          await fetch(
            `https://api.github.com/repos/${slug}/git/refs/heads/${gitBranchName}`,
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify({
                sha: commitJson.sha,
                force: true
              })
            }
          );
        }

        setGitLogs([
          `Pushed ${generatedFiles.length} generated files directly to GitHub!`,
          `Repository: https://github.com/${slug}/tree/${gitBranchName}`,
          `Open PR: https://github.com/${slug}/compare/${gitBranchName}?expand=1`
        ]);
        showToast(`Pushed to GitHub branch "${gitBranchName}"!`);
      }
    } catch (err: any) {
      setGitLogs([`Error: ${err?.message || String(err)}`]);
    } finally {
      setGitBusy(false);
    }
  };

  return (
    <div className="mvrt-app-window">
      {/* Hidden Folder & File Pickers */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is standard for folder selection
        webkitdirectory=""
        directory=""
        style={{ display: 'none' }}
        onChange={handleFolderSelect}
      />
      <input
        ref={singleFileInputRef}
        type="file"
        accept="image/*,.pdf"
        style={{ display: 'none' }}
        onChange={handleSingleFileUpload}
      />

      {/* ==================== MINIMAL TOP BAR (Only 2 Modes: Editor | Preview) ==================== */}
      <header className="mvrt-minimal-topbar">
        {/* Left: Editor | Preview Switch */}
        <div className="mvrt-topbar-group">
          <div className="mvrt-two-mode-switch" role="tablist">
            <button
              type="button"
              className={`mvrt-two-mode-btn ${
                mode === 'editor' ? 'active' : ''
              }`}
              onClick={() => setMode('editor')}
            >
              <Edit3 size={13} />
              <span>Editor</span>
            </button>
            <button
              type="button"
              className={`mvrt-two-mode-btn ${
                mode === 'preview' ? 'active' : ''
              }`}
              onClick={() => setMode('preview')}
            >
              <Eye size={13} />
              <span>Preview</span>
            </button>
          </div>
        </div>

        {/* Center: Select Folder & Toast */}
        <div className="mvrt-topbar-group">
          <button
            type="button"
            className="mvrt-top-btn"
            onClick={() => folderInputRef.current?.click()}
            title="Select your local assets/ or project folder"
          >
            <FolderOpen size={13} color="#a78bfa" />
            <span>
              {selectedFolderName
                ? `${selectedFolderName}/ (${uploadedAssets.length} local files)`
                : 'Select Assets Folder'}
            </span>
          </button>

          {toastMsg && (
            <span className="mvrt-toast-pill">
              <Check size={12} />
              <span>{toastMsg}</span>
            </span>
          )}
        </div>

        {/* Right: Export .ZIP + Push to GitHub + Reset */}
        <div className="mvrt-topbar-group">
          <button
            type="button"
            className="mvrt-top-btn primary"
            onClick={handleExportZip}
            title="Download full static website as mvrt-website.zip"
          >
            <Download size={13} />
            <span>Export .ZIP</span>
          </button>

          <button
            type="button"
            className="mvrt-top-btn github"
            onClick={() => setShowGithubModal(true)}
            title="Push generated site to a dated GitHub branch"
          >
            <GitBranch size={13} color="#34d399" />
            <span>Push to GitHub</span>
          </button>

          <button
            type="button"
            className="mvrt-top-btn"
            onClick={() => {
              setSiteData(DEFAULT_MVRT_DATA);
              showToast('Reset to original mvrt.com content');
            }}
            title="Reset to default mvrt.com content"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </header>

      {/* ==================== FULL-SCREEN WEBSITE CANVAS (NO SIDEBARS) ==================== */}
      <div className="mvrt-fullscreen-canvas">
        <MvrtLiveSite
          data={siteData}
          activePage={activePage}
          onNavigatePage={(p) => setActivePage(p)}
          showEditOverlays={mode === 'editor'}
          onUpdateData={(updater) => setSiteData((prev) => updater(prev))}
          onRequestAssetPick={(req) => {
            setAssetPickReq(req);
            setAssetFilterTab(
              req.accept === 'pdf'
                ? 'PDFs'
                : uploadedAssets.length > 0
                  ? 'Local Folder'
                  : 'All'
            );
            setAssetSearch('');
          }}
          uploadedAssets={uploadedAssets}
        />
      </div>

      {/* ==================== ON-SCREEN ASSETS FOLDER PICKER MODAL ==================== */}
      {assetPickReq && (
        <div
          className="mvrt-modal-backdrop"
          onClick={() => setAssetPickReq(null)}
        >
          <div
            className="mvrt-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mvrt-modal-header">
              <div>
                <h3>Select from Assets Folder — {assetPickReq.label}</h3>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="mvrt-top-btn"
                  onClick={() => folderInputRef.current?.click()}
                >
                  <FolderOpen size={13} />
                  <span>Select Folder</span>
                </button>
                <button
                  type="button"
                  className="mvrt-top-btn primary"
                  onClick={() => singleFileInputRef.current?.click()}
                >
                  <Upload size={13} />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  className="mvrt-top-btn"
                  onClick={() => setAssetPickReq(null)}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="mvrt-modal-toolbar">
              <div className="mvrt-folder-tabs">
                {(
                  [
                    'All',
                    'Local Folder',
                    'Officers',
                    'Robots',
                    'Team',
                    'Outreach',
                    'Resources',
                    'Sponsors',
                    'Newsletters',
                    'PDFs'
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`mvrt-folder-tab ${
                      assetFilterTab === tab ? 'active' : ''
                    }`}
                    onClick={() => setAssetFilterTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#18181c',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 7,
                  padding: '4px 10px'
                }}
              >
                <Search size={13} color="#a1a1aa" />
                <input
                  type="text"
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Search filename..."
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    outline: 'none',
                    fontSize: 12
                  }}
                />
              </div>
            </div>

            <div className="mvrt-asset-grid">
              {filteredCatalogAssets.map((item) => {
                const isSelected =
                  assetPickReq.currentUrl.endsWith(item.path) ||
                  assetPickReq.currentUrl === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`mvrt-asset-tile ${
                      isSelected ? 'selected' : ''
                    }`}
                    onClick={() => {
                      assetPickReq.onSelect(item.path);
                      setAssetPickReq(null);
                      showToast(`Selected ${item.name}`);
                    }}
                  >
                    <div className="mvrt-asset-thumb">
                      {item.isPdf ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            color: '#a78bfa'
                          }}
                        >
                          <FileText size={28} />
                          <span style={{ fontSize: 10, fontWeight: 700 }}>
                            PDF
                          </span>
                        </div>
                      ) : (
                        <img
                          src={item.displayUrl}
                          alt={item.name}
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="mvrt-asset-meta">
                      <div style={{ fontWeight: 700, color: '#fff' }}>
                        {item.name}
                      </div>
                      <div style={{ color: '#a1a1aa', fontSize: 10 }}>
                        {item.folder}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== GITHUB PUSH TO DATED BRANCH MODAL ==================== */}
      {showGithubModal && (
        <div
          className="mvrt-modal-backdrop"
          onClick={() => setShowGithubModal(false)}
        >
          <div
            className="mvrt-modal-card compact"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mvrt-modal-header">
              <h3>Push Website to Dated GitHub Branch</h3>
              <button
                type="button"
                className="mvrt-top-btn"
                onClick={() => setShowGithubModal(false)}
              >
                <X size={14} />
              </button>
            </div>

            <form className="mvrt-modal-body" onSubmit={handleGithubPush}>
              <div className="mvrt-two-mode-switch" style={{ width: '100%' }}>
                <button
                  type="button"
                  style={{ flex: 1, justifyContent: 'center' }}
                  className={`mvrt-two-mode-btn ${
                    gitPushMode === 'local' ? 'active' : ''
                  }`}
                  onClick={() => setGitPushMode('local')}
                >
                  Local Git Folder Push
                </button>
                <button
                  type="button"
                  style={{ flex: 1, justifyContent: 'center' }}
                  className={`mvrt-two-mode-btn ${
                    gitPushMode === 'token' ? 'active' : ''
                  }`}
                  onClick={() => setGitPushMode('token')}
                >
                  GitHub Token API Push
                </button>
              </div>

              <div className="mvrt-form-field">
                <label>Dated Branch Name</label>
                <input
                  className="mvrt-form-input"
                  value={gitBranchName}
                  onChange={(e) => setGitBranchName(e.target.value)}
                  required
                />
              </div>

              <div className="mvrt-form-field">
                <label>Commit Message</label>
                <input
                  className="mvrt-form-input"
                  value={gitCommitMsg}
                  onChange={(e) => setGitCommitMsg(e.target.value)}
                  required
                />
              </div>

              {gitPushMode === 'local' ? (
                <div className="mvrt-form-field">
                  <label>
                    Local Git Repo Folder Path (leave blank for current project)
                  </label>
                  <input
                    className="mvrt-form-input"
                    value={localRepoPath}
                    onChange={(e) => setLocalRepoPath(e.target.value)}
                    placeholder="e.g. C:\Users\asharma\Desktop\mvrt.com"
                  />
                </div>
              ) : (
                <>
                  <div className="mvrt-form-field">
                    <label>GitHub Repository (owner/repo)</label>
                    <input
                      className="mvrt-form-input"
                      value={ghRepoSlug}
                      onChange={(e) => setGhRepoSlug(e.target.value)}
                      placeholder="mvrt115/mvrt.com"
                    />
                  </div>
                  <div className="mvrt-form-field">
                    <label>GitHub Personal Access Token</label>
                    <input
                      type="password"
                      className="mvrt-form-input"
                      value={ghToken}
                      onChange={(e) => setGhToken(e.target.value)}
                      placeholder="ghp_..."
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={gitBusy}
                className="mvrt-top-btn github"
                style={{
                  justifyContent: 'center',
                  padding: '10px 16px',
                  fontSize: 13
                }}
              >
                <GitBranch size={14} />
                <span>
                  {gitBusy
                    ? 'Pushing to Dated Branch...'
                    : `Commit & Push to "${gitBranchName}"`}
                </span>
              </button>

              {gitLogs.length > 0 && (
                <div
                  style={{
                    background: '#09090b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 12,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: '#6ee7b7',
                    lineHeight: 1.5
                  }}
                >
                  {gitLogs.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
