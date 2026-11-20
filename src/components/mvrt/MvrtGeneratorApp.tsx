import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  GitBranch,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { DEFAULT_MVRT_DATA } from '../../data/mvrtData';
import {
  type AiSettings,
  type MaintainerTask,
  runAiCommand
} from '../../services/aiAssistant';
import {
  autoPullFromMain,
  fetchGitHubUserAndRepos,
  type GitHubAuthSession,
  type GitHubRepoOption,
  pushSiteToDatedBranch,
  tryGetLocalGitCredential
} from '../../services/githubSync';
import { generateAllStaticSiteFiles } from '../../services/mvrtStaticGenerator';
import {
  buildMvrtSiteZip,
  downloadMvrtSiteZip,
  fileToUploadedAsset,
  normalizeZipPath,
  type UploadedAsset
} from '../../services/zipBuilder';
import type { MvrtPageId, MvrtSiteData } from '../../types/mvrt';
import { type AssetPickRequest, MvrtLiveSite } from './MvrtLiveSite';
import './MvrtGeneratorApp.css';

type AppMode = 'editor' | 'preview';

const STORAGE_KEY = 'mvrt_website_generator_data_v4';
const GH_SESSION_KEY = 'mvrt_github_session_v1';
const TASKS_KEY = 'mvrt_maintainer_tasks_v1';
const AI_SETTINGS_KEY = 'mvrt_ai_settings_v1';

interface CatalogAssetItem {
  path: string;
  displayUrl: string;
  name: string;
  folder: string;
  isPdf: boolean;
  isLocal: boolean;
}

interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  badges?: string[];
}

function collectKnownSiteAssets(
  data: MvrtSiteData,
  remoteAssets: string[]
): string[] {
  const urls = new Set<string>(remoteAssets);
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
  const [remoteAssetPaths, setRemoteAssetPaths] = useState<string[]>([]);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // On-Screen Asset Picker Modal State
  const [assetPickReq, setAssetPickReq] = useState<AssetPickRequest | null>(
    null
  );
  const [assetFilterTab, setAssetFilterTab] = useState<string>('All');
  const [assetSearch, setAssetSearch] = useState<string>('');

  // GitHub Login & Auto-Sync State
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [ghSession, setGhSession] = useState<GitHubAuthSession | null>(() => {
    try {
      const raw = localStorage.getItem(GH_SESSION_KEY);
      return raw ? (JSON.parse(raw) as GitHubAuthSession) : null;
    } catch {
      return null;
    }
  });
  const [ghRepos, setGhRepos] = useState<GitHubRepoOption[]>([]);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [ghTokenInput, setGhTokenInput] = useState('');
  const [ghBranchName, setGhBranchName] = useState(`update-${todayStr}`);
  const [ghCommitMsg, setGhCommitMsg] = useState(
    `Update MVRT website (${todayStr})`
  );
  const [ghBusy, setGhBusy] = useState(false);
  const [ghSyncing, setGhSyncing] = useState(false);
  const [ghResult, setGhResult] = useState<{
    message: string;
    prUrl?: string;
    branchUrl?: string;
    isError?: boolean;
  } | null>(null);

  // AI Assistant & Tasks State
  const [showAiPopover, setShowAiPopover] = useState(false);
  const [aiTab, setAiTab] = useState<'chat' | 'tasks' | 'settings'>('chat');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => {
    try {
      const raw = localStorage.getItem(AI_SETTINGS_KEY);
      return raw
        ? (JSON.parse(raw) as AiSettings)
        : { provider: 'builtin', apiKey: '' };
    } catch {
      return { provider: 'builtin', apiKey: '' };
    }
  });
  const [tasks, setTasks] = useState<MaintainerTask[]>(() => {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      return raw
        ? (JSON.parse(raw) as MaintainerTask[])
        : [
            {
              id: 't-1',
              text: 'Add Kickoff & competition dates to Calendar',
              done: false,
              createdAt: 'Default'
            }
          ];
    } catch {
      return [];
    }
  });
  const [newTaskText, setNewTaskText] = useState('');
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi! Tell me what to change on mvrt.com or add a task — e.g. "Add event Workshop on 2027-02-14 at 10am", "Close registration", or "Add task update 2027 robot photo".'
    }
  ]);

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const singleFileInputRef = useRef<HTMLInputElement | null>(null);
  const hasAutoPulledOnMount = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(siteData));
    } catch {
      // ignore quota warnings
    }
  }, [siteData]);

  useEffect(() => {
    try {
      if (ghSession) {
        localStorage.setItem(GH_SESSION_KEY, JSON.stringify(ghSession));
      } else {
        localStorage.removeItem(GH_SESSION_KEY);
      }
    } catch {
      // ignore
    }
  }, [ghSession]);

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(aiSettings));
    } catch {
      // ignore
    }
  }, [aiSettings]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 3400);
  };

  const generatedFiles = useMemo(
    () => generateAllStaticSiteFiles(siteData),
    [siteData]
  );

  // Auto-pull latest `main` when opening app if already logged into GitHub
  useEffect(() => {
    if (ghSession && !hasAutoPulledOnMount.current) {
      hasAutoPulledOnMount.current = true;
      void handleAutoPullFromMain(ghSession.token, ghSession.repoSlug, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAutoPullFromMain = async (
    token: string,
    repoSlug: string,
    silent = false
  ) => {
    setGhSyncing(true);
    try {
      const pullRes = await autoPullFromMain(token, repoSlug);
      if (pullRes.siteData) {
        setSiteData(pullRes.siteData);
      }
      if (pullRes.remoteAssetPaths.length > 0) {
        setRemoteAssetPaths(pullRes.remoteAssetPaths);
      }
      setGhSession((prev) =>
        prev
          ? {
              ...prev,
              repoSlug: pullRes.repoSlug,
              defaultBranch: pullRes.branch,
              lastMainSha: pullRes.headSha,
              lastSyncedAt: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })
            }
          : prev
      );
      if (!silent) {
        showToast(pullRes.message);
      }
      setGhResult({ message: pullRes.message });
    } catch (err: any) {
      if (!silent) {
        setGhResult({
          message: err?.message || 'Failed to sync from main',
          isError: true
        });
      }
    } finally {
      setGhSyncing(false);
    }
  };

  const completeGitHubLogin = async (token: string, preferredRepo?: string) => {
    setGhBusy(true);
    setGhResult(null);
    try {
      const { username, avatarUrl, repos } =
        await fetchGitHubUserAndRepos(token);
      setGhRepos(repos);

      const defaultRepo =
        preferredRepo ||
        repos.find((r) => /mvrt\.com/i.test(r.fullName))?.fullName ||
        repos.find((r) => /website-generator/i.test(r.fullName))?.fullName ||
        repos[0]?.fullName ||
        `${username}/website-generator`;

      const session: GitHubAuthSession = {
        token: token.trim(),
        username,
        avatarUrl,
        repoSlug: defaultRepo,
        defaultBranch: 'main'
      };
      setGhSession(session);

      // Automatically pull latest `main` right after login!
      await handleAutoPullFromMain(session.token, defaultRepo, false);
      showToast(`Signed in as @${username} & synced main!`);
    } catch (err: any) {
      setGhResult({
        message: err?.message || 'GitHub login failed',
        isError: true
      });
    } finally {
      setGhBusy(false);
    }
  };

  const handleUseLocalGitSignIn = async () => {
    setGhBusy(true);
    setGhResult(null);
    try {
      const cred = await tryGetLocalGitCredential();
      if (!cred.ok || !cred.token) {
        setGhResult({
          message:
            'No saved local GitHub credential found. Paste a GitHub Personal Access Token (repo scope) below once.',
          isError: true
        });
        setGhBusy(false);
        return;
      }
      await completeGitHubLogin(cred.token);
    } catch (err: any) {
      setGhResult({
        message: err?.message || 'Local Git sign-in failed',
        isError: true
      });
      setGhBusy(false);
    }
  };

  const handlePushToDatedBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghSession) return;
    setGhBusy(true);
    setGhResult(null);
    try {
      const res = await pushSiteToDatedBranch({
        token: ghSession.token,
        repoSlug: ghSession.repoSlug,
        branchName: ghBranchName.trim() || `update-${todayStr}`,
        commitMessage:
          ghCommitMsg.trim() || `Update MVRT website (${todayStr})`,
        staticFiles: generatedFiles.map((f) => ({
          filename: f.filename,
          content: f.content
        })),
        uploadedAssets,
        writeToGeneratedSubdir: /website-generator$/i.test(ghSession.repoSlug)
      });
      setGhResult({
        message: `Pushed ${res.filesCommitted} files to branch "${res.branchName}"!`,
        branchUrl: res.branchUrl,
        prUrl: res.prUrl
      });
      showToast(`Pushed to ${res.branchName}!`);
    } catch (err: any) {
      setGhResult({
        message: err?.message || 'GitHub push failed',
        isError: true
      });
    } finally {
      setGhBusy(false);
    }
  };

  // Native Electron folder picker OR browser webkitdirectory fallback
  const handleSelectAssetsFolder = async () => {
    const desktop = (window as any).mvrtDesktop;
    if (desktop?.pickFolder) {
      const res = await desktop.pickFolder();
      if (!res.canceled && Array.isArray(res.files) && res.files.length > 0) {
        setUploadedAssets((prev) => {
          const map = new Map<string, UploadedAsset>();
          prev.forEach((a) => map.set(a.path, a));
          res.files.forEach((a: UploadedAsset) => map.set(a.path, a));
          return Array.from(map.values());
        });
        setSelectedFolderName(res.folderName || 'assets');
        showToast(
          `Loaded ${res.files.length} files from "${res.folderName}"!`
        );
      }
      return;
    }
    folderInputRef.current?.click();
  };

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

  const catalogAssets = useMemo<CatalogAssetItem[]>(() => {
    const items: CatalogAssetItem[] = [];
    const seen = new Set<string>();

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

    const base = (siteData.meta.baseAssetUrl || 'https://mvrt.com').replace(
      /\/$/,
      ''
    );
    for (const rawUrl of collectKnownSiteAssets(siteData, remoteAssetPaths)) {
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
  }, [uploadedAssets, siteData, remoteAssetPaths]);

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
    const desktop = (window as any).mvrtDesktop;
    if (desktop?.saveZip) {
      const blob = await buildMvrtSiteZip(generatedFiles, uploadedAssets);
      const buf = new Uint8Array(await blob.arrayBuffer());
      const res = await desktop.saveZip(Array.from(buf), 'mvrt-website.zip');
      if (!res.canceled) {
        showToast(`Saved ${res.filePath}!`);
      }
      return;
    }
    await downloadMvrtSiteZip(
      generatedFiles,
      uploadedAssets,
      'mvrt-website.zip'
    );
    showToast(
      `Exported mvrt-website.zip (${generatedFiles.length} pages + ${uploadedAssets.length} local assets)!`
    );
  };

  const executeAiPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || aiBusy) return;

    setAiMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: trimmed }
    ]);
    setAiPrompt('');
    setAiBusy(true);

    try {
      const res = await runAiCommand({
        prompt: trimmed,
        siteData,
        tasks,
        settings: aiSettings
      });
      if (res.nextData) setSiteData(res.nextData);
      if (res.nextTasks) setTasks(res.nextTasks);
      if (res.navigateTo) setActivePage(res.navigateTo);

      setAiMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: res.reply,
          badges: res.appliedActions
        }
      ]);
      if (res.appliedActions.length > 0) {
        showToast(res.appliedActions[0]);
      }
    } catch (err: any) {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: `Error: ${err?.message || 'Could not run AI command'}`
        }
      ]);
    } finally {
      setAiBusy(false);
    }
  };

  const pendingTaskCount = tasks.filter((t) => !t.done).length;

  return (
    <div className="mvrt-app-window">
      {/* Hidden Browser Folder & File Pickers */}
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

          <button
            type="button"
            className="mvrt-top-btn"
            onClick={handleSelectAssetsFolder}
            title="Select your local assets/ or project folder"
          >
            <FolderOpen size={13} color="#a78bfa" />
            <span>
              {selectedFolderName
                ? `${selectedFolderName}/ (${uploadedAssets.length})`
                : 'Assets Folder'}
            </span>
          </button>
        </div>

        {/* Center: Status Toast */}
        <div className="mvrt-topbar-group">
          {toastMsg && (
            <span className="mvrt-toast-pill">
              <Check size={12} />
              <span>{toastMsg}</span>
            </span>
          )}
        </div>

        {/* Right: AI Assistant + GitHub Login/Auto-Sync + Export .ZIP + Reset */}
        <div className="mvrt-topbar-group">
          <button
            type="button"
            className={`mvrt-top-btn ${showAiPopover ? 'primary' : ''}`}
            onClick={() => setShowAiPopover((v) => !v)}
            title="Open AI Assistant & Tasks"
          >
            <Sparkles size={13} color="#c4b5fd" />
            <span>AI{pendingTaskCount > 0 ? ` (${pendingTaskCount})` : ''}</span>
          </button>

          {ghSession ? (
            <>
              <button
                type="button"
                className="mvrt-top-btn"
                disabled={ghSyncing}
                onClick={() =>
                  handleAutoPullFromMain(ghSession.token, ghSession.repoSlug)
                }
                title={`Pull latest from ${ghSession.repoSlug}@${ghSession.defaultBranch}`}
              >
                <RefreshCw
                  size={12}
                  className={ghSyncing ? 'animate-spin' : ''}
                  color="#34d399"
                />
                <span>{ghSyncing ? 'Syncing...' : 'Sync main'}</span>
              </button>

              <button
                type="button"
                className="mvrt-gh-pill"
                onClick={() => setShowGithubModal(true)}
                title="GitHub Sync & Push to Dated Branch"
              >
                {ghSession.avatarUrl && (
                  <img
                    src={ghSession.avatarUrl}
                    alt={ghSession.username}
                    className="mvrt-gh-avatar"
                  />
                )}
                <span>@{ghSession.username}</span>
                <GitBranch size={12} color="#34d399" />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="mvrt-top-btn github"
              onClick={() => setShowGithubModal(true)}
            >
              <GitBranch size={13} color="#34d399" />
              <span>GitHub Login</span>
            </button>
          )}

          <button
            type="button"
            className="mvrt-top-btn primary"
            onClick={handleExportZip}
            title="Export mvrt-website.zip"
          >
            <Download size={13} />
            <span>Export .ZIP</span>
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

      {/* ==================== FLOATING AI ASSISTANT & TASKS POPOVER ==================== */}
      {showAiPopover && (
        <div className="mvrt-ai-popover">
          <div className="mvrt-ai-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={15} color="#a78bfa" />
              <strong style={{ fontSize: 13 }}>MVRT AI Assistant</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div className="mvrt-two-mode-switch">
                <button
                  type="button"
                  className={`mvrt-two-mode-btn ${
                    aiTab === 'chat' ? 'active' : ''
                  }`}
                  style={{ padding: '3px 9px', fontSize: 11.5 }}
                  onClick={() => setAiTab('chat')}
                >
                  Chat
                </button>
                <button
                  type="button"
                  className={`mvrt-two-mode-btn ${
                    aiTab === 'tasks' ? 'active' : ''
                  }`}
                  style={{ padding: '3px 9px', fontSize: 11.5 }}
                  onClick={() => setAiTab('tasks')}
                >
                  Tasks ({pendingTaskCount})
                </button>
              </div>
              <button
                type="button"
                className="mvrt-top-btn"
                style={{ padding: '4px 7px' }}
                onClick={() =>
                  setAiTab((t) => (t === 'settings' ? 'chat' : 'settings'))
                }
                title="AI Provider Settings"
              >
                <Settings size={13} />
              </button>
              <button
                type="button"
                className="mvrt-top-btn"
                style={{ padding: '4px 7px' }}
                onClick={() => setShowAiPopover(false)}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {aiTab === 'chat' && (
            <>
              <div className="mvrt-ai-messages">
                {aiMessages.map((msg) => (
                  <div key={msg.id} className={`mvrt-ai-msg ${msg.role}`}>
                    <div>{msg.text}</div>
                    {msg.badges && msg.badges.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 4,
                          marginTop: 6
                        }}
                      >
                        {msg.badges.map((b, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: 10.5,
                              background: 'rgba(16, 185, 129, 0.18)',
                              color: '#6ee7b7',
                              padding: '2px 7px',
                              borderRadius: 999,
                              fontWeight: 600
                            }}
                          >
                            ✓ {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mvrt-ai-chips">
                <button
                  type="button"
                  className="mvrt-ai-chip"
                  onClick={() =>
                    executeAiPrompt(
                      'Add event Build Workshop on 2027-01-16 at 10am'
                    )
                  }
                >
                  + Add Event
                </button>
                <button
                  type="button"
                  className="mvrt-ai-chip"
                  onClick={() =>
                    executeAiPrompt('Add task upload 2027 robot photo')
                  }
                >
                  + Add Task
                </button>
                <button
                  type="button"
                  className="mvrt-ai-chip"
                  onClick={() =>
                    executeAiPrompt(
                      siteData.meta.registrationOpen
                        ? 'Close registration'
                        : 'Open registration'
                    )
                  }
                >
                  {siteData.meta.registrationOpen
                    ? 'Close Registration'
                    : 'Open Registration'}
                </button>
              </div>

              <form
                className="mvrt-ai-input-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  void executeAiPrompt(aiPrompt);
                }}
              >
                <input
                  type="text"
                  className="mvrt-form-input"
                  style={{ flex: 1, padding: '7px 10px', fontSize: 12.5 }}
                  placeholder="Ask AI to edit site or add a task..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={aiBusy}
                  className="mvrt-top-btn primary"
                >
                  <Send size={13} />
                </button>
              </form>
            </>
          )}

          {aiTab === 'tasks' && (
            <div className="mvrt-modal-body" style={{ maxHeight: 360 }}>
              <form
                style={{ display: 'flex', gap: 6 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTaskText.trim()) return;
                  setTasks((prev) => [
                    {
                      id: `t-${Date.now()}`,
                      text: newTaskText.trim(),
                      done: false,
                      createdAt: 'Now'
                    },
                    ...prev
                  ]);
                  setNewTaskText('');
                }}
              >
                <input
                  type="text"
                  className="mvrt-form-input"
                  style={{ flex: 1, padding: '7px 10px', fontSize: 12.5 }}
                  placeholder="New maintainer task..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                />
                <button type="submit" className="mvrt-top-btn primary">
                  <Plus size={13} />
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tasks.map((task) => (
                  <div key={task.id} className="mvrt-task-row">
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        flex: 1,
                        textDecoration: task.done ? 'line-through' : 'none',
                        color: task.done ? '#71717a' : '#f4f4f5'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() =>
                          setTasks((prev) =>
                            prev.map((t) =>
                              t.id === task.id ? { ...t, done: !t.done } : t
                            )
                          )
                        }
                      />
                      <span>{task.text}</span>
                    </label>
                    {!task.done && (
                      <button
                        type="button"
                        className="mvrt-ai-chip"
                        onClick={() => {
                          setAiTab('chat');
                          void executeAiPrompt(task.text);
                        }}
                        title="Run task with AI"
                      >
                        Run AI
                      </button>
                    )}
                    <button
                      type="button"
                      className="mvrt-top-btn"
                      style={{ padding: '3px 6px' }}
                      onClick={() =>
                        setTasks((prev) =>
                          prev.filter((t) => t.id !== task.id)
                        )
                      }
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiTab === 'settings' && (
            <div className="mvrt-modal-body">
              <div className="mvrt-form-field">
                <label>AI Engine Mode</label>
                <select
                  className="mvrt-form-input"
                  value={aiSettings.provider}
                  onChange={(e) =>
                    setAiSettings((prev) => ({
                      ...prev,
                      provider: e.target.value as AiSettings['provider']
                    }))
                  }
                >
                  <option value="builtin">
                    Built-in Instant Commands (No API Key Needed)
                  </option>
                  <option value="gemini">Google Gemini (gemini-2.5-flash)</option>
                  <option value="openai">OpenAI (gpt-4o-mini)</option>
                </select>
              </div>
              {aiSettings.provider !== 'builtin' && (
                <div className="mvrt-form-field">
                  <label>
                    {aiSettings.provider === 'gemini'
                      ? 'Gemini API Key'
                      : 'OpenAI API Key'}
                  </label>
                  <input
                    type="password"
                    className="mvrt-form-input"
                    value={aiSettings.apiKey}
                    onChange={(e) =>
                      setAiSettings((prev) => ({
                        ...prev,
                        apiKey: e.target.value
                      }))
                    }
                    placeholder="Paste API key..."
                  />
                </div>
              )}
              <button
                type="button"
                className="mvrt-top-btn primary"
                onClick={() => setAiTab('chat')}
              >
                <Check size={13} />
                <span>Save &amp; Return to Chat</span>
              </button>
            </div>
          )}
        </div>
      )}

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
                  onClick={handleSelectAssetsFolder}
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

      {/* ==================== GITHUB LOGIN, AUTO-SYNC & DATED PUSH MODAL ==================== */}
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
              <h3>
                {ghSession
                  ? `GitHub Sync (@${ghSession.username})`
                  : 'Sign in with GitHub'}
              </h3>
              <button
                type="button"
                className="mvrt-top-btn"
                onClick={() => setShowGithubModal(false)}
              >
                <X size={14} />
              </button>
            </div>

            {!ghSession ? (
              <div className="mvrt-modal-body">
                <p style={{ fontSize: 12.5, color: '#a1a1aa', margin: 0 }}>
                  Sign in once — the app automatically pulls the latest{' '}
                  <code>main</code> branch, loads <code>mvrt-site.json</code>,
                  and pushes your edits to a dated branch.
                </p>

                <button
                  type="button"
                  disabled={ghBusy}
                  className="mvrt-top-btn github"
                  style={{ justifyContent: 'center', padding: '10px 14px' }}
                  onClick={handleUseLocalGitSignIn}
                >
                  <GitBranch size={14} />
                  <span>
                    {ghBusy
                      ? 'Signing in...'
                      : '1-Click Sign In via Local Git Credential'}
                  </span>
                </button>

                <div
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    color: '#71717a'
                  }}
                >
                  — OR —
                </div>

                <form
                  style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (ghTokenInput.trim()) {
                      void completeGitHubLogin(ghTokenInput);
                    }
                  }}
                >
                  <div className="mvrt-form-field">
                    <label>GitHub Personal Access Token (repo scope)</label>
                    <input
                      type="password"
                      className="mvrt-form-input"
                      placeholder="ghp_... or github_pat_..."
                      value={ghTokenInput}
                      onChange={(e) => setGhTokenInput(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={ghBusy}
                    className="mvrt-top-btn primary"
                    style={{ justifyContent: 'center', padding: '9px 14px' }}
                  >
                    <span>Sign In &amp; Auto-Pull from main</span>
                  </button>
                </form>

                {ghResult && (
                  <div
                    style={{
                      fontSize: 12,
                      padding: 10,
                      borderRadius: 8,
                      background: ghResult.isError
                        ? 'rgba(239,68,68,0.15)'
                        : 'rgba(16,185,129,0.15)',
                      color: ghResult.isError ? '#fca5a5' : '#6ee7b7'
                    }}
                  >
                    {ghResult.message}
                  </div>
                )}
              </div>
            ) : (
              <form
                className="mvrt-modal-body"
                onSubmit={handlePushToDatedBranch}
              >
                <div className="mvrt-form-field">
                  <label>Target GitHub Repository (auto-pulls from main)</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {ghRepos.length > 0 ? (
                      <select
                        className="mvrt-form-input"
                        style={{ flex: 1 }}
                        value={ghSession.repoSlug}
                        onChange={(e) => {
                          const nextRepo = e.target.value;
                          setGhSession((prev) =>
                            prev ? { ...prev, repoSlug: nextRepo } : prev
                          );
                          void handleAutoPullFromMain(
                            ghSession.token,
                            nextRepo
                          );
                        }}
                      >
                        {ghRepos.map((r) => (
                          <option key={r.fullName} value={r.fullName}>
                            {r.fullName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="mvrt-form-input"
                        style={{ flex: 1 }}
                        value={ghSession.repoSlug}
                        onChange={(e) =>
                          setGhSession((prev) =>
                            prev ? { ...prev, repoSlug: e.target.value } : prev
                          )
                        }
                      />
                    )}
                    <button
                      type="button"
                      className="mvrt-top-btn"
                      onClick={() =>
                        handleAutoPullFromMain(
                          ghSession.token,
                          ghSession.repoSlug
                        )
                      }
                      title="Pull latest from main"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>

                <div className="mvrt-form-field">
                  <label>Dated Branch Name</label>
                  <input
                    className="mvrt-form-input"
                    value={ghBranchName}
                    onChange={(e) => setGhBranchName(e.target.value)}
                    required
                  />
                </div>

                <div className="mvrt-form-field">
                  <label>Commit Message</label>
                  <input
                    className="mvrt-form-input"
                    value={ghCommitMsg}
                    onChange={(e) => setGhCommitMsg(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="submit"
                    disabled={ghBusy}
                    className="mvrt-top-btn github"
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      padding: '10px 14px'
                    }}
                  >
                    <GitBranch size={14} />
                    <span>
                      {ghBusy
                        ? 'Pushing...'
                        : `Push to "${ghBranchName}"`}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="mvrt-top-btn"
                    onClick={() => {
                      setGhSession(null);
                      setGhResult(null);
                    }}
                    title="Sign Out"
                  >
                    <LogOut size={14} />
                  </button>
                </div>

                {ghResult && (
                  <div
                    style={{
                      fontSize: 12,
                      padding: 12,
                      borderRadius: 8,
                      background: ghResult.isError
                        ? 'rgba(239,68,68,0.15)'
                        : 'rgba(16,185,129,0.15)',
                      color: ghResult.isError ? '#fca5a5' : '#6ee7b7',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div>{ghResult.message}</div>
                    {ghResult.prUrl && (
                      <a
                        href={ghResult.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#a78bfa',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontWeight: 700
                        }}
                      >
                        <span>Open Pull Request on GitHub</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
