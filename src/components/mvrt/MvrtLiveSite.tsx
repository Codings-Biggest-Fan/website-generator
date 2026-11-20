import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bold,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Heart,
  Image as ImageIcon,
  Italic,
  Link2,
  Mail,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X
} from 'lucide-react';
import type {
  AboutTabId,
  JoinTabId,
  MvrtEventItem,
  MvrtLeaderProfile,
  MvrtPageId,
  MvrtSiteData,
  MvrtTextStyleOverride
} from '../../types/mvrt';
import './MvrtLiveSite.css';

export type MaintainerSectionId =
  | 'wizard'
  | 'hero_glance'
  | 'events'
  | 'seasons'
  | 'leadership'
  | 'members_mentors'
  | 'outreach'
  | 'resources'
  | 'sponsors_newsletters'
  | 'join_faqs';

export interface AssetPickRequest {
  label: string;
  currentUrl: string;
  accept: 'image' | 'pdf' | 'any';
  folderHint?: string;
  onSelect: (newAssetPath: string) => void;
}

export interface MvrtLiveSiteProps {
  data: MvrtSiteData;
  activePage: MvrtPageId;
  onNavigatePage: (page: MvrtPageId) => void;
  showEditOverlays: boolean;
  onQuickEditSection?: (section: MaintainerSectionId) => void;
  onUpdateData?: (updater: (prev: MvrtSiteData) => MvrtSiteData) => void;
  onRequestAssetPick?: (req: AssetPickRequest) => void;
  uploadedAssets?: Array<{ path: string; dataUrl: string; name?: string }>;
  assetUrlMap?: Record<string, string>;
}

interface ActiveTextSelection {
  styleKey: string;
  label: string;
  defaultSize: number;
  multiline?: boolean;
  getText: (d: MvrtSiteData) => string;
  setText: (val: string) => void;
  linkLabel?: string;
  getLink?: (d: MvrtSiteData) => string;
  setLink?: (url: string) => void;
  linkAssetAccept?: 'pdf' | 'image' | 'any';
  linkFolderHint?: string;
}

function createMvrtSvgFallback(label: string, subtitle = 'FRC Team 115'): string {
  const safeLabel = label.replace(/[<>&"]/g, '');
  const safeSub = subtitle.replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#662d91"/>
        <stop offset="100%" stop-color="#3a1657"/>
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#g)"/>
    <circle cx="300" cy="165" r="76" fill="rgba(255,190,26,0.16)" stroke="#ffbe1a" stroke-width="3"/>
    <text x="300" y="177" text-anchor="middle" fill="#ffffff" font-family="Montserrat, sans-serif" font-weight="600" font-size="36">MVRT</text>
    <text x="300" y="290" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="600" font-size="22">${safeLabel}</text>
    <text x="300" y="324" text-anchor="middle" fill="#dab0ec" font-family="sans-serif" font-weight="400" font-size="15">${safeSub}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const ArrowCircleRightIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="currentColor"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <path d="M504 256C504 119 393 8 256 8S8 119 8 256s111 248 248 248 248-111 248-248zm-448 0c0-110.5 89.5-200 200-200s200 89.5 200 200-89.5 200-200 200S56 366.5 56 256zm72 20v-40c0-6.6 5.4-12 12-12h116v-67c0-10.7 12.9-16 20.5-8.5l99 99c4.7 4.7 4.7 12.3 0 17l-99 99c-7.6 7.6-20.5 2.2-20.5-8.5v-67H140c-6.6 0-12-5.4-12-12z" />
  </svg>
);

const LeaderProfileCard: React.FC<{
  leader: MvrtLeaderProfile;
  resolvedImageUrl: string;
  editMode: boolean;
  onPickPhoto: () => void;
  onClickName: () => void;
  onClickRole: () => void;
  onDelete: () => void;
  nameStyle?: React.CSSProperties;
  roleStyle?: React.CSSProperties;
  activeKey?: string;
}> = ({
  leader,
  resolvedImageUrl,
  editMode,
  onPickPhoto,
  onClickName,
  onClickRole,
  onDelete,
  nameStyle,
  roleStyle,
  activeKey
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [resolvedImageUrl]);

  const initials = leader.name
    .split(' ')
    .map((p) => p.replace(/[^A-Za-z]/g, '')[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mvrt-profile-box" style={{ position: 'relative' }}>
      {editMode && (
        <button
          type="button"
          className="mvrt-onscreen-pill danger"
          style={{ position: 'absolute', top: 8, right: 8 }}
          onClick={onDelete}
          title="Remove Officer"
        >
          <Trash2 size={11} />
        </button>
      )}
      <div
        className="mvrt-inline-img-wrap"
        onClick={() => {
          if (editMode) onPickPhoto();
        }}
      >
        {resolvedImageUrl && !imgFailed ? (
          <img
            className={`mvrt-profile-img ${editMode ? 'mvrt-inline-img-clickable' : ''}`}
            src={resolvedImageUrl}
            alt={leader.name}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className={`mvrt-profile-fallback ${editMode ? 'mvrt-inline-img-clickable' : ''}`}
            aria-label={leader.name}
          >
            {initials || 'MV'}
          </div>
        )}
        {editMode && <span className="mvrt-img-pick-badge">Pick Photo</span>}
      </div>

      <h3
        className={`mvrt-profile-name mvrt-inline-editable ${
          activeKey === `leader-name-${leader.id}` ? 'is-active-edit' : ''
        }`}
        style={nameStyle}
        onClick={(e) => {
          if (editMode) {
            e.stopPropagation();
            onClickName();
          }
        }}
      >
        {leader.name}
      </h3>
      <h4
        className={`mvrt-profile-role mvrt-inline-editable ${
          activeKey === `leader-role-${leader.id}` ? 'is-active-edit' : ''
        }`}
        style={roleStyle}
        onClick={(e) => {
          if (editMode) {
            e.stopPropagation();
            onClickRole();
          }
        }}
      >
        {leader.role}
      </h4>
      <div style={{ marginBottom: '4px' }}>
        <a
          href={`mailto:${leader.email}`}
          className="mvrt-btn-main mvrt-btn-main-sm"
          onClick={(e) => {
            if (editMode) {
              e.preventDefault();
              onClickName();
            }
          }}
        >
          <Mail size={14} />
          <span>Email</span>
        </a>
      </div>
    </div>
  );
};

export const MvrtLiveSite: React.FC<MvrtLiveSiteProps> = ({
  data,
  activePage,
  onNavigatePage,
  showEditOverlays,
  onUpdateData,
  onRequestAssetPick,
  uploadedAssets,
  assetUrlMap
}) => {
  const [aboutTab, setAboutTab] = useState<AboutTabId>('overview');
  const [joinTab, setJoinTab] = useState<JoinTabId>('regular');
  const [selectedTimelineYear, setSelectedTimelineYear] = useState<number>(
    data.seasons[0]?.year || 2026
  );
  const [memberSearch, setMemberSearch] = useState('');
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);
  const [typedText, setTypedText] = useState(
    data.meta.typewriterPhrases[0] || 'MVRT.'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  // Active On-Screen Text Selection for Floating Toolbar
  const [activeTextSel, setActiveTextSel] =
    useState<ActiveTextSelection | null>(null);
  const [showBulkMembersModal, setShowBulkMembersModal] = useState(false);
  const [bulkMembersDraft, setBulkMembersDraft] = useState('');

  // Interactive Calendar State (View Mode + Displayed Month + Add/Edit Event Modal)
  const [calendarViewMode, setCalendarViewMode] = useState<
    'interactive' | 'google'
  >('interactive');
  const [calYear, setCalYear] = useState<number>(() => {
    const firstIso = data.eventsConfig.items.find((e) => e.isoDate)?.isoDate;
    if (firstIso) return Number(firstIso.slice(0, 4)) || new Date().getFullYear();
    return new Date().getFullYear();
  });
  const [calMonth, setCalMonth] = useState<number>(() => {
    const firstIso = data.eventsConfig.items.find((e) => e.isoDate)?.isoDate;
    if (firstIso) return (Number(firstIso.slice(5, 7)) || 1) - 1;
    return new Date().getMonth();
  });
  const [calEventModal, setCalEventModal] = useState<{
    isNew: boolean;
    draft: MvrtEventItem;
  } | null>(null);

  const timelineWrapperRef = useRef<HTMLDivElement | null>(null);

  // Clear selection when leaving Editor mode or switching pages
  useEffect(() => {
    if (!showEditOverlays) {
      setActiveTextSel(null);
    }
  }, [showEditOverlays]);

  useEffect(() => {
    setActiveTextSel(null);
    setMobileMenuOpen(false);
  }, [activePage, aboutTab, joinTab]);

  const mutateData = (updater: (prev: MvrtSiteData) => MvrtSiteData) => {
    if (onUpdateData) {
      onUpdateData(updater);
    }
  };

  const getCustomStyle = (styleKey: string): React.CSSProperties => {
    const ov = data.textStyles?.[styleKey];
    if (!ov) return {};
    return {
      ...(ov.fontSize ? { fontSize: `${ov.fontSize}px` } : {}),
      ...(ov.fontWeight ? { fontWeight: Number(ov.fontWeight) } : {}),
      ...(ov.fontStyle ? { fontStyle: ov.fontStyle } : {}),
      ...(ov.color ? { color: ov.color } : {})
    };
  };

  const updateTextStyle = (
    styleKey: string,
    patch: Partial<MvrtTextStyleOverride>
  ) => {
    mutateData((prev) => {
      const existing = prev.textStyles?.[styleKey] || {};
      return {
        ...prev,
        textStyles: {
          ...(prev.textStyles || {}),
          [styleKey]: { ...existing, ...patch }
        }
      };
    });
  };

  const resetTextStyle = (styleKey: string) => {
    mutateData((prev) => {
      const next = { ...(prev.textStyles || {}) };
      delete next[styleKey];
      return { ...prev, textStyles: next };
    });
  };

  const pickImage = (
    label: string,
    currentUrl: string,
    folderHint: string,
    onSelect: (newUrl: string) => void
  ) => {
    if (!showEditOverlays || !onRequestAssetPick) return;
    onRequestAssetPick({
      label,
      currentUrl,
      accept: 'image',
      folderHint,
      onSelect
    });
  };

  const pickPdf = (
    label: string,
    currentUrl: string,
    folderHint: string,
    onSelect: (newUrl: string) => void
  ) => {
    if (!showEditOverlays || !onRequestAssetPick) return;
    onRequestAssetPick({
      label,
      currentUrl,
      accept: 'pdf',
      folderHint,
      onSelect
    });
  };

  const resolvedUploadedMap = useMemo(() => {
    const map = new Map<string, string>();
    const addKey = (k: string, v: string) => {
      const clean = k.replace(/\\/g, '/').replace(/^\.?\//, '');
      map.set(clean, v);
      map.set(clean.toLowerCase(), v);
      try {
        const decoded = decodeURIComponent(clean);
        map.set(decoded, v);
        map.set(decoded.toLowerCase(), v);
      } catch {
        // ignore malformed URI sequences
      }
      const baseName = clean.split('/').pop();
      if (baseName && !map.has(`__basename__/${baseName.toLowerCase()}`)) {
        map.set(`__basename__/${baseName.toLowerCase()}`, v);
      }
    };
    if (assetUrlMap) {
      for (const [k, v] of Object.entries(assetUrlMap)) {
        addKey(k, v);
      }
    }
    if (uploadedAssets) {
      for (const asset of uploadedAssets) {
        addKey(asset.path, asset.dataUrl);
        const cleanPath = asset.path.replace(/\\/g, '/').replace(/^\.?\//, '');
        const assetsIdx = cleanPath.toLowerCase().indexOf('assets/');
        if (assetsIdx >= 0) {
          addKey(cleanPath.slice(assetsIdx), asset.dataUrl);
        }
      }
    }
    return map;
  }, [uploadedAssets, assetUrlMap]);

  const resolveAssetUrl = (rawUrl?: string): string => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) return rawUrl;

    const base = (data.meta.baseAssetUrl || 'https://mvrt.com').replace(
      /\/$/,
      ''
    );
    const normalized = rawUrl
      .replace(/\\/g, '/')
      .replace(new RegExp(`^${base}/`, 'i'), '')
      .replace(/^https?:\/\/mvrt\.com\//i, '')
      .replace(/^\.?\//, '');

    let decodedNorm = normalized;
    try {
      decodedNorm = decodeURIComponent(normalized);
    } catch {
      // ignore
    }

    const baseName = decodedNorm.split('/').pop()?.toLowerCase() || '';
    const fromMap =
      resolvedUploadedMap.get(rawUrl) ||
      resolvedUploadedMap.get(normalized) ||
      resolvedUploadedMap.get(normalized.toLowerCase()) ||
      resolvedUploadedMap.get(decodedNorm) ||
      resolvedUploadedMap.get(decodedNorm.toLowerCase()) ||
      (baseName ? resolvedUploadedMap.get(`__basename__/${baseName}`) : undefined);
    if (fromMap) return fromMap;

    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }
    return `${base}/${normalized}`;
  };

  useEffect(() => {
    if (heroSlideIdx >= data.meta.heroSlides.length) {
      setHeroSlideIdx(0);
    }
  }, [data.meta.heroSlides.length, heroSlideIdx]);

  useEffect(() => {
    if (
      data.seasons.length > 0 &&
      !data.seasons.some((s) => s.year === selectedTimelineYear)
    ) {
      setSelectedTimelineYear(data.seasons[0].year);
    }
  }, [data.seasons, selectedTimelineYear]);

  useEffect(() => {
    if (activePage !== 'home' || data.meta.heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroSlideIdx((prev) => (prev + 1) % data.meta.heroSlides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [activePage, data.meta.heroSlides.length]);

  useEffect(() => {
    if (activePage !== 'home') return;
    const phrases =
      data.meta.typewriterPhrases.length > 0
        ? data.meta.typewriterPhrases
        : ['MVRT.'];
    let phraseIndex = 0;
    let charIndex = phrases[0].length;
    let isDeleting = true;
    let pauseTicks = 11;

    const interval = window.setInterval(() => {
      const currentPhrase = phrases[phraseIndex] || 'MVRT.';
      if (pauseTicks > 0) {
        pauseTicks--;
        return;
      }
      if (isDeleting) {
        charIndex = Math.max(0, charIndex - 1);
        setTypedText(currentPhrase.slice(0, charIndex));
        if (charIndex === 0) {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
      } else {
        charIndex = Math.min(currentPhrase.length, charIndex + 1);
        setTypedText(currentPhrase.slice(0, charIndex));
        if (charIndex === currentPhrase.length) {
          isDeleting = true;
          pauseTicks = 13;
        }
      }
    }, 85);

    return () => window.clearInterval(interval);
  }, [activePage, data.meta.typewriterPhrases]);

  const featuredSeason = useMemo(() => {
    return (
      data.seasons.find(
        (s) => s.year === data.glanceStats.featuredSeasonYear
      ) || data.seasons[0]
    );
  }, [data.seasons, data.glanceStats.featuredSeasonYear]);

  const activeTimelineSeason = useMemo(() => {
    return (
      data.seasons.find((s) => s.year === selectedTimelineYear) ||
      data.seasons[0]
    );
  }, [data.seasons, selectedTimelineYear]);

  const activeTimelineIndex = useMemo(() => {
    const idx = data.seasons.findIndex((s) => s.year === selectedTimelineYear);
    return idx >= 0 ? idx : 0;
  }, [data.seasons, selectedTimelineYear]);

  useEffect(() => {
    if (aboutTab !== 'history' || !timelineWrapperRef.current) return;
    const nodeSpacing = 84;
    const nodeOffset = 50 + activeTimelineIndex * nodeSpacing;
    const wrapper = timelineWrapperRef.current;
    const targetScroll = Math.max(0, nodeOffset - wrapper.clientWidth / 2);
    wrapper.scrollTo({ left: targetScroll, behavior: 'smooth' });
  }, [aboutTab, activeTimelineIndex]);

  const pastRobotsList = useMemo(() => {
    return data.seasons.filter((s) => s.showInPastRobots);
  }, [data.seasons]);

  const sortedFilteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return [...data.members]
      .sort((a, b) => a.localeCompare(b))
      .filter((m) => !q || m.toLowerCase().includes(q));
  }, [data.members, memberSearch]);

  const teamMeetings = useMemo(
    () => data.eventsConfig.items.filter((e) => e.category === 'team_meeting'),
    [data.eventsConfig.items]
  );

  const teamEvents = useMemo(
    () => data.eventsConfig.items.filter((e) => e.category === 'team_event'),
    [data.eventsConfig.items]
  );

  const demoEvents = useMemo(
    () => data.eventsConfig.items.filter((e) => e.category === 'demo_outreach'),
    [data.eventsConfig.items]
  );

  const formatIsoToHumanDate = (
    isoDate?: string,
    endDate?: string,
    timeText?: string
  ): string => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) return isoDate;
    const startObj = new Date(y, m - 1, d);
    const monthName = startObj.toLocaleString('en-US', { month: 'long' });
    let base = `${monthName} ${d}, ${y}`;
    if (endDate && endDate !== isoDate) {
      const [ey, em, ed] = endDate.split('-').map(Number);
      if (ey && em && ed) {
        if (ey === y && em === m) {
          base = `${monthName} ${d}–${ed}, ${y}`;
        } else {
          const endObj = new Date(ey, em - 1, ed);
          const endMonth = endObj.toLocaleString('en-US', { month: 'short' });
          base = `${startObj.toLocaleString('en-US', { month: 'short' })} ${d} – ${endMonth} ${ed}, ${ey}`;
        }
      }
    }
    return timeText?.trim() ? `${base}, ${timeText.trim()}` : base;
  };

  const openAddCalendarEvent = (
    isoDate?: string,
    category: MvrtEventItem['category'] = 'team_event'
  ) => {
    const defaultIso =
      isoDate ||
      `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(
        new Date().getDate()
      ).padStart(2, '0')}`;
    setCalEventModal({
      isNew: true,
      draft: {
        id: `evt-${Date.now()}`,
        title: '',
        isoDate: defaultIso,
        endDate: '',
        timeText: '',
        dateText: formatIsoToHumanDate(defaultIso),
        location: 'Monta Vista High School',
        category
      }
    });
  };

  const saveCalendarEventModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calEventModal) return;
    const { isNew, draft } = calEventModal;
    const finalDateText =
      draft.dateText.trim() ||
      formatIsoToHumanDate(draft.isoDate, draft.endDate, draft.timeText);
    const savedItem: MvrtEventItem = {
      ...draft,
      title: draft.title.trim() || 'Untitled MVRT Event',
      dateText: finalDateText
    };
    mutateData((prev) => ({
      ...prev,
      eventsConfig: {
        ...prev.eventsConfig,
        items: isNew
          ? [...prev.eventsConfig.items, savedItem]
          : prev.eventsConfig.items.map((x) =>
              x.id === savedItem.id ? savedItem : x
            )
      }
    }));
    setCalEventModal(null);
  };

  // Build 42-day (6-week) calendar grid cells for (calYear, calMonth)
  const calendarGridCells = useMemo(() => {
    const firstOfMonth = new Date(calYear, calMonth, 1);
    const startWeekday = firstOfMonth.getDay(); // 0 = Sun
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

    const cells: Array<{
      iso: string;
      dayNum: number;
      isOutside: boolean;
      events: MvrtEventItem[];
    }> = [];

    const pad = (n: number) => String(n).padStart(2, '0');
    const makeIso = (yr: number, mo: number, dy: number) => {
      const dt = new Date(yr, mo, dy);
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    };

    const matchEventsForIso = (iso: string) =>
      data.eventsConfig.items.filter((ev) => {
        if (!ev.isoDate) return false;
        const end = ev.endDate && ev.endDate >= ev.isoDate ? ev.endDate : ev.isoDate;
        return iso >= ev.isoDate && iso <= end;
      });

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const iso = makeIso(calYear, calMonth - 1, d);
      cells.push({ iso, dayNum: d, isOutside: true, events: matchEventsForIso(iso) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = makeIso(calYear, calMonth, d);
      cells.push({ iso, dayNum: d, isOutside: false, events: matchEventsForIso(iso) });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const iso = makeIso(calYear, calMonth + 1, d);
      cells.push({ iso, dayNum: d, isOutside: true, events: matchEventsForIso(iso) });
    }
    return cells;
  }, [calYear, calMonth, data.eventsConfig.items]);

  const memberCountDisplay = data.glanceStats.autoCountMembers
    ? String(data.members.length)
    : data.glanceStats.currentMembersDisplay;

  const navItems: Array<{ id: MvrtPageId; label: string }> = [
    { id: 'home', label: 'HOME' },
    { id: 'about', label: 'ABOUT' },
    { id: 'outreach', label: 'OUTREACH' },
    { id: 'calendar', label: 'CALENDAR' },
    { id: 'resources', label: 'RESOURCES' },
    { id: 'contact', label: 'CONTACT' },
    { id: 'sponsors', label: 'SPONSORS' },
    { id: 'newsletters', label: 'NEWSLETTERS' }
  ];

  const handleNavigate = (page: MvrtPageId) => {
    setMobileMenuOpen(false);
    onNavigatePage(page);
  };

  const timelineTrackWidth = Math.max(760, data.seasons.length * 84 + 100);
  const timelineFillPx =
    data.seasons.length > 0 ? 50 + activeTimelineIndex * 84 : 0;

  const activeStyleOverride = activeTextSel
    ? data.textStyles?.[activeTextSel.styleKey] || {}
    : {};
  const currentFontSize =
    activeStyleOverride.fontSize || activeTextSel?.defaultSize || 18;

  return (
    <div
      className={`mvrt-site-root ${showEditOverlays ? 'mvrt-edit-mode' : ''}`}
    >
      {/* ==================== FLOATING ON-SCREEN TEXT & LINK TOOLBAR ==================== */}
      {showEditOverlays && activeTextSel && (
        <div
          className="mvrt-floating-text-toolbar"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mvrt-ft-top-row">
            <span className="mvrt-ft-label">
              Editing: {activeTextSel.label}
            </span>

            <div className="mvrt-ft-controls">
              {/* Font Size - / px / + */}
              <button
                type="button"
                className="mvrt-ft-btn"
                onClick={() =>
                  updateTextStyle(activeTextSel.styleKey, {
                    fontSize: Math.max(11, currentFontSize - 2)
                  })
                }
                title="Decrease Font Size"
              >
                <Minus size={12} />
              </button>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  minWidth: '40px',
                  textAlign: 'center',
                  color: '#e4e4e7'
                }}
              >
                {currentFontSize}px
              </span>
              <input
                type="range"
                min={12}
                max={76}
                value={currentFontSize}
                onChange={(e) =>
                  updateTextStyle(activeTextSel.styleKey, {
                    fontSize: Number(e.target.value)
                  })
                }
                style={{ width: 72, accentColor: '#a78bfa', cursor: 'pointer' }}
                title="Adjust Font Size"
              />
              <button
                type="button"
                className="mvrt-ft-btn"
                onClick={() =>
                  updateTextStyle(activeTextSel.styleKey, {
                    fontSize: Math.min(84, currentFontSize + 2)
                  })
                }
                title="Increase Font Size"
              >
                <Plus size={12} />
              </button>

              {/* Bold / Italic */}
              <button
                type="button"
                className={`mvrt-ft-btn ${
                  activeStyleOverride.fontWeight === '700' ? 'active' : ''
                }`}
                onClick={() =>
                  updateTextStyle(activeTextSel.styleKey, {
                    fontWeight:
                      activeStyleOverride.fontWeight === '700' ? '400' : '700'
                  })
                }
                title="Toggle Bold"
              >
                <Bold size={12} />
              </button>
              <button
                type="button"
                className={`mvrt-ft-btn ${
                  activeStyleOverride.fontStyle === 'italic' ? 'active' : ''
                }`}
                onClick={() =>
                  updateTextStyle(activeTextSel.styleKey, {
                    fontStyle:
                      activeStyleOverride.fontStyle === 'italic'
                        ? 'normal'
                        : 'italic'
                  })
                }
                title="Toggle Italic"
              >
                <Italic size={12} />
              </button>

              {/* Color Swatches */}
              {(
                [
                  '#3b4045',
                  '#662d91',
                  '#4d1a72',
                  '#0275d8',
                  '#777777',
                  '#ffffff',
                  '#ffbe1a'
                ] as const
              ).map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`mvrt-ft-swatch ${
                    activeStyleOverride.color === hex ? 'active' : ''
                  }`}
                  style={{ backgroundColor: hex }}
                  onClick={() =>
                    updateTextStyle(activeTextSel.styleKey, { color: hex })
                  }
                  title={`Color ${hex}`}
                />
              ))}

              <button
                type="button"
                className="mvrt-ft-btn"
                onClick={() => resetTextStyle(activeTextSel.styleKey)}
                title="Reset font size & color"
              >
                <RotateCcw size={12} />
              </button>

              <button
                type="button"
                className="mvrt-ft-btn active"
                onClick={() => setActiveTextSel(null)}
              >
                <Check size={12} />
                <span>Done</span>
              </button>
            </div>
          </div>

          {/* Text Input / Textarea */}
          {activeTextSel.multiline ? (
            <textarea
              rows={3}
              className="mvrt-ft-input"
              value={activeTextSel.getText(data)}
              onChange={(e) => activeTextSel.setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setActiveTextSel(null);
              }}
              autoFocus
            />
          ) : (
            <input
              type="text"
              className="mvrt-ft-input"
              value={activeTextSel.getText(data)}
              onChange={(e) => activeTextSel.setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  setActiveTextSel(null);
                }
              }}
              autoFocus
            />
          )}

          {/* Optional Link / File URL Editor */}
          {activeTextSel.getLink && activeTextSel.setLink && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link2 size={14} color="#a78bfa" />
              <span
                style={{
                  fontSize: '11.5px',
                  color: '#a1a1aa',
                  whiteSpace: 'nowrap'
                }}
              >
                {activeTextSel.linkLabel || 'Link URL'}:
              </span>
              <input
                type="text"
                className="mvrt-ft-input"
                style={{ padding: '5px 9px', fontSize: '12.5px' }}
                value={activeTextSel.getLink(data)}
                onChange={(e) => activeTextSel.setLink!(e.target.value)}
              />
              {activeTextSel.linkAssetAccept && onRequestAssetPick && (
                <button
                  type="button"
                  className="mvrt-ft-btn active"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={() =>
                    onRequestAssetPick({
                      label: activeTextSel.linkLabel || 'Select File',
                      currentUrl: activeTextSel.getLink!(data),
                      accept: activeTextSel.linkAssetAccept!,
                      folderHint: activeTextSel.linkFolderHint,
                      onSelect: (newUrl) => activeTextSel.setLink!(newUrl)
                    })
                  }
                >
                  <FolderOpen size={12} />
                  <span>Pick from Assets</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== BULK MEMBERS PASTE MODAL ==================== */}
      {showBulkMembersModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={() => setShowBulkMembersModal(false)}
        >
          <div
            style={{
              background: '#141418',
              color: '#fafafa',
              borderRadius: 14,
              padding: 22,
              width: 'min(520px, 95vw)',
              border: '1px solid rgba(255,255,255,0.14)',
              fontFamily: 'Inter, sans-serif'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10
              }}
            >
              <strong style={{ fontSize: 16 }}>
                Edit Student Members List (One per line)
              </strong>
              <button
                type="button"
                className="mvrt-ft-btn"
                onClick={() => setShowBulkMembersModal(false)}
              >
                <X size={14} />
              </button>
            </div>
            <textarea
              rows={12}
              className="mvrt-ft-input"
              value={bulkMembersDraft}
              onChange={(e) => setBulkMembersDraft(e.target.value)}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 12
              }}
            >
              <button
                type="button"
                className="mvrt-ft-btn active"
                onClick={() => {
                  const cleaned = Array.from(
                    new Set(
                      bulkMembersDraft
                        .split('\n')
                        .map((m) => m.trim())
                        .filter(Boolean)
                    )
                  ).sort((a, b) => a.localeCompare(b));
                  mutateData((prev) => ({ ...prev, members: cleaned }));
                  setShowBulkMembersModal(false);
                }}
              >
                <Check size={13} />
                <span>Save &amp; Sort Alphabetically</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADD / EDIT CALENDAR EVENT MODAL ==================== */}
      {calEventModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={() => setCalEventModal(null)}
        >
          <form
            onSubmit={saveCalendarEventModal}
            style={{
              background: '#141418',
              color: '#fafafa',
              borderRadius: 14,
              padding: 22,
              width: 'min(480px, 95vw)',
              border: '1px solid rgba(255,255,255,0.14)',
              fontFamily: 'Inter, sans-serif',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <strong style={{ fontSize: 16 }}>
                {calEventModal.isNew
                  ? 'Add Event to Calendar'
                  : 'Edit Calendar Event'}
              </strong>
              <button
                type="button"
                className="mvrt-ft-btn"
                onClick={() => setCalEventModal(null)}
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  color: '#a1a1aa',
                  marginBottom: 4
                }}
              >
                Event Title
              </label>
              <input
                type="text"
                className="mvrt-ft-input"
                placeholder="e.g. Build Meeting, Competition, STEM4KIDS Demo"
                value={calEventModal.draft.title}
                onChange={(e) =>
                  setCalEventModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          draft: { ...prev.draft, title: e.target.value }
                        }
                      : null
                  )
                }
                required
                autoFocus
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#a1a1aa',
                    marginBottom: 4
                  }}
                >
                  Start Date
                </label>
                <input
                  type="date"
                  className="mvrt-ft-input"
                  value={calEventModal.draft.isoDate || ''}
                  onChange={(e) => {
                    const nextIso = e.target.value;
                    setCalEventModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            draft: {
                              ...prev.draft,
                              isoDate: nextIso,
                              dateText: formatIsoToHumanDate(
                                nextIso,
                                prev.draft.endDate,
                                prev.draft.timeText
                              )
                            }
                          }
                        : null
                    );
                  }}
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#a1a1aa',
                    marginBottom: 4
                  }}
                >
                  End Date (optional)
                </label>
                <input
                  type="date"
                  className="mvrt-ft-input"
                  value={calEventModal.draft.endDate || ''}
                  onChange={(e) => {
                    const nextEnd = e.target.value;
                    setCalEventModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            draft: {
                              ...prev.draft,
                              endDate: nextEnd,
                              dateText: formatIsoToHumanDate(
                                prev.draft.isoDate,
                                nextEnd,
                                prev.draft.timeText
                              )
                            }
                          }
                        : null
                    );
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#a1a1aa',
                    marginBottom: 4
                  }}
                >
                  Time (optional)
                </label>
                <input
                  type="text"
                  className="mvrt-ft-input"
                  placeholder="e.g. 3:30 PM – 6:00 PM"
                  value={calEventModal.draft.timeText || ''}
                  onChange={(e) => {
                    const nextTime = e.target.value;
                    setCalEventModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            draft: {
                              ...prev.draft,
                              timeText: nextTime,
                              dateText: formatIsoToHumanDate(
                                prev.draft.isoDate,
                                prev.draft.endDate,
                                nextTime
                              )
                            }
                          }
                        : null
                    );
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#a1a1aa',
                    marginBottom: 4
                  }}
                >
                  Category
                </label>
                <select
                  className="mvrt-ft-input"
                  value={calEventModal.draft.category}
                  onChange={(e) =>
                    setCalEventModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            draft: {
                              ...prev.draft,
                              category: e.target
                                .value as MvrtEventItem['category']
                            }
                          }
                        : null
                    )
                  }
                >
                  <option value="team_event">Team Event / Competition</option>
                  <option value="team_meeting">Team Meeting</option>
                  <option value="demo_outreach">Demo &amp; Outreach</option>
                </select>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  color: '#a1a1aa',
                  marginBottom: 4
                }}
              >
                Location (optional)
              </label>
              <input
                type="text"
                className="mvrt-ft-input"
                placeholder="e.g. Monta Vista High School Robotics Shop"
                value={calEventModal.draft.location || ''}
                onChange={(e) =>
                  setCalEventModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          draft: { ...prev.draft, location: e.target.value }
                        }
                      : null
                  )
                }
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 6
              }}
            >
              {!calEventModal.isNew ? (
                <button
                  type="button"
                  className="mvrt-onscreen-pill danger"
                  onClick={() => {
                    mutateData((prev) => ({
                      ...prev,
                      eventsConfig: {
                        ...prev.eventsConfig,
                        items: prev.eventsConfig.items.filter(
                          (x) => x.id !== calEventModal.draft.id
                        )
                      }
                    }));
                    setCalEventModal(null);
                  }}
                >
                  <Trash2 size={12} />
                  <span>Delete Event</span>
                </button>
              ) : (
                <span />
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="mvrt-ft-btn"
                  onClick={() => setCalEventModal(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="mvrt-ft-btn active">
                  <Check size={13} />
                  <span>Save Event</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ==================== GLOBAL HEADER & NAVIGATION ==================== */}
      <header
        id={activePage === 'home' ? 'home-nav' : undefined}
        className={`mvrt-navbar ${activePage === 'home' ? 'is-home' : ''}`}
      >
        <div className="mvrt-nav-box">
          <button
            type="button"
            className="mvrt-brand-logo"
            onClick={() => handleNavigate('home')}
          >
            <h1>{data.meta.shortName || 'MVRT'}</h1>
          </button>

          <svg
            id="menubtn"
            className={`mvrt-menubtn ${mobileMenuOpen ? 'opened' : ''}`}
            viewBox="0 0 100 100"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            role="button"
            tabIndex={0}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <path
              className="line line1"
              d="M 20 29 H 82 C 91 29 107 91 77 75 l -52 -50"
            />
            <path className="line line2" d="M 20 50 H 80 " />
            <path
              className="line line3"
              d="M 20 71 H 82 C 91 71 107 9 77 25 L 25 75 "
            />
          </svg>

          <nav aria-label="MVRT Primary Navigation">
            <ul
              id="top-nav"
              className={`mvrt-nav-menu ${mobileMenuOpen ? 'opened' : ''}`}
            >
              {navItems.map((item) => (
                <li key={item.id} className="mvrt-nav-item">
                  <button
                    type="button"
                    className={`mvrt-nav-link ${
                      activePage === item.id ? 'active' : ''
                    }`}
                    onClick={() => handleNavigate(item.id)}
                  >
                    <b>{item.label}</b>
                  </button>
                </li>
              ))}
              <li className="mvrt-nav-item">
                <button
                  type="button"
                  className="mvrt-btn-main mvrt-btn-nav-sm"
                  onClick={() => handleNavigate('join')}
                >
                  <span>Join</span>
                  <ArrowCircleRightIcon size={15} />
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* ==================== PAGE 1: HOME (index.html) ==================== */}
      {activePage === 'home' && (
        <main>
          {/* Section 1: Hero (.hero-area) */}
          <section className="mvrt-hero-area mvrt-editable-region">
            {showEditOverlays && (
              <div
                style={{
                  position: 'absolute',
                  top: 86,
                  right: 20,
                  zIndex: 30,
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap'
                }}
              >
                <button
                  type="button"
                  className="mvrt-onscreen-pill"
                  onClick={() =>
                    pickImage(
                      `Hero Slide #${heroSlideIdx + 1}`,
                      data.meta.heroSlides[heroSlideIdx] || '',
                      'home-page-slides',
                      (newUrl) =>
                        mutateData((prev) => ({
                          ...prev,
                          meta: {
                            ...prev.meta,
                            heroSlides: prev.meta.heroSlides.map((s, i) =>
                              i === heroSlideIdx ? newUrl : s
                            )
                          }
                        }))
                    )
                  }
                >
                  <ImageIcon size={13} />
                  <span>Change Slide #{heroSlideIdx + 1} Photo</span>
                </button>
                <button
                  type="button"
                  className="mvrt-onscreen-pill"
                  onClick={() =>
                    pickImage(
                      'Add New Hero Slide Photo',
                      '',
                      'home-page-slides',
                      (newUrl) => {
                        mutateData((prev) => ({
                          ...prev,
                          meta: {
                            ...prev.meta,
                            heroSlides: [...prev.meta.heroSlides, newUrl]
                          }
                        }));
                        setHeroSlideIdx(data.meta.heroSlides.length);
                      }
                    )
                  }
                >
                  <Plus size={12} />
                  <span>Add Slide</span>
                </button>
                {data.meta.heroSlides.length > 1 && (
                  <button
                    type="button"
                    className="mvrt-onscreen-pill danger"
                    onClick={() => {
                      mutateData((prev) => ({
                        ...prev,
                        meta: {
                          ...prev.meta,
                          heroSlides: prev.meta.heroSlides.filter(
                            (_, i) => i !== heroSlideIdx
                          )
                        }
                      }));
                      setHeroSlideIdx(0);
                    }}
                    title="Remove current slide"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )}

            <div className="mvrt-hero-splashing">
              {data.meta.heroSlides.map((slideUrl, idx) => (
                <div
                  key={`${slideUrl}-${idx}`}
                  className="mvrt-hero-slide"
                  style={{
                    opacity: idx === heroSlideIdx ? 1 : 0,
                    zIndex: idx === heroSlideIdx ? 2 : 1
                  }}
                >
                  <img
                    className="mvrt-hero-splash-img"
                    src={resolveAssetUrl(slideUrl)}
                    alt={`MVRT Hero Slide ${idx + 1}`}
                    onError={(e) => {
                      e.currentTarget.src = createMvrtSvgFallback(
                        `MVRT Slide ${idx + 1}`,
                        'Monta Vista Robotics Team 115'
                      );
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mvrt-hero-fade" />

            <div className="mvrt-hero-container">
              <div className="mvrt-hero-block">
                <h1
                  className={`mvrt-hero-title mvrt-inline-editable ${
                    activeTextSel?.styleKey === 'hero-title'
                      ? 'is-active-edit'
                      : ''
                  }`}
                  style={getCustomStyle('hero-title')}
                  onClick={() => {
                    if (!showEditOverlays) return;
                    setActiveTextSel({
                      styleKey: 'hero-title',
                      label: 'Hero Typewriter Words (comma-separated)',
                      defaultSize: 60,
                      getText: (d) => d.meta.typewriterPhrases.join(', '),
                      setText: (val) =>
                        mutateData((prev) => ({
                          ...prev,
                          meta: {
                            ...prev.meta,
                            typewriterPhrases: val
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean)
                          }
                        }))
                    });
                  }}
                >
                  <span>
                    We are{' '}
                    <span className="mvrt-hero-typewriter">{typedText}</span>
                    <span className="mvrt-typed-cursor">|</span>
                  </span>
                </h1>
                <p
                  className={`mvrt-hero-subtitle mvrt-inline-editable ${
                    activeTextSel?.styleKey === 'hero-subtitle'
                      ? 'is-active-edit'
                      : ''
                  }`}
                  style={getCustomStyle('hero-subtitle')}
                  onClick={() => {
                    if (!showEditOverlays) return;
                    setActiveTextSel({
                      styleKey: 'hero-subtitle',
                      label: 'Hero Subtitle Paragraph',
                      defaultSize: 18,
                      multiline: true,
                      getText: (d) => d.meta.heroSubtitle,
                      setText: (val) =>
                        mutateData((prev) => ({
                          ...prev,
                          meta: { ...prev.meta, heroSubtitle: val }
                        }))
                    });
                  }}
                >
                  {data.meta.heroSubtitle}
                </p>
                <button
                  type="button"
                  className="mvrt-btn-main"
                  onClick={() => handleNavigate('about')}
                >
                  <span>Learn More</span>
                  <ArrowRight size={17} />
                </button>

                {data.meta.heroSlides.length > 1 && (
                  <div className="mvrt-hero-dots" aria-label="Hero Slides">
                    {data.meta.heroSlides.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`mvrt-hero-dot ${
                          idx === heroSlideIdx ? 'active' : ''
                        }`}
                        onClick={() => setHeroSlideIdx(idx)}
                        aria-label={`View slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 2: Upcoming Events (.feature.section) */}
          <section className="mvrt-feature-section mvrt-editable-region">
            <div className="mvrt-container">
              <div className="mvrt-heading">
                <h2>Upcoming Events</h2>
                <h3>
                  A full calendar is available on our{' '}
                  <button
                    type="button"
                    className="mvrt-link-inline"
                    onClick={() => handleNavigate('calendar')}
                  >
                    calendar
                  </button>{' '}
                  page.
                </h3>
              </div>

              <div className="mvrt-events-grid">
                {/* Col 1: Team Meetings */}
                <div className="mvrt-events-col">
                  <p>Team Meetings:</p>
                  <h3
                    className={`mvrt-inline-editable ${
                      activeTextSel?.styleKey === 'events-meetings-note'
                        ? 'is-active-edit'
                        : ''
                    }`}
                    style={getCustomStyle('events-meetings-note')}
                    onClick={() => {
                      if (!showEditOverlays) return;
                      setActiveTextSel({
                        styleKey: 'events-meetings-note',
                        label: 'Team Meetings Notice',
                        defaultSize: 17,
                        getText: (d) => d.eventsConfig.meetingsNote,
                        setText: (val) =>
                          mutateData((prev) => ({
                            ...prev,
                            eventsConfig: {
                              ...prev.eventsConfig,
                              meetingsNote: val
                            }
                          }))
                      });
                    }}
                  >
                    {data.eventsConfig.meetingsNote}
                  </h3>
                  {teamMeetings.map((ev) => (
                    <div
                      key={ev.id}
                      className="mvrt-event-card"
                      style={{
                        position: 'relative',
                        borderLeftColor: '#2563eb'
                      }}
                    >
                      {showEditOverlays && (
                        <button
                          type="button"
                          className="mvrt-onscreen-pill danger"
                          style={{ position: 'absolute', top: 8, right: 8 }}
                          onClick={() =>
                            mutateData((prev) => ({
                              ...prev,
                              eventsConfig: {
                                ...prev.eventsConfig,
                                items: prev.eventsConfig.items.filter(
                                  (x) => x.id !== ev.id
                                )
                              }
                            }))
                          }
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                      <h1
                        className="mvrt-event-big mvrt-inline-editable"
                        onClick={() => {
                          if (!showEditOverlays) return;
                          setCalEventModal({ isNew: false, draft: { ...ev } });
                        }}
                      >
                        {ev.title}
                      </h1>
                      <h4>{ev.dateText}</h4>
                    </div>
                  ))}
                  {showEditOverlays && (
                    <button
                      type="button"
                      className="mvrt-onscreen-pill"
                      onClick={() =>
                        openAddCalendarEvent(undefined, 'team_meeting')
                      }
                    >
                      <Plus size={13} />
                      <span>Add Meeting</span>
                    </button>
                  )}
                </div>

                {/* Col 2: Team Events */}
                <div className="mvrt-events-col">
                  <p>Team Events:</p>
                  {teamEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="mvrt-event-card"
                      style={{ position: 'relative' }}
                    >
                      {showEditOverlays && (
                        <button
                          type="button"
                          className="mvrt-onscreen-pill danger"
                          style={{ position: 'absolute', top: 8, right: 8 }}
                          onClick={() =>
                            mutateData((prev) => ({
                              ...prev,
                              eventsConfig: {
                                ...prev.eventsConfig,
                                items: prev.eventsConfig.items.filter(
                                  (x) => x.id !== ev.id
                                )
                              }
                            }))
                          }
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                      <h1
                        className={`mvrt-event-big mvrt-inline-editable ${
                          activeTextSel?.styleKey === `ev-title-${ev.id}`
                            ? 'is-active-edit'
                            : ''
                        }`}
                        style={getCustomStyle(`ev-title-${ev.id}`)}
                        onClick={() => {
                          if (!showEditOverlays) return;
                          setActiveTextSel({
                            styleKey: `ev-title-${ev.id}`,
                            label: 'Event Title',
                            defaultSize: 24,
                            getText: (d) =>
                              d.eventsConfig.items.find((x) => x.id === ev.id)
                                ?.title || '',
                            setText: (val) =>
                              mutateData((prev) => ({
                                ...prev,
                                eventsConfig: {
                                  ...prev.eventsConfig,
                                  items: prev.eventsConfig.items.map((x) =>
                                    x.id === ev.id ? { ...x, title: val } : x
                                  )
                                }
                              }))
                          });
                        }}
                      >
                        {ev.title}
                      </h1>
                      <h4
                        className={`mvrt-inline-editable ${
                          activeTextSel?.styleKey === `ev-date-${ev.id}`
                            ? 'is-active-edit'
                            : ''
                        }`}
                        style={getCustomStyle(`ev-date-${ev.id}`)}
                        onClick={() => {
                          if (!showEditOverlays) return;
                          setActiveTextSel({
                            styleKey: `ev-date-${ev.id}`,
                            label: 'Event Date / Time',
                            defaultSize: 16,
                            getText: (d) =>
                              d.eventsConfig.items.find((x) => x.id === ev.id)
                                ?.dateText || '',
                            setText: (val) =>
                              mutateData((prev) => ({
                                ...prev,
                                eventsConfig: {
                                  ...prev.eventsConfig,
                                  items: prev.eventsConfig.items.map((x) =>
                                    x.id === ev.id ? { ...x, dateText: val } : x
                                  )
                                }
                              }))
                          });
                        }}
                      >
                        {ev.dateText}
                      </h4>
                    </div>
                  ))}
                  {showEditOverlays && (
                    <button
                      type="button"
                      className="mvrt-onscreen-pill"
                      onClick={() =>
                        mutateData((prev) => ({
                          ...prev,
                          eventsConfig: {
                            ...prev.eventsConfig,
                            items: [
                              ...prev.eventsConfig.items,
                              {
                                id: `evt-${Date.now()}`,
                                title: 'New Team Event',
                                dateText: 'April 15, 2027',
                                category: 'team_event'
                              }
                            ]
                          }
                        }))
                      }
                    >
                      <Plus size={13} />
                      <span>Add Team Event</span>
                    </button>
                  )}
                </div>

                {/* Col 3: Demos and Outreach */}
                <div className="mvrt-events-col">
                  <p>Demos and Outreach:</p>
                  {demoEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="mvrt-event-card"
                      style={{ position: 'relative' }}
                    >
                      {showEditOverlays && (
                        <button
                          type="button"
                          className="mvrt-onscreen-pill danger"
                          style={{ position: 'absolute', top: 8, right: 8 }}
                          onClick={() =>
                            mutateData((prev) => ({
                              ...prev,
                              eventsConfig: {
                                ...prev.eventsConfig,
                                items: prev.eventsConfig.items.filter(
                                  (x) => x.id !== ev.id
                                )
                              }
                            }))
                          }
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                      <h1
                        className={`mvrt-event-big mvrt-inline-editable ${
                          activeTextSel?.styleKey === `ev-title-${ev.id}`
                            ? 'is-active-edit'
                            : ''
                        }`}
                        style={getCustomStyle(`ev-title-${ev.id}`)}
                        onClick={() => {
                          if (!showEditOverlays) return;
                          setActiveTextSel({
                            styleKey: `ev-title-${ev.id}`,
                            label: 'Demo / Outreach Title',
                            defaultSize: 24,
                            getText: (d) =>
                              d.eventsConfig.items.find((x) => x.id === ev.id)
                                ?.title || '',
                            setText: (val) =>
                              mutateData((prev) => ({
                                ...prev,
                                eventsConfig: {
                                  ...prev.eventsConfig,
                                  items: prev.eventsConfig.items.map((x) =>
                                    x.id === ev.id ? { ...x, title: val } : x
                                  )
                                }
                              }))
                          });
                        }}
                      >
                        {ev.title}
                      </h1>
                      <h4
                        className={`mvrt-inline-editable ${
                          activeTextSel?.styleKey === `ev-date-${ev.id}`
                            ? 'is-active-edit'
                            : ''
                        }`}
                        style={getCustomStyle(`ev-date-${ev.id}`)}
                        onClick={() => {
                          if (!showEditOverlays) return;
                          setActiveTextSel({
                            styleKey: `ev-date-${ev.id}`,
                            label: 'Demo / Outreach Date',
                            defaultSize: 16,
                            getText: (d) =>
                              d.eventsConfig.items.find((x) => x.id === ev.id)
                                ?.dateText || '',
                            setText: (val) =>
                              mutateData((prev) => ({
                                ...prev,
                                eventsConfig: {
                                  ...prev.eventsConfig,
                                  items: prev.eventsConfig.items.map((x) =>
                                    x.id === ev.id ? { ...x, dateText: val } : x
                                  )
                                }
                              }))
                          });
                        }}
                      >
                        {ev.dateText}
                      </h4>
                    </div>
                  ))}
                  {showEditOverlays && (
                    <button
                      type="button"
                      className="mvrt-onscreen-pill"
                      onClick={() =>
                        mutateData((prev) => ({
                          ...prev,
                          eventsConfig: {
                            ...prev.eventsConfig,
                            items: [
                              ...prev.eventsConfig.items,
                              {
                                id: `demo-${Date.now()}`,
                                title: 'New Outreach Demo',
                                dateText: 'May 10, 2027',
                                category: 'demo_outreach'
                              }
                            ]
                          }
                        }))
                      }
                    >
                      <Plus size={13} />
                      <span>Add Demo / Outreach</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Registration CTA Banner (.third-section) */}
          <section className="mvrt-third-section mvrt-editable-region">
            {showEditOverlays && (
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 18,
                  zIndex: 25
                }}
              >
                <button
                  type="button"
                  className="mvrt-onscreen-pill"
                  onClick={() =>
                    mutateData((prev) => ({
                      ...prev,
                      meta: {
                        ...prev.meta,
                        registrationOpen: !prev.meta.registrationOpen
                      }
                    }))
                  }
                >
                  <span>
                    Registration:{' '}
                    {data.meta.registrationOpen ? 'OPEN (Click to Close)' : 'CLOSED (Click to Open)'}
                  </span>
                </button>
              </div>
            )}
            <div className="mvrt-container mvrt-third-row">
              <div className="mvrt-third-copy">
                <h2
                  className={`mvrt-inline-editable ${
                    activeTextSel?.styleKey === 'reg-banner-headline'
                      ? 'is-active-edit'
                      : ''
                  }`}
                  style={getCustomStyle('reg-banner-headline')}
                  onClick={() => {
                    if (!showEditOverlays) return;
                    setActiveTextSel({
                      styleKey: 'reg-banner-headline',
                      label: 'Registration Banner Headline',
                      defaultSize: 34,
                      getText: (d) =>
                        d.meta.registrationOpen
                          ? d.meta.registrationHeadline
                          : d.joinPage.closedSeasonHeading,
                      setText: (val) =>
                        mutateData((prev) =>
                          prev.meta.registrationOpen
                            ? {
                                ...prev,
                                meta: { ...prev.meta, registrationHeadline: val }
                              }
                            : {
                                ...prev,
                                joinPage: {
                                  ...prev.joinPage,
                                  closedSeasonHeading: val
                                }
                              }
                        )
                    });
                  }}
                >
                  {data.meta.registrationOpen
                    ? data.meta.registrationHeadline
                    : data.joinPage.closedSeasonHeading}
                </h2>
                <p
                  className={`mvrt-inline-editable ${
                    activeTextSel?.styleKey === 'reg-banner-subtext'
                      ? 'is-active-edit'
                      : ''
                  }`}
                  style={getCustomStyle('reg-banner-subtext')}
                  onClick={() => {
                    if (!showEditOverlays) return;
                    setActiveTextSel({
                      styleKey: 'reg-banner-subtext',
                      label: 'Registration Banner Subtext',
                      defaultSize: 18,
                      getText: (d) =>
                        d.meta.registrationOpen
                          ? d.meta.registrationSubtext
                          : d.joinPage.closedSeasonBody,
                      setText: (val) =>
                        mutateData((prev) =>
                          prev.meta.registrationOpen
                            ? {
                                ...prev,
                                meta: { ...prev.meta, registrationSubtext: val }
                              }
                            : {
                                ...prev,
                                joinPage: {
                                  ...prev.joinPage,
                                  closedSeasonBody: val
                                }
                              }
                        )
                    });
                  }}
                >
                  {data.meta.registrationOpen
                    ? data.meta.registrationSubtext
                    : data.joinPage.closedSeasonBody}
                </p>
              </div>
              <div className="mvrt-third-action">
                <button
                  type="button"
                  className="mvrt-btn-alt"
                  onClick={() => handleNavigate('join')}
                >
                  <span>Join</span>
                  <ArrowCircleRightIcon size={16} />
                </button>
              </div>
            </div>
          </section>

          {/* Section 4: Our Team At A Glance (.feature-list.section) */}
          <section className="mvrt-section mvrt-editable-region">
            <div className="mvrt-container">
              <div className="mvrt-heading">
                <h2>Our Team At A Glance</h2>
              </div>

              {/* Row 1: Circular Team Photo + Stacked Big Metrics */}
              <div className="mvrt-glance-row">
                <div className="mvrt-glance-col-center">
                  <div
                    className="mvrt-inline-img-wrap"
                    onClick={() =>
                      pickImage(
                        'Team At A Glance Circular Photo',
                        data.glanceStats.teamPhotoUrl,
                        'images',
                        (newUrl) =>
                          mutateData((prev) => ({
                            ...prev,
                            glanceStats: {
                              ...prev.glanceStats,
                              teamPhotoUrl: newUrl
                            }
                          }))
                      )
                    }
                  >
                    <img
                      className={`mvrt-program-images ${
                        showEditOverlays ? 'mvrt-inline-img-clickable' : ''
                      }`}
                      src={resolveAssetUrl(data.glanceStats.teamPhotoUrl)}
                      alt="MVRT Team"
                      onError={(e) => {
                        e.currentTarget.src = createMvrtSvgFallback(
                          'Team 115',
                          `${data.glanceStats.yearsAsTeam} Years of MVRT`
                        );
                      }}
                    />
                    {showEditOverlays && (
                      <span className="mvrt-img-pick-badge">
                        Click to Pick Photo from Assets
                      </span>
                    )}
                  </div>
                </div>
                <div className="mvrt-glance-col-center">
                  <div className="mvrt-glance-metric">
                    <h3>Years As A Team:</h3>
                    <h1
                      className={`mvrt-inline-editable ${
                        activeTextSel?.styleKey === 'stat-years'
                          ? 'is-active-edit'
                          : ''
                      }`}
                      style={getCustomStyle('stat-years')}
                      onClick={() => {
                        if (!showEditOverlays) return;
                        setActiveTextSel({
                          styleKey: 'stat-years',
                          label: 'Years As A Team',
                          defaultSize: 44,
                          getText: (d) => String(d.glanceStats.yearsAsTeam),
                          setText: (val) =>
                            mutateData((prev) => ({
                              ...prev,
                              glanceStats: {
                                ...prev.glanceStats,
                                yearsAsTeam: Number(val) || 29
                              }
                            }))
                        });
                      }}
                    >
                      {data.glanceStats.yearsAsTeam}
                    </h1>
                  </div>
                  <div className="mvrt-glance-metric">
                    <h3>Current Members:</h3>
                    <h1
                      className={`mvrt-inline-editable ${
                        activeTextSel?.styleKey === 'stat-members'
                          ? 'is-active-edit'
                          : ''
                      }`}
                      style={getCustomStyle('stat-members')}
                      onClick={() => {
                        if (!showEditOverlays) return;
                        setActiveTextSel({
                          styleKey: 'stat-members',
                          label: 'Current Members Display',
                          defaultSize: 44,
                          getText: (d) => d.glanceStats.currentMembersDisplay,
                          setText: (val) =>
                            mutateData((prev) => ({
                              ...prev,
                              glanceStats: {
                                ...prev.glanceStats,
                                autoCountMembers: false,
                                currentMembersDisplay: val
                              }
                            }))
                        });
                      }}
                    >
                      {memberCountDisplay}
                    </h1>
                  </div>
                  <div className="mvrt-glance-metric">
                    <h3>Current Mentors:</h3>
                    <h1
                      className={`mvrt-inline-editable ${
                        activeTextSel?.styleKey === 'stat-mentors'
                          ? 'is-active-edit'
                          : ''
                      }`}
                      style={getCustomStyle('stat-mentors')}
                      onClick={() => {
                        if (!showEditOverlays) return;
                        setActiveTextSel({
                          styleKey: 'stat-mentors',
                          label: 'Current Mentors',
                          defaultSize: 44,
                          getText: (d) => String(d.glanceStats.currentMentors),
                          setText: (val) =>
                            mutateData((prev) => ({
                              ...prev,
                              glanceStats: {
                                ...prev.glanceStats,
                                currentMentors: Number(val) || 8
                              }
                            }))
                        });
                      }}
                    >
                      {data.glanceStats.currentMentors}
                    </h1>
                  </div>
                </div>
              </div>

              {/* Row 2: Featured Season Spotlight + Circular Robot Photo */}
              {featuredSeason && (
                <div className="mvrt-glance-row">
                  <div className="mvrt-glance-col-center">
                    <h2 className="mvrt-season-subheading">
                      {featuredSeason.year} Season:
                    </h2>
                    <p
                      className={`mvrt-season-game-italic mvrt-inline-editable ${
                        activeTextSel?.styleKey ===
                        `season-game-${featuredSeason.year}`
                          ? 'is-active-edit'
                          : ''
                      }`}
                      style={getCustomStyle(`season-game-${featuredSeason.year}`)}
                      onClick={() => {
                        if (!showEditOverlays) return;
                        setActiveTextSel({
                          styleKey: `season-game-${featuredSeason.year}`,
                          label: `${featuredSeason.year} Season Game Name`,
                          defaultSize: 25,
                          getText: (d) =>
                            d.seasons.find((s) => s.year === featuredSeason.year)
                              ?.game || '',
                          setText: (val) =>
                            mutateData((prev) => ({
                              ...prev,
                              seasons: prev.seasons.map((s) =>
                                s.year === featuredSeason.year
                                  ? { ...s, game: val }
                                  : s
                              )
                            }))
                        });
                      }}
                    >
                      {featuredSeason.game}
                    </p>

                    <h3 className="mvrt-season-label">Awards:</h3>
                    {featuredSeason.awards.map((award, i) => (
                      <h4
                        key={i}
                        className={`mvrt-season-item mvrt-inline-editable ${
                          activeTextSel?.styleKey ===
                          `season-award-${featuredSeason.year}-${i}`
                            ? 'is-active-edit'
                            : ''
                        }`}
                        style={getCustomStyle(
                          `season-award-${featuredSeason.year}-${i}`
                        )}
                        onClick={() => {
                          if (!showEditOverlays) return;
                          setActiveTextSel({
                            styleKey: `season-award-${featuredSeason.year}-${i}`,
                            label: `Award #${i + 1}`,
                            defaultSize: 20,
                            getText: (d) =>
                              d.seasons.find(
                                (s) => s.year === featuredSeason.year
                              )?.awards[i] || '',
                            setText: (val) =>
                              mutateData((prev) => ({
                                ...prev,
                                seasons: prev.seasons.map((s) =>
                                  s.year === featuredSeason.year
                                    ? {
                                        ...s,
                                        awards: s.awards.map((a, idx) =>
                                          idx === i ? val : a
                                        )
                                      }
                                    : s
                                )
                              }))
                          });
                        }}
                      >
                        {award}
                      </h4>
                    ))}

                    {featuredSeason.robotName && (
                      <>
                        <h3 className="mvrt-season-label">Robot:</h3>
                        <h4
                          className={`mvrt-season-item mvrt-inline-editable ${
                            activeTextSel?.styleKey ===
                            `season-robot-${featuredSeason.year}`
                              ? 'is-active-edit'
                              : ''
                          }`}
                          style={getCustomStyle(
                            `season-robot-${featuredSeason.year}`
                          )}
                          onClick={() => {
                            if (!showEditOverlays) return;
                            setActiveTextSel({
                              styleKey: `season-robot-${featuredSeason.year}`,
                              label: 'Robot Name',
                              defaultSize: 20,
                              getText: (d) =>
                                d.seasons.find(
                                  (s) => s.year === featuredSeason.year
                                )?.robotName || '',
                              setText: (val) =>
                                mutateData((prev) => ({
                                  ...prev,
                                  seasons: prev.seasons.map((s) =>
                                    s.year === featuredSeason.year
                                      ? { ...s, robotName: val }
                                      : s
                                  )
                                }))
                            });
                          }}
                        >
                          {featuredSeason.robotName}
                        </h4>
                      </>
                    )}

                    <div className="mvrt-glance-learn-more">
                      <button
                        type="button"
                        className="mvrt-btn-main"
                        onClick={() => {
                          setAboutTab('robots');
                          handleNavigate('about');
                        }}
                      >
                        <span>Learn More</span>
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="mvrt-glance-col-center">
                    <div
                      className="mvrt-inline-img-wrap"
                      onClick={() =>
                        pickImage(
                          `${featuredSeason.year} Robot Photo`,
                          featuredSeason.robotImage || '',
                          'robot-images',
                          (newUrl) =>
                            mutateData((prev) => ({
                              ...prev,
                              seasons: prev.seasons.map((s) =>
                                s.year === featuredSeason.year
                                  ? { ...s, robotImage: newUrl }
                                  : s
                              )
                            }))
                        )
                      }
                    >
                      <img
                        className={`mvrt-program-images is-robot ${
                          showEditOverlays ? 'mvrt-inline-img-clickable' : ''
                        }`}
                        src={resolveAssetUrl(
                          featuredSeason.robotImage ||
                            data.glanceStats.teamPhotoUrl
                        )}
                        alt={featuredSeason.robotName || 'El Toro Robot'}
                        onError={(e) => {
                          e.currentTarget.src = createMvrtSvgFallback(
                            featuredSeason.robotName || 'El Toro',
                            `${featuredSeason.year} ${featuredSeason.game}`
                          );
                        }}
                      />
                      {showEditOverlays && (
                        <span className="mvrt-img-pick-badge">
                          Click to Pick Robot Photo from Assets
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 5: Subscribe To Our Newsletter (.call-to-action) */}
          <section className="mvrt-call-to-action">
            <div className="mvrt-container">
              <div className="mvrt-cta-block">
                <h2>Subscribe To Our Newsletter</h2>
                <p>
                  Drop us your email below to receive our newsletters about how
                  our team is doing!
                </p>
                <form
                  className="mvrt-cta-input-group"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setNewsletterSubmitted(true);
                  }}
                >
                  <input type="email" placeholder="email address" required />
                  <button type="submit" className="mvrt-btn-main">
                    Subscribe
                  </button>
                </form>
                {newsletterSubmitted && (
                  <p
                    style={{
                      color: '#ffbe1a',
                      marginTop: '14px',
                      fontSize: '15px'
                    }}
                  >
                    Thanks for subscribing!
                  </p>
                )}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ==================== PAGE 2: ABOUT (about.html) ==================== */}
      {activePage === 'about' && (
        <main className="mvrt-editable-region">
          <div className="mvrt-header-secondary">
            <h1 className="mvrt-title">About</h1>
          </div>
          <hr className="mvrt-subpage-hr" />

          <div className="mvrt-information-container">
            <div className="mvrt-tabs" role="tablist">
              {(
                [
                  { id: 'overview', label: 'Overview' },
                  { id: 'first', label: 'About FIRST' },
                  { id: 'history', label: 'Team History' },
                  { id: 'robots', label: 'Past Robots' },
                  { id: 'leadership', label: 'Leadership' },
                  { id: 'members', label: 'Members' },
                  { id: 'mentors', label: 'Mentors' }
                ] as Array<{ id: AboutTabId; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={aboutTab === tab.id}
                  className={`mvrt-tab ${aboutTab === tab.id ? 'active' : ''}`}
                  onClick={() => setAboutTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mvrt-info-content">
              {/* TAB 1: Overview */}
              {aboutTab === 'overview' && (
                <div>
                  <h1>Team Overview</h1>
                  <hr className="mvrt-content-hr" />
                  <h2>History</h2>
                  <p
                    className={`mvrt-inline-editable ${
                      activeTextSel?.styleKey === 'about-history'
                        ? 'is-active-edit'
                        : ''
                    }`}
                    style={getCustomStyle('about-history')}
                    onClick={() => {
                      if (!showEditOverlays) return;
                      setActiveTextSel({
                        styleKey: 'about-history',
                        label: 'History Paragraph',
                        defaultSize: 18,
                        multiline: true,
                        getText: (d) => d.aboutOverview.historyParagraph,
                        setText: (val) =>
                          mutateData((prev) => ({
                            ...prev,
                            aboutOverview: {
                              ...prev.aboutOverview,
                              historyParagraph: val
                            }
                          }))
                      });
                    }}
                  >
                    {data.aboutOverview.historyParagraph}
                  </p>
                  <h2>Mission Statement</h2>
                  <p
                    className={`mvrt-inline-editable ${
                      activeTextSel?.styleKey === 'about-mission'
                        ? 'is-active-edit'
                        : ''
                    }`}
                    style={getCustomStyle('about-mission')}
                    onClick={() => {
                      if (!showEditOverlays) return;
                      setActiveTextSel({
                        styleKey: 'about-mission',
                        label: 'Mission Statement Paragraph',
                        defaultSize: 18,
                        multiline: true,
                        getText: (d) => d.aboutOverview.missionParagraph,
                        setText: (val) =>
                          mutateData((prev) => ({
                            ...prev,
                            aboutOverview: {
                              ...prev.aboutOverview,
                              missionParagraph: val
                            }
                          }))
                      });
                    }}
                  >
                    {data.aboutOverview.missionParagraph}
                  </p>
                  <h2>Team Goals</h2>
                  <ul className="mvrt-goals-list">
                    {data.aboutOverview.goalsList.map((goal, idx) => (
                      <li
                        key={idx}
                        className={`mvrt-inline-editable ${
                          activeTextSel?.styleKey === `about-goal-${idx}`
                            ? 'is-active-edit'
                            : ''
                        }`}
                        style={getCustomStyle(`about-goal-${idx}`)}
                        onClick={() => {
                          if (!showEditOverlays) return;
                          setActiveTextSel({
                            styleKey: `about-goal-${idx}`,
                            label: `Team Goal #${idx + 1}`,
                            defaultSize: 18,
                            getText: (d) =>
                              d.aboutOverview.goalsList[idx] || '',
                            setText: (val) =>
                              mutateData((prev) => ({
                                ...prev,
                                aboutOverview: {
                                  ...prev.aboutOverview,
                                  goalsList: prev.aboutOverview.goalsList.map(
                                    (g, i) => (i === idx ? val : g)
                                  )
                                }
                              }))
                          });
                        }}
                      >
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* TAB 2: About FIRST */}
              {aboutTab === 'first' && (
                <div>
                  <h1>About FIRST</h1>
                  <hr className="mvrt-content-hr" />
                  <h2>What is FIRST?</h2>
                  <p
                    className={`mvrt-inline-editable ${
                      activeTextSel?.styleKey === 'about-first-intro'
                        ? 'is-active-edit'
                        : ''
                    }`}
                    style={getCustomStyle('about-first-intro')}
                    onClick={() => {
                      if (!showEditOverlays) return;
                      setActiveTextSel({
                        styleKey: 'about-first-intro',
                        label: 'What is FIRST?',
                        defaultSize: 18,
                        multiline: true,
                        getText: (d) => d.aboutOverview.firstIntroParagraph,
                        setText: (val) =>
                          mutateData((prev) => ({
                            ...prev,
                            aboutOverview: {
                              ...prev.aboutOverview,
                              firstIntroParagraph: val
                            }
                          }))
                      });
                    }}
                  >
                    {data.aboutOverview.firstIntroParagraph}
                  </p>
                  <h2>FIRST Robotics Competition (FRC)</h2>
                  <p
                    className={`mvrt-inline-editable ${
                      activeTextSel?.styleKey === 'about-frc'
                        ? 'is-active-edit'
                        : ''
                    }`}
                    style={getCustomStyle('about-frc')}
                    onClick={() => {
                      if (!showEditOverlays) return;
                      setActiveTextSel({
                        styleKey: 'about-frc',
                        label: 'FIRST Robotics Competition',
                        defaultSize: 18,
                        multiline: true,
                        getText: (d) => d.aboutOverview.frcParagraph,
                        setText: (val) =>
                          mutateData((prev) => ({
                            ...prev,
                            aboutOverview: {
                              ...prev.aboutOverview,
                              frcParagraph: val
                            }
                          }))
                      });
                    }}
                  >
                    {data.aboutOverview.frcParagraph}
                  </p>
                </div>
              )}

              {/* TAB 3: Team History (Authentic .cd-horizontal-timeline) */}
              {aboutTab === 'history' && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10
                    }}
                  >
                    <h1>Team History</h1>
                    {showEditOverlays && (
                      <button
                        type="button"
                        className="mvrt-onscreen-pill"
                        onClick={() => {
                          const nextYear = (data.seasons[0]?.year || 2026) + 1;
                          mutateData((prev) => ({
                            ...prev,
                            glanceStats: {
                              ...prev.glanceStats,
                              featuredSeasonYear: nextYear,
                              yearsAsTeam: prev.glanceStats.yearsAsTeam + 1
                            },
                            seasons: [
                              {
                                year: nextYear,
                                game: 'NEW FRC GAME',
                                robotName: `El Toro ${nextYear - 1997}`,
                                robotImage:
                                  'https://mvrt.com/assets/images/robot-images/mvrt2026.jpg',
                                teamImage:
                                  'https://mvrt.com/assets/images/team/team-2026-temp.png',
                                showInPastRobots: true,
                                awards: ['New Season Award'],
                                leadership: ['New Season Leadership']
                              },
                              ...prev.seasons
                            ]
                          }));
                          setSelectedTimelineYear(nextYear);
                        }}
                      >
                        <Plus size={13} />
                        <span>
                          Add {(data.seasons[0]?.year || 2026) + 1} Season
                        </span>
                      </button>
                    )}
                  </div>
                  <hr className="mvrt-content-hr" />
                  <p>
                    We pride ourselves in our long and successful history as a
                    team. Here is a glimpse of our past.
                  </p>

                  <div className="mvrt-cd-timeline">
                    <div className="mvrt-timeline-bar">
                      <button
                        type="button"
                        className="mvrt-timeline-nav-btn"
                        disabled={activeTimelineIndex <= 0}
                        onClick={() => {
                          if (activeTimelineIndex > 0) {
                            setSelectedTimelineYear(
                              data.seasons[activeTimelineIndex - 1].year
                            );
                          }
                        }}
                        aria-label="Newer season"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <div
                        className="mvrt-events-wrapper"
                        ref={timelineWrapperRef}
                      >
                        <div
                          className="mvrt-events-line"
                          style={{ width: `${timelineTrackWidth}px` }}
                        >
                          <span
                            className="mvrt-filling-line"
                            style={{ width: `${timelineFillPx}px` }}
                          />
                          {data.seasons.map((season, idx) => {
                            const leftPx = 50 + idx * 84;
                            const isSelected =
                              season.year === selectedTimelineYear;
                            const isOlderEvent = idx < activeTimelineIndex;
                            return (
                              <button
                                key={season.year}
                                type="button"
                                style={{ left: `${leftPx}px` }}
                                className={`mvrt-timeline-year-node ${
                                  isSelected ? 'selected' : ''
                                } ${isOlderEvent ? 'older-event' : ''}`}
                                onClick={() =>
                                  setSelectedTimelineYear(season.year)
                                }
                              >
                                {season.year}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mvrt-timeline-nav-btn"
                        disabled={
                          activeTimelineIndex < 0 ||
                          activeTimelineIndex >= data.seasons.length - 1
                        }
                        onClick={() => {
                          if (activeTimelineIndex < data.seasons.length - 1) {
                            setSelectedTimelineYear(
                              data.seasons[activeTimelineIndex + 1].year
                            );
                          }
                        }}
                        aria-label="Older season"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {activeTimelineSeason && (
                      <div className="mvrt-timeline-event-content">
                        <div className="mvrt-timeline-season-layout">
                          <div>
                            <h2 className="mvrt-timeline-year-heading">
                              {activeTimelineSeason.year}
                            </h2>
                            <em
                              className={`mvrt-timeline-game-em mvrt-inline-editable ${
                                activeTextSel?.styleKey ===
                                `hist-game-${activeTimelineSeason.year}`
                                  ? 'is-active-edit'
                                  : ''
                              }`}
                              style={getCustomStyle(
                                `hist-game-${activeTimelineSeason.year}`
                              )}
                              onClick={() => {
                                if (!showEditOverlays) return;
                                setActiveTextSel({
                                  styleKey: `hist-game-${activeTimelineSeason.year}`,
                                  label: `${activeTimelineSeason.year} Game Title`,
                                  defaultSize: 22,
                                  getText: (d) =>
                                    d.seasons.find(
                                      (s) =>
                                        s.year === activeTimelineSeason.year
                                    )?.game || '',
                                  setText: (val) =>
                                    mutateData((prev) => ({
                                      ...prev,
                                      seasons: prev.seasons.map((s) =>
                                        s.year === activeTimelineSeason.year
                                          ? { ...s, game: val }
                                          : s
                                      )
                                    }))
                                });
                              }}
                            >
                              {activeTimelineSeason.game}
                            </em>

                            <h3 className="mvrt-timeline-subhead">Awards</h3>
                            <ul className="mvrt-timeline-bullet-list">
                              {activeTimelineSeason.awards.map((aw, i) => (
                                <li
                                  key={i}
                                  className={`mvrt-inline-editable ${
                                    activeTextSel?.styleKey ===
                                    `hist-aw-${activeTimelineSeason.year}-${i}`
                                      ? 'is-active-edit'
                                      : ''
                                  }`}
                                  style={getCustomStyle(
                                    `hist-aw-${activeTimelineSeason.year}-${i}`
                                  )}
                                  onClick={() => {
                                    if (!showEditOverlays) return;
                                    setActiveTextSel({
                                      styleKey: `hist-aw-${activeTimelineSeason.year}-${i}`,
                                      label: `Award #${i + 1}`,
                                      defaultSize: 17,
                                      getText: (d) =>
                                        d.seasons.find(
                                          (s) =>
                                            s.year === activeTimelineSeason.year
                                        )?.awards[i] || '',
                                      setText: (val) =>
                                        mutateData((prev) => ({
                                          ...prev,
                                          seasons: prev.seasons.map((s) =>
                                            s.year === activeTimelineSeason.year
                                              ? {
                                                  ...s,
                                                  awards: s.awards.map(
                                                    (a, idx) =>
                                                      idx === i ? val : a
                                                  )
                                                }
                                              : s
                                          )
                                        }))
                                    });
                                  }}
                                >
                                  {aw}
                                </li>
                              ))}
                            </ul>
                            {showEditOverlays && (
                              <button
                                type="button"
                                className="mvrt-onscreen-pill"
                                style={{ marginBottom: 14 }}
                                onClick={() =>
                                  mutateData((prev) => ({
                                    ...prev,
                                    seasons: prev.seasons.map((s) =>
                                      s.year === activeTimelineSeason.year
                                        ? {
                                            ...s,
                                            awards: [...s.awards, 'New Award']
                                          }
                                        : s
                                    )
                                  }))
                                }
                              >
                                <Plus size={12} />
                                <span>Add Award</span>
                              </button>
                            )}

                            <h3 className="mvrt-timeline-subhead">
                              Leadership
                            </h3>
                            <ul className="mvrt-timeline-bullet-list">
                              {activeTimelineSeason.leadership.map((ld, i) => (
                                <li
                                  key={i}
                                  className={`mvrt-inline-editable ${
                                    activeTextSel?.styleKey ===
                                    `hist-ld-${activeTimelineSeason.year}-${i}`
                                      ? 'is-active-edit'
                                      : ''
                                  }`}
                                  style={getCustomStyle(
                                    `hist-ld-${activeTimelineSeason.year}-${i}`
                                  )}
                                  onClick={() => {
                                    if (!showEditOverlays) return;
                                    setActiveTextSel({
                                      styleKey: `hist-ld-${activeTimelineSeason.year}-${i}`,
                                      label: `Leader #${i + 1}`,
                                      defaultSize: 17,
                                      getText: (d) =>
                                        d.seasons.find(
                                          (s) =>
                                            s.year === activeTimelineSeason.year
                                        )?.leadership[i] || '',
                                      setText: (val) =>
                                        mutateData((prev) => ({
                                          ...prev,
                                          seasons: prev.seasons.map((s) =>
                                            s.year === activeTimelineSeason.year
                                              ? {
                                                  ...s,
                                                  leadership: s.leadership.map(
                                                    (l, idx) =>
                                                      idx === i ? val : l
                                                  )
                                                }
                                              : s
                                          )
                                        }))
                                    });
                                  }}
                                >
                                  {ld}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <div
                              className="mvrt-inline-img-wrap"
                              onClick={() =>
                                pickImage(
                                  `${activeTimelineSeason.year} Team Photo`,
                                  activeTimelineSeason.teamImage || '',
                                  'team',
                                  (newUrl) =>
                                    mutateData((prev) => ({
                                      ...prev,
                                      seasons: prev.seasons.map((s) =>
                                        s.year === activeTimelineSeason.year
                                          ? { ...s, teamImage: newUrl }
                                          : s
                                      )
                                    }))
                                )
                              }
                            >
                              <img
                                className={`mvrt-timeline-team-photo ${
                                  showEditOverlays
                                    ? 'mvrt-inline-img-clickable'
                                    : ''
                                }`}
                                src={
                                  activeTimelineSeason.teamImage
                                    ? resolveAssetUrl(
                                        activeTimelineSeason.teamImage
                                      )
                                    : createMvrtSvgFallback(
                                        `MVRT ${activeTimelineSeason.year}`,
                                        activeTimelineSeason.game
                                      )
                                }
                                alt={`MVRT ${activeTimelineSeason.year} Team`}
                                onError={(e) => {
                                  e.currentTarget.src = createMvrtSvgFallback(
                                    `MVRT ${activeTimelineSeason.year}`,
                                    activeTimelineSeason.game
                                  );
                                }}
                              />
                              {showEditOverlays && (
                                <span className="mvrt-img-pick-badge">
                                  Click to Pick Team Photo from Assets
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Past Robots (.bot-card rows) */}
              {aboutTab === 'robots' && (
                <div>
                  <h1>Past Robots</h1>
                  <hr className="mvrt-content-hr" />
                  <p>A look back at our robots throughout the years.</p>

                  <div>
                    {pastRobotsList.map((season) => (
                      <div key={season.year} className="mvrt-bot-card">
                        <div className="mvrt-bot-card-info">
                          <div className="mvrt-bot-card-year">
                            {season.year} Season:
                          </div>
                          <span
                            className={`mvrt-bot-card-game mvrt-inline-editable ${
                              activeTextSel?.styleKey ===
                              `bot-game-${season.year}`
                                ? 'is-active-edit'
                                : ''
                            }`}
                            style={getCustomStyle(`bot-game-${season.year}`)}
                            onClick={() => {
                              if (!showEditOverlays) return;
                              setActiveTextSel({
                                styleKey: `bot-game-${season.year}`,
                                label: `${season.year} Game Name`,
                                defaultSize: 26,
                                getText: (d) =>
                                  d.seasons.find((s) => s.year === season.year)
                                    ?.game || '',
                                setText: (val) =>
                                  mutateData((prev) => ({
                                    ...prev,
                                    seasons: prev.seasons.map((s) =>
                                      s.year === season.year
                                        ? { ...s, game: val }
                                        : s
                                    )
                                  }))
                              });
                            }}
                          >
                            {season.game}
                          </span>
                          <div className="mvrt-bot-card-label">Robot:</div>
                          <div
                            className={`mvrt-bot-card-name mvrt-inline-editable ${
                              activeTextSel?.styleKey ===
                              `bot-name-${season.year}`
                                ? 'is-active-edit'
                                : ''
                            }`}
                            style={getCustomStyle(`bot-name-${season.year}`)}
                            onClick={() => {
                              if (!showEditOverlays) return;
                              setActiveTextSel({
                                styleKey: `bot-name-${season.year}`,
                                label: `${season.year} Robot Name`,
                                defaultSize: 20,
                                getText: (d) =>
                                  d.seasons.find((s) => s.year === season.year)
                                    ?.robotName || '',
                                setText: (val) =>
                                  mutateData((prev) => ({
                                    ...prev,
                                    seasons: prev.seasons.map((s) =>
                                      s.year === season.year
                                        ? { ...s, robotName: val }
                                        : s
                                    )
                                  })),
                                linkLabel: 'Technical Binder PDF',
                                getLink: (d) =>
                                  d.seasons.find((s) => s.year === season.year)
                                    ?.technicalBinderUrl || '',
                                setLink: (url) =>
                                  mutateData((prev) => ({
                                    ...prev,
                                    seasons: prev.seasons.map((s) =>
                                      s.year === season.year
                                        ? { ...s, technicalBinderUrl: url }
                                        : s
                                    )
                                  })),
                                linkAssetAccept: 'pdf',
                                linkFolderHint: 'files'
                              });
                            }}
                          >
                            {season.robotName || 'El Toro'}
                          </div>
                          {season.technicalBinderUrl && (
                            <a
                              className="mvrt-bot-card-binder"
                              href={resolveAssetUrl(season.technicalBinderUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                if (showEditOverlays) {
                                  e.preventDefault();
                                  pickPdf(
                                    `${season.year} Technical Binder PDF`,
                                    season.technicalBinderUrl || '',
                                    'files',
                                    (newPdf) =>
                                      mutateData((prev) => ({
                                        ...prev,
                                        seasons: prev.seasons.map((s) =>
                                          s.year === season.year
                                            ? {
                                                ...s,
                                                technicalBinderUrl: newPdf
                                              }
                                            : s
                                        )
                                      }))
                                  );
                                }
                              }}
                            >
                              Technical Binder
                            </a>
                          )}
                          {showEditOverlays && !season.technicalBinderUrl && (
                            <div style={{ marginTop: 10 }}>
                              <button
                                type="button"
                                className="mvrt-onscreen-pill"
                                onClick={() =>
                                  pickPdf(
                                    `${season.year} Technical Binder PDF`,
                                    '',
                                    'files',
                                    (newPdf) =>
                                      mutateData((prev) => ({
                                        ...prev,
                                        seasons: prev.seasons.map((s) =>
                                          s.year === season.year
                                            ? {
                                                ...s,
                                                technicalBinderUrl: newPdf
                                              }
                                            : s
                                        )
                                      }))
                                  )
                                }
                              >
                                <FolderOpen size={12} />
                                <span>Attach Binder PDF from Assets</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="mvrt-bot-card-image">
                          <div
                            className="mvrt-inline-img-wrap"
                            onClick={() =>
                              pickImage(
                                `${season.year} Robot Photo`,
                                season.robotImage || '',
                                'robot-images',
                                (newUrl) =>
                                  mutateData((prev) => ({
                                    ...prev,
                                    seasons: prev.seasons.map((s) =>
                                      s.year === season.year
                                        ? { ...s, robotImage: newUrl }
                                        : s
                                    )
                                  }))
                              )
                            }
                          >
                            <img
                              className={
                                showEditOverlays
                                  ? 'mvrt-inline-img-clickable'
                                  : ''
                              }
                              src={
                                season.robotImage
                                  ? resolveAssetUrl(season.robotImage)
                                  : createMvrtSvgFallback(
                                      season.robotName ||
                                        `El Toro ${season.year}`,
                                      season.game
                                    )
                              }
                              alt={season.robotName || 'MVRT Robot'}
                              onError={(e) => {
                                e.currentTarget.src = createMvrtSvgFallback(
                                  season.robotName || `El Toro ${season.year}`,
                                  season.game
                                );
                              }}
                            />
                            {showEditOverlays && (
                              <span className="mvrt-img-pick-badge">
                                Click to Pick Robot Photo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: Leadership (.team & .profile-box) */}
              {aboutTab === 'leadership' && (
                <div className="mvrt-team-section">
                  <h1>Leadership</h1>
                  <hr className="mvrt-content-hr" />
                  {(
                    [
                      'President',
                      'Vice Presidents',
                      'Engineering Directors',
                      'Operations Directors'
                    ] as const
                  ).map((tier) => {
                    const tierLeaders = data.leadership.filter(
                      (l) => l.tier === tier
                    );
                    if (tierLeaders.length === 0 && !showEditOverlays)
                      return null;
                    return (
                      <div key={tier}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12
                          }}
                        >
                          <h2 className="mvrt-tier-heading">{tier}</h2>
                          {showEditOverlays && (
                            <button
                              type="button"
                              className="mvrt-onscreen-pill"
                              onClick={() =>
                                mutateData((prev) => ({
                                  ...prev,
                                  leadership: [
                                    ...prev.leadership,
                                    {
                                      id: `lead-${Date.now()}`,
                                      name: 'New Officer',
                                      role: tier.replace(/s$/, ''),
                                      tier,
                                      email: 'mvrt@mvrt.com',
                                      imageUrl:
                                        'assets/images/officers/2027/anna.jpg'
                                    }
                                  ]
                                }))
                              }
                            >
                              <Plus size={12} />
                              <span>Add to {tier}</span>
                            </button>
                          )}
                        </div>
                        <div className="mvrt-leadership-row">
                          {tierLeaders.map((leader) => (
                            <LeaderProfileCard
                              key={leader.id}
                              leader={leader}
                              resolvedImageUrl={resolveAssetUrl(
                                leader.imageUrl
                              )}
                              editMode={showEditOverlays}
                              activeKey={activeTextSel?.styleKey}
                              nameStyle={getCustomStyle(
                                `leader-name-${leader.id}`
                              )}
                              roleStyle={getCustomStyle(
                                `leader-role-${leader.id}`
                              )}
                              onPickPhoto={() =>
                                pickImage(
                                  `${leader.name} Portrait`,
                                  leader.imageUrl,
                                  'officers',
                                  (newUrl) =>
                                    mutateData((prev) => ({
                                      ...prev,
                                      leadership: prev.leadership.map((l) =>
                                        l.id === leader.id
                                          ? { ...l, imageUrl: newUrl }
                                          : l
                                      )
                                    }))
                                )
                              }
                              onClickName={() =>
                                setActiveTextSel({
                                  styleKey: `leader-name-${leader.id}`,
                                  label: 'Officer Name & Email',
                                  defaultSize: 20,
                                  getText: (d) =>
                                    d.leadership.find((l) => l.id === leader.id)
                                      ?.name || '',
                                  setText: (val) =>
                                    mutateData((prev) => ({
                                      ...prev,
                                      leadership: prev.leadership.map((l) =>
                                        l.id === leader.id
                                          ? { ...l, name: val }
                                          : l
                                      )
                                    })),
                                  linkLabel: 'Officer Email',
                                  getLink: (d) =>
                                    d.leadership.find((l) => l.id === leader.id)
                                      ?.email || '',
                                  setLink: (email) =>
                                    mutateData((prev) => ({
                                      ...prev,
                                      leadership: prev.leadership.map((l) =>
                                        l.id === leader.id
                                          ? { ...l, email }
                                          : l
                                      )
                                    }))
                                })
                              }
                              onClickRole={() =>
                                setActiveTextSel({
                                  styleKey: `leader-role-${leader.id}`,
                                  label: 'Officer Role Title',
                                  defaultSize: 16,
                                  getText: (d) =>
                                    d.leadership.find((l) => l.id === leader.id)
                                      ?.role || '',
                                  setText: (val) =>
                                    mutateData((prev) => ({
                                      ...prev,
                                      leadership: prev.leadership.map((l) =>
                                        l.id === leader.id
                                          ? { ...l, role: val }
                                          : l
                                      )
                                    }))
                                })
                              }
                              onDelete={() =>
                                mutateData((prev) => ({
                                  ...prev,
                                  leadership: prev.leadership.filter(
                                    (l) => l.id !== leader.id
                                  )
                                }))
                              }
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 6: Members */}
              {aboutTab === 'members' && (
                <div>
                  <div className="mvrt-members-header-row">
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <h1>Members</h1>
                      {showEditOverlays && (
                        <button
                          type="button"
                          className="mvrt-onscreen-pill"
                          onClick={() => {
                            setBulkMembersDraft(data.members.join('\n'));
                            setShowBulkMembersModal(true);
                          }}
                        >
                          <Plus size={12} />
                          <span>Edit / Paste Members List</span>
                        </button>
                      )}
                    </div>
                    <div className="mvrt-member-search">
                      <Search size={14} color="#662d91" />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder={`Filter ${data.members.length} members...`}
                      />
                    </div>
                  </div>
                  <hr className="mvrt-content-hr" />
                  <ul className="mvrt-memberlist">
                    {sortedFilteredMembers.map((member, idx) => (
                      <li key={idx}>{member}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* TAB 7: Mentors */}
              {aboutTab === 'mentors' && (
                <div>
                  <h1>Mentors</h1>
                  <hr className="mvrt-content-hr" />
                  <p
                    className={`mvrt-inline-editable ${
                      activeTextSel?.styleKey === 'mentors-intro'
                        ? 'is-active-edit'
                        : ''
                    }`}
                    style={getCustomStyle('mentors-intro')}
                    onClick={() => {
                      if (!showEditOverlays) return;
                      setActiveTextSel({
                        styleKey: 'mentors-intro',
                        label: 'Mentors Intro Text',
                        defaultSize: 18,
                        multiline: true,
                        getText: (d) => d.mentors.introText,
                        setText: (val) =>
                          mutateData((prev) => ({
                            ...prev,
                            mentors: { ...prev.mentors, introText: val }
                          }))
                      });
                    }}
                  >
                    {data.mentors.introText}
                  </p>

                  <h2 className="mvrt-mentor-tier-title">Head Mentors</h2>
                  <ul className="mvrt-memberlist">
                    {data.mentors.headMentors.map((m, i) => (
                      <li
                        key={i}
                        className="mvrt-inline-editable"
                        onClick={() => {
                          if (!showEditOverlays) return;
                          setActiveTextSel({
                            styleKey: `head-mentor-${i}`,
                            label: 'Head Mentor Name',
                            defaultSize: 18,
                            getText: (d) => d.mentors.headMentors[i] || '',
                            setText: (val) =>
                              mutateData((prev) => ({
                                ...prev,
                                mentors: {
                                  ...prev.mentors,
                                  headMentors: prev.mentors.headMentors.map(
                                    (x, idx) => (idx === i ? val : x)
                                  )
                                }
                              }))
                          });
                        }}
                      >
                        {m}
                      </li>
                    ))}
                  </ul>

                  <h2 className="mvrt-mentor-tier-title">Current Mentors</h2>
                  <ul className="mvrt-memberlist">
                    {data.mentors.currentMentors.map((m, i) => (
                      <li
                        key={i}
                        className="mvrt-inline-editable"
                        onClick={() => {
                          if (!showEditOverlays) return;
                          setActiveTextSel({
                            styleKey: `cur-mentor-${i}`,
                            label: 'Current Mentor Name',
                            defaultSize: 18,
                            getText: (d) => d.mentors.currentMentors[i] || '',
                            setText: (val) =>
                              mutateData((prev) => ({
                                ...prev,
                                mentors: {
                                  ...prev.mentors,
                                  currentMentors:
                                    prev.mentors.currentMentors.map((x, idx) =>
                                      idx === i ? val : x
                                    )
                                }
                              }))
                          });
                        }}
                      >
                        {m}
                      </li>
                    ))}
                  </ul>

                  <h2 className="mvrt-mentor-tier-title">Past Mentors</h2>
                  <ul className="mvrt-memberlist">
                    {data.mentors.pastMentors.map((m, i) => (
                      <li
                        key={i}
                        className="mvrt-inline-editable"
                        onClick={() => {
                          if (!showEditOverlays) return;
                          setActiveTextSel({
                            styleKey: `past-mentor-${i}`,
                            label: 'Past Mentor Name',
                            defaultSize: 18,
                            getText: (d) => d.mentors.pastMentors[i] || '',
                            setText: (val) =>
                              mutateData((prev) => ({
                                ...prev,
                                mentors: {
                                  ...prev.mentors,
                                  pastMentors: prev.mentors.pastMentors.map(
                                    (x, idx) => (idx === i ? val : x)
                                  )
                                }
                              }))
                          });
                        }}
                      >
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ==================== PAGE 3: OUTREACH (outreach.html) ==================== */}
      {activePage === 'outreach' && (
        <main className="mvrt-editable-region">
          <div className="mvrt-header-secondary">
            <h1 className="mvrt-title">Outreach</h1>
          </div>
          <hr className="mvrt-subpage-hr" />

          {showEditOverlays && (
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <button
                type="button"
                className="mvrt-onscreen-pill"
                onClick={() =>
                  mutateData((prev) => ({
                    ...prev,
                    outreach: [
                      {
                        id: `out-${Date.now()}`,
                        title: 'New Outreach Program',
                        description:
                          'Click this paragraph to describe your outreach workshop and adjust font size.',
                        imageUrl: 'assets/images/programs/stem4kids.jpg'
                      },
                      ...prev.outreach
                    ]
                  }))
                }
              >
                <Plus size={13} />
                <span>Add Outreach Program Card</span>
              </button>
            </div>
          )}

          <ul className="mvrt-programs-list">
            {data.outreach.map((prog, idx) => {
              const floatClass = idx % 2 === 0 ? 'float-left' : 'float-right';
              const hasButtons =
                Boolean(prog.primaryButtonText) ||
                Boolean(prog.secondaryButtonText);
              return (
                <li
                  key={prog.id}
                  className={`mvrt-program-item ${floatClass}`}
                  style={{ position: 'relative' }}
                >
                  {showEditOverlays && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 14,
                        display: 'flex',
                        gap: 6,
                        zIndex: 20
                      }}
                    >
                      <button
                        type="button"
                        className="mvrt-onscreen-pill"
                        disabled={idx === 0}
                        onClick={() =>
                          mutateData((prev) => {
                            const arr = [...prev.outreach];
                            if (idx > 0) {
                              [arr[idx - 1], arr[idx]] = [
                                arr[idx],
                                arr[idx - 1]
                              ];
                            }
                            return { ...prev, outreach: arr };
                          })
                        }
                        title="Move Up"
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        type="button"
                        className="mvrt-onscreen-pill"
                        disabled={idx === data.outreach.length - 1}
                        onClick={() =>
                          mutateData((prev) => {
                            const arr = [...prev.outreach];
                            if (idx < arr.length - 1) {
                              [arr[idx + 1], arr[idx]] = [
                                arr[idx],
                                arr[idx + 1]
                              ];
                            }
                            return { ...prev, outreach: arr };
                          })
                        }
                        title="Move Down"
                      >
                        <ArrowDown size={11} />
                      </button>
                      <button
                        type="button"
                        className="mvrt-onscreen-pill danger"
                        onClick={() =>
                          mutateData((prev) => ({
                            ...prev,
                            outreach: prev.outreach.filter(
                              (p) => p.id !== prog.id
                            )
                          }))
                        }
                        title="Delete Program"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}

                  <div
                    className="mvrt-program-image-wrap mvrt-inline-img-wrap"
                    onClick={() =>
                      pickImage(
                        `${prog.title} Outreach Photo`,
                        prog.imageUrl,
                        'programs',
                        (newUrl) =>
                          mutateData((prev) => ({
                            ...prev,
                            outreach: prev.outreach.map((p) =>
                              p.id === prog.id ? { ...p, imageUrl: newUrl } : p
                            )
                          }))
                      )
                    }
                  >
                    <img
                      className={
                        showEditOverlays ? 'mvrt-inline-img-clickable' : ''
                      }
                      src={resolveAssetUrl(prog.imageUrl)}
                      alt={prog.title}
                      onError={(e) => {
                        e.currentTarget.src = createMvrtSvgFallback(
                          prog.title,
                          'MVRT Community Outreach'
                        );
                      }}
                    />
                    {showEditOverlays && (
                      <span className="mvrt-img-pick-badge">
                        Click to Pick Photo from Assets
                      </span>
                    )}
                  </div>
                  <div className="mvrt-program-text">
                    <h2
                      className={`mvrt-inline-editable ${
                        activeTextSel?.styleKey === `out-title-${prog.id}`
                          ? 'is-active-edit'
                          : ''
                      }`}
                      style={getCustomStyle(`out-title-${prog.id}`)}
                      onClick={() => {
                        if (!showEditOverlays) return;
                        setActiveTextSel({
                          styleKey: `out-title-${prog.id}`,
                          label: 'Outreach Program Title',
                          defaultSize: 30,
                          getText: (d) =>
                            d.outreach.find((p) => p.id === prog.id)?.title ||
                            '',
                          setText: (val) =>
                            mutateData((prev) => ({
                              ...prev,
                              outreach: prev.outreach.map((p) =>
                                p.id === prog.id ? { ...p, title: val } : p
                              )
                            }))
                        });
                      }}
                    >
                      {prog.title}
                      {prog.partnerLogoUrl && (
                        <span className="polygence-mini-logo">
                          <img
                            src={resolveAssetUrl(prog.partnerLogoUrl)}
                            alt="Partner Logo"
                          />
                        </span>
                      )}
                    </h2>
                    <p
                      className={`mvrt-inline-editable ${
                        activeTextSel?.styleKey === `out-desc-${prog.id}`
                          ? 'is-active-edit'
                          : ''
                      }`}
                      style={getCustomStyle(`out-desc-${prog.id}`)}
                      onClick={() => {
                        if (!showEditOverlays) return;
                        setActiveTextSel({
                          styleKey: `out-desc-${prog.id}`,
                          label: 'Outreach Program Description',
                          defaultSize: 18,
                          multiline: true,
                          getText: (d) =>
                            d.outreach.find((p) => p.id === prog.id)
                              ?.description || '',
                          setText: (val) =>
                            mutateData((prev) => ({
                              ...prev,
                              outreach: prev.outreach.map((p) =>
                                p.id === prog.id
                                  ? { ...p, description: val }
                                  : p
                              )
                            }))
                        });
                      }}
                    >
                      {prog.description}
                    </p>
                  </div>
                  {hasButtons && (
                    <div className="mvrt-program-links">
                      {prog.primaryButtonText && (
                        <a
                          href={prog.primaryButtonUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mvrt-join-btn"
                        >
                          {prog.primaryButtonText}
                        </a>
                      )}
                      {prog.secondaryButtonText && (
                        <a
                          href={prog.secondaryButtonUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mvrt-resources-btn"
                        >
                          {prog.secondaryButtonText}
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </main>
      )}

      {/* ==================== PAGE 4: CALENDAR (calendar.html) ==================== */}
      {activePage === 'calendar' && (
        <main className="mvrt-editable-region">
          <div className="mvrt-header-secondary">
            <h1 className="mvrt-title">Calendar</h1>
          </div>
          <hr className="mvrt-subpage-hr" />

          <div className="mvrt-information-container">
            <div className="mvrt-info-content">
              <div className="mvrt-cal-toolbar">
                <h1 style={{ margin: 0 }}>Calendar</h1>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap'
                  }}
                >
                  <div className="mvrt-cal-view-switch">
                    <button
                      type="button"
                      className={`mvrt-cal-view-btn ${
                        calendarViewMode === 'interactive' ? 'active' : ''
                      }`}
                      onClick={() => setCalendarViewMode('interactive')}
                    >
                      Interactive Calendar
                    </button>
                    <button
                      type="button"
                      className={`mvrt-cal-view-btn ${
                        calendarViewMode === 'google' ? 'active' : ''
                      }`}
                      onClick={() => setCalendarViewMode('google')}
                    >
                      Google Calendar
                    </button>
                  </div>

                  {showEditOverlays && (
                    <button
                      type="button"
                      className="mvrt-onscreen-pill"
                      onClick={() => openAddCalendarEvent()}
                    >
                      <Plus size={13} />
                      <span>Add Event to Calendar</span>
                    </button>
                  )}

                  {showEditOverlays && calendarViewMode === 'google' && (
                    <button
                      type="button"
                      className="mvrt-onscreen-pill"
                      onClick={() =>
                        setActiveTextSel({
                          styleKey: 'calendar-embed-url',
                          label: 'Google Calendar Embed Iframe URL',
                          defaultSize: 16,
                          getText: (d) => d.meta.calendarEmbedUrl,
                          setText: (val) =>
                            mutateData((prev) => ({
                              ...prev,
                              meta: { ...prev.meta, calendarEmbedUrl: val }
                            }))
                        })
                      }
                    >
                      <Link2 size={12} />
                      <span>Edit Embed URL</span>
                    </button>
                  )}
                </div>
              </div>

              <hr className="mvrt-content-hr" />
              <p>
                If you have any questions about upcoming events, or something
                doesn&apos;t look quite right, please{' '}
                <button
                  type="button"
                  className="mvrt-link-inline"
                  onClick={() => handleNavigate('contact')}
                >
                  let us know
                </button>
                !{' '}
                {showEditOverlays && calendarViewMode === 'interactive'
                  ? 'Click any date cell below to add an event, or click an event pill to edit it.'
                  : 'The calendar is best viewed on a computer.'}
              </p>

              {calendarViewMode === 'interactive' ? (
                <div>
                  {/* Month Navigation Bar */}
                  <div className="mvrt-cal-month-bar">
                    <div className="mvrt-cal-nav-group">
                      <button
                        type="button"
                        className="mvrt-cal-nav-btn"
                        onClick={() => {
                          if (calMonth === 0) {
                            setCalMonth(11);
                            setCalYear((y) => y - 1);
                          } else {
                            setCalMonth((m) => m - 1);
                          }
                        }}
                      >
                        <ChevronLeft size={15} />
                        <span>Prev</span>
                      </button>
                      <button
                        type="button"
                        className="mvrt-cal-nav-btn"
                        onClick={() => {
                          const now = new Date();
                          setCalYear(now.getFullYear());
                          setCalMonth(now.getMonth());
                        }}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        className="mvrt-cal-nav-btn"
                        onClick={() => {
                          if (calMonth === 11) {
                            setCalMonth(0);
                            setCalYear((y) => y + 1);
                          } else {
                            setCalMonth((m) => m + 1);
                          }
                        }}
                      >
                        <span>Next</span>
                        <ChevronRight size={15} />
                      </button>
                    </div>

                    <h2 className="mvrt-cal-month-title">
                      {new Date(calYear, calMonth, 1).toLocaleString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </h2>

                    <div className="mvrt-cal-nav-group">
                      {data.eventsConfig.items
                        .filter((e) => e.isoDate)
                        .slice(0, 3)
                        .map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            className="mvrt-cal-nav-btn"
                            style={{ fontSize: 12, padding: '5px 10px' }}
                            onClick={() => {
                              if (!ev.isoDate) return;
                              setCalYear(Number(ev.isoDate.slice(0, 4)));
                              setCalMonth(Number(ev.isoDate.slice(5, 7)) - 1);
                            }}
                          >
                            {ev.title}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* 7-Column Monthly Grid */}
                  <div className="mvrt-cal-grid">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                      (day) => (
                        <div key={day} className="mvrt-cal-weekday">
                          {day}
                        </div>
                      )
                    )}
                    {calendarGridCells.map((cell) => {
                      const todayIso = new Date().toISOString().slice(0, 10);
                      const isToday = cell.iso === todayIso;
                      return (
                        <div
                          key={cell.iso}
                          className={`mvrt-cal-day ${
                            cell.isOutside ? 'is-outside' : ''
                          } ${isToday ? 'is-today' : ''}`}
                          onClick={() => {
                            if (showEditOverlays) {
                              openAddCalendarEvent(cell.iso, 'team_event');
                            }
                          }}
                        >
                          <div className="mvrt-cal-day-header">
                            <span className="mvrt-cal-day-num">
                              {cell.dayNum}
                            </span>
                            {showEditOverlays && (
                              <span
                                className="mvrt-cal-day-add-hint"
                                title={`Add event on ${cell.iso}`}
                              >
                                +
                              </span>
                            )}
                          </div>
                          {cell.events.map((ev) => (
                            <button
                              key={ev.id}
                              type="button"
                              className={`mvrt-cal-event-pill cat-${ev.category}`}
                              title={`${ev.title} — ${ev.dateText}${
                                ev.location ? ` (${ev.location})` : ''
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (showEditOverlays) {
                                  setCalEventModal({
                                    isNew: false,
                                    draft: { ...ev }
                                  });
                                }
                              }}
                            >
                              {ev.title}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mvrt-cal-legend">
                    <span className="mvrt-cal-legend-item">
                      <span
                        className="mvrt-cal-legend-dot"
                        style={{ background: '#662d91' }}
                      />
                      Team Event / Competition
                    </span>
                    <span className="mvrt-cal-legend-item">
                      <span
                        className="mvrt-cal-legend-dot"
                        style={{ background: '#2563eb' }}
                      />
                      Team Meeting
                    </span>
                    <span className="mvrt-cal-legend-item">
                      <span
                        className="mvrt-cal-legend-dot"
                        style={{ background: '#059669' }}
                      />
                      Demo &amp; Outreach
                    </span>
                  </div>

                  {/* All Scheduled Events List */}
                  <div style={{ marginTop: 28 }}>
                    <h2 style={{ fontSize: 22, marginBottom: 14 }}>
                      All Scheduled Events ({data.eventsConfig.items.length})
                    </h2>
                    <div className="mvrt-events-grid">
                      {data.eventsConfig.items.map((ev) => (
                        <div
                          key={ev.id}
                          className="mvrt-event-card"
                          style={{
                            position: 'relative',
                            cursor: showEditOverlays ? 'pointer' : 'default',
                            borderLeftColor:
                              ev.category === 'team_meeting'
                                ? '#2563eb'
                                : ev.category === 'demo_outreach'
                                  ? '#059669'
                                  : '#662d91'
                          }}
                          onClick={() => {
                            if (showEditOverlays) {
                              setCalEventModal({
                                isNew: false,
                                draft: { ...ev }
                              });
                            }
                          }}
                        >
                          {showEditOverlays && (
                            <button
                              type="button"
                              className="mvrt-onscreen-pill danger"
                              style={{ position: 'absolute', top: 8, right: 8 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                mutateData((prev) => ({
                                  ...prev,
                                  eventsConfig: {
                                    ...prev.eventsConfig,
                                    items: prev.eventsConfig.items.filter(
                                      (x) => x.id !== ev.id
                                    )
                                  }
                                }));
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                          <h1 className="mvrt-event-big">{ev.title}</h1>
                          <h4>{ev.dateText}</h4>
                          {ev.location && (
                            <p
                              style={{
                                margin: '6px 0 0',
                                fontSize: 14,
                                color: '#666'
                              }}
                            >
                              {ev.location}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Embedded Google Calendar Iframe */
                <div className="mvrt-calendar-aspect aspect4by3 calendar-embed-wrapper">
                  <iframe
                    src={data.meta.calendarEmbedUrl}
                    width="100%"
                    height="650"
                    frameBorder="0"
                    scrolling="no"
                    title="Monta Vista Robotics Team 115 Google Calendar"
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ==================== PAGE 5: RESOURCES (resources.html) ==================== */}
      {activePage === 'resources' && (
        <main className="mvrt-editable-region">
          <div className="mvrt-header-secondary">
            <h1 className="mvrt-title">Resources</h1>
          </div>
          <hr className="mvrt-subpage-hr" />

          <div className="mvrt-resources-container">
            {data.resources.map((div) => (
              <div key={div.id} className="mvrt-resource-division">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 12
                  }}
                >
                  <h1
                    className="mvrt-resource-division-title"
                    style={{ margin: 0 }}
                  >
                    {div.division}
                  </h1>
                  {showEditOverlays && (
                    <>
                      <button
                        type="button"
                        className="mvrt-onscreen-pill"
                        onClick={() =>
                          mutateData((prev) => ({
                            ...prev,
                            resources: prev.resources.map((r) =>
                              r.id === div.id
                                ? {
                                    ...r,
                                    comingSoon: false,
                                    items: [
                                      ...r.items,
                                      {
                                        id: `res-${Date.now()}`,
                                        title: 'New Training Slide Deck',
                                        url: 'https://mvrt.com/resources.html',
                                        thumbnailUrl:
                                          'assets/images/resources/blank.png'
                                      }
                                    ]
                                  }
                                : r
                            )
                          }))
                        }
                      >
                        <Plus size={12} />
                        <span>Add {div.division} Resource</span>
                      </button>
                      <button
                        type="button"
                        className="mvrt-onscreen-pill"
                        onClick={() =>
                          mutateData((prev) => ({
                            ...prev,
                            resources: prev.resources.map((r) =>
                              r.id === div.id
                                ? { ...r, comingSoon: !r.comingSoon }
                                : r
                            )
                          }))
                        }
                      >
                        <span>
                          {div.comingSoon
                            ? 'Show Items'
                            : 'Set Coming Soon'}
                        </span>
                      </button>
                    </>
                  )}
                </div>

                {div.comingSoon || div.items.length === 0 ? (
                  <div className="mvrt-resource-card">
                    <h3>Coming Soon</h3>
                  </div>
                ) : (
                  <div className="mvrt-resource-list">
                    {div.items.map((item) => (
                      <div
                        key={item.id}
                        className="mvrt-resource-row"
                        style={{ position: 'relative' }}
                      >
                        {showEditOverlays && (
                          <button
                            type="button"
                            className="mvrt-onscreen-pill danger"
                            style={{ position: 'absolute', top: 10, right: 10 }}
                            onClick={() =>
                              mutateData((prev) => ({
                                ...prev,
                                resources: prev.resources.map((r) =>
                                  r.id === div.id
                                    ? {
                                        ...r,
                                        items: r.items.filter(
                                          (x) => x.id !== item.id
                                        )
                                      }
                                    : r
                                )
                              }))
                            }
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                        <div
                          className="mvrt-resource-thumb mvrt-inline-img-wrap"
                          onClick={() =>
                            pickImage(
                              `${item.title} Thumbnail`,
                              item.thumbnailUrl,
                              'resources',
                              (newUrl) =>
                                mutateData((prev) => ({
                                  ...prev,
                                  resources: prev.resources.map((r) =>
                                    r.id === div.id
                                      ? {
                                          ...r,
                                          items: r.items.map((x) =>
                                            x.id === item.id
                                              ? { ...x, thumbnailUrl: newUrl }
                                              : x
                                          )
                                        }
                                      : r
                                  )
                                }))
                            )
                          }
                        >
                          <img
                            className={
                              showEditOverlays
                                ? 'mvrt-inline-img-clickable'
                                : ''
                            }
                            src={resolveAssetUrl(item.thumbnailUrl)}
                            alt={item.title}
                            onError={(e) => {
                              e.currentTarget.src = createMvrtSvgFallback(
                                div.division,
                                item.badge || item.title
                              );
                            }}
                          />
                          {showEditOverlays && (
                            <span className="mvrt-img-pick-badge">
                              Pick Thumbnail
                            </span>
                          )}
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mvrt-resource-card"
                          onClick={(e) => {
                            if (showEditOverlays) {
                              e.preventDefault();
                              setActiveTextSel({
                                styleKey: `res-title-${item.id}`,
                                label: 'Resource Title & Slide URL',
                                defaultSize: 22,
                                getText: (d) =>
                                  d.resources
                                    .find((r) => r.id === div.id)
                                    ?.items.find((x) => x.id === item.id)
                                    ?.title || '',
                                setText: (val) =>
                                  mutateData((prev) => ({
                                    ...prev,
                                    resources: prev.resources.map((r) =>
                                      r.id === div.id
                                        ? {
                                            ...r,
                                            items: r.items.map((x) =>
                                              x.id === item.id
                                                ? { ...x, title: val }
                                                : x
                                            )
                                          }
                                        : r
                                    )
                                  })),
                                linkLabel: 'Google Slides / Doc / Video Link',
                                getLink: (d) =>
                                  d.resources
                                    .find((r) => r.id === div.id)
                                    ?.items.find((x) => x.id === item.id)
                                    ?.url || '',
                                setLink: (url) =>
                                  mutateData((prev) => ({
                                    ...prev,
                                    resources: prev.resources.map((r) =>
                                      r.id === div.id
                                        ? {
                                            ...r,
                                            items: r.items.map((x) =>
                                              x.id === item.id
                                                ? { ...x, url }
                                                : x
                                            )
                                          }
                                        : r
                                    )
                                  })),
                                linkAssetAccept: 'pdf',
                                linkFolderHint: 'files'
                              });
                            }
                          }}
                        >
                          <h3
                            className={`mvrt-inline-editable ${
                              activeTextSel?.styleKey === `res-title-${item.id}`
                                ? 'is-active-edit'
                                : ''
                            }`}
                            style={getCustomStyle(`res-title-${item.id}`)}
                          >
                            {item.title}
                          </h3>
                          {item.badge && (
                            <span className="mvrt-resource-badge">
                              {item.badge}
                            </span>
                          )}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      )}

      {/* ==================== PAGE 6: CONTACT (contact.html) ==================== */}
      {activePage === 'contact' && (
        <main>
          <div className="mvrt-header-secondary">
            <h1 className="mvrt-title">Contact</h1>
          </div>
          <hr className="mvrt-subpage-hr" />

          <div className="mvrt-contactform-container">
            <div className="mvrt-contactform-head">
              <h2>Contact Us Here</h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setContactSubmitted(true);
              }}
            >
              <div>
                <input
                  className="mvrt-contactform-input"
                  type="text"
                  name="name"
                  placeholder="Name"
                  required
                />
              </div>
              <div>
                <input
                  className="mvrt-contactform-input"
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                />
              </div>
              <div>
                <textarea
                  className="mvrt-contactform-textarea"
                  name="message"
                  placeholder="Message"
                  required
                />
              </div>
              <div>
                <button type="submit" className="mvrt-contactform-btn">
                  Send Message
                </button>
              </div>
            </form>
            {contactSubmitted && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '10px 16px',
                  backgroundColor: '#662d91',
                  color: '#fafafa',
                  borderRadius: '6px',
                  width: '80%',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}
              >
                Message Sent
              </div>
            )}
          </div>
        </main>
      )}

      {/* ==================== PAGE 7: SPONSORS (sponsors.html) ==================== */}
      {activePage === 'sponsors' && (
        <main className="mvrt-editable-region">
          <div className="mvrt-header-secondary">
            <h1 className="mvrt-title">Sponsors</h1>
          </div>
          <hr className="mvrt-subpage-hr" />

          <section className="mvrt-sponsors-section">
            <div className="mvrt-container">
              <h2
                className={`mvrt-sponsors-heading mvrt-inline-editable ${
                  activeTextSel?.styleKey === 'sponsors-heading'
                    ? 'is-active-edit'
                    : ''
                }`}
                style={getCustomStyle('sponsors-heading')}
                onClick={() => {
                  if (!showEditOverlays) return;
                  setActiveTextSel({
                    styleKey: 'sponsors-heading',
                    label: 'Sponsors Heading',
                    defaultSize: 32,
                    getText: (d) => d.sponsorsPage.heading,
                    setText: (val) =>
                      mutateData((prev) => ({
                        ...prev,
                        sponsorsPage: { ...prev.sponsorsPage, heading: val }
                      }))
                  });
                }}
              >
                {data.sponsorsPage.heading}
              </h2>

              <div className="mvrt-sponsor-rows">
                {data.sponsorsPage.sponsors.map((sp) => (
                  <div
                    key={sp.id}
                    className="mvrt-sponsor-link"
                    style={{ position: 'relative' }}
                  >
                    {showEditOverlays && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -10,
                          right: 6,
                          display: 'flex',
                          gap: 4,
                          zIndex: 20
                        }}
                      >
                        <button
                          type="button"
                          className="mvrt-onscreen-pill"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() =>
                            setActiveTextSel({
                              styleKey: `sp-name-${sp.id}`,
                              label: 'Sponsor Name & Website',
                              defaultSize: 16,
                              getText: (d) =>
                                d.sponsorsPage.sponsors.find(
                                  (x) => x.id === sp.id
                                )?.name || '',
                              setText: (val) =>
                                mutateData((prev) => ({
                                  ...prev,
                                  sponsorsPage: {
                                    ...prev.sponsorsPage,
                                    sponsors: prev.sponsorsPage.sponsors.map(
                                      (x) =>
                                        x.id === sp.id ? { ...x, name: val } : x
                                    )
                                  }
                                })),
                              linkLabel: 'Sponsor Website URL',
                              getLink: (d) =>
                                d.sponsorsPage.sponsors.find(
                                  (x) => x.id === sp.id
                                )?.websiteUrl || '',
                              setLink: (url) =>
                                mutateData((prev) => ({
                                  ...prev,
                                  sponsorsPage: {
                                    ...prev.sponsorsPage,
                                    sponsors: prev.sponsorsPage.sponsors.map(
                                      (x) =>
                                        x.id === sp.id
                                          ? { ...x, websiteUrl: url }
                                          : x
                                    )
                                  }
                                }))
                            })
                          }
                        >
                          <Link2 size={11} />
                        </button>
                        <button
                          type="button"
                          className="mvrt-onscreen-pill danger"
                          onClick={() =>
                            mutateData((prev) => ({
                              ...prev,
                              sponsorsPage: {
                                ...prev.sponsorsPage,
                                sponsors: prev.sponsorsPage.sponsors.filter(
                                  (x) => x.id !== sp.id
                                )
                              }
                            }))
                          }
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                    <div
                      className="mvrt-inline-img-wrap"
                      onClick={() => {
                        if (showEditOverlays) {
                          pickImage(
                            `${sp.name} Logo`,
                            sp.logoUrl,
                            'logos',
                            (newUrl) =>
                              mutateData((prev) => ({
                                ...prev,
                                sponsorsPage: {
                                  ...prev.sponsorsPage,
                                  sponsors: prev.sponsorsPage.sponsors.map(
                                    (x) =>
                                      x.id === sp.id
                                        ? { ...x, logoUrl: newUrl }
                                        : x
                                  )
                                }
                              }))
                          );
                        } else {
                          window.open(sp.websiteUrl, '_blank', 'noopener');
                        }
                      }}
                    >
                      <img
                        className={`mvrt-sponsorimg ${
                          showEditOverlays ? 'mvrt-inline-img-clickable' : ''
                        }`}
                        src={resolveAssetUrl(sp.logoUrl)}
                        alt={sp.name}
                        onError={(e) => {
                          e.currentTarget.src = createMvrtSvgFallback(
                            sp.name,
                            'MVRT Team 115 Sponsor'
                          );
                        }}
                      />
                      {showEditOverlays && (
                        <span className="mvrt-img-pick-badge">
                          Click to Pick Logo
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {showEditOverlays && (
                  <button
                    type="button"
                    className="mvrt-onscreen-pill"
                    onClick={() =>
                      mutateData((prev) => ({
                        ...prev,
                        sponsorsPage: {
                          ...prev.sponsorsPage,
                          sponsors: [
                            ...prev.sponsorsPage.sponsors,
                            {
                              id: `sp-${Date.now()}`,
                              name: 'New Sponsor',
                              logoUrl: 'assets/images/logos/apple.png',
                              websiteUrl: 'https://mvrt.com'
                            }
                          ]
                        }
                      }))
                    }
                  >
                    <Plus size={13} />
                    <span>Add Sponsor Logo</span>
                  </button>
                )}
              </div>

              <div className="mvrt-sponsors-promo">
                <h3
                  className={`mvrt-inline-editable ${
                    activeTextSel?.styleKey === 'sponsors-promo'
                      ? 'is-active-edit'
                      : ''
                  }`}
                  style={getCustomStyle('sponsors-promo')}
                  onClick={() => {
                    if (!showEditOverlays) return;
                    setActiveTextSel({
                      styleKey: 'sponsors-promo',
                      label: 'Promo Discount Banner',
                      defaultSize: 22,
                      getText: (d) => d.sponsorsPage.promoBannerText,
                      setText: (val) =>
                        mutateData((prev) => ({
                          ...prev,
                          sponsorsPage: {
                            ...prev.sponsorsPage,
                            promoBannerText: val
                          }
                        }))
                    });
                  }}
                >
                  {data.sponsorsPage.promoBannerText}
                </h3>
                <div className="mvrt-sponsors-links">
                  <a
                    href={resolveAssetUrl(
                      data.sponsorsPage.grantImpactReportUrl
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mvrt-link-inline"
                    onClick={(e) => {
                      if (showEditOverlays) {
                        e.preventDefault();
                        pickPdf(
                          'Grant Impact Report PDF',
                          data.sponsorsPage.grantImpactReportUrl,
                          'files',
                          (newPdf) =>
                            mutateData((prev) => ({
                              ...prev,
                              sponsorsPage: {
                                ...prev.sponsorsPage,
                                grantImpactReportUrl: newPdf
                              }
                            }))
                        );
                      }
                    }}
                  >
                    Grant Impact Report &nbsp;|
                  </a>
                  &nbsp;&nbsp;
                  <a
                    href={resolveAssetUrl(data.sponsorsPage.sponsorPacketUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mvrt-link-inline"
                    onClick={(e) => {
                      if (showEditOverlays) {
                        e.preventDefault();
                        pickPdf(
                          'Sponsor Packet PDF',
                          data.sponsorsPage.sponsorPacketUrl,
                          'files',
                          (newPdf) =>
                            mutateData((prev) => ({
                              ...prev,
                              sponsorsPage: {
                                ...prev.sponsorsPage,
                                sponsorPacketUrl: newPdf
                              }
                            }))
                        );
                      }
                    }}
                  >
                    Sponsor Packet &nbsp;|
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ==================== PAGE 8: NEWSLETTERS (newsletters.html) ==================== */}
      {activePage === 'newsletters' && (
        <main className="mvrt-editable-region">
          <div className="mvrt-header-secondary">
            <h1 className="mvrt-title">Newsletters</h1>
          </div>
          <hr className="mvrt-subpage-hr" />

          {showEditOverlays && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <button
                type="button"
                className="mvrt-onscreen-pill"
                onClick={() =>
                  mutateData((prev) => ({
                    ...prev,
                    newsletters: [
                      {
                        id: `nl-${Date.now()}`,
                        title: 'New Newsletter Issue',
                        summary: 'Click to edit summary and pick PDF from assets.',
                        thumbnailUrl:
                          'assets/images/newsletters/MVRT Build Newsletter Week 1.png',
                        pdfUrl:
                          'assets/newsletters/MVRT Build Newsletter Week 1.pdf'
                      },
                      ...prev.newsletters
                    ]
                  }))
                }
              >
                <Plus size={13} />
                <span>Add Newsletter Card</span>
              </button>
            </div>
          )}

          <div className="mvrt-newsletters-wrapper">
            <div className="mvrt-newsletters-grid">
              {data.newsletters.map((nl) => (
                <div
                  key={nl.id}
                  className="mvrt-gallery-card"
                  style={{ position: 'relative' }}
                >
                  {showEditOverlays && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        display: 'flex',
                        gap: 4,
                        zIndex: 20
                      }}
                    >
                      <button
                        type="button"
                        className="mvrt-onscreen-pill"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={() =>
                          pickPdf(
                            `${nl.title} PDF`,
                            nl.pdfUrl,
                            'newsletters',
                            (newPdf) =>
                              mutateData((prev) => ({
                                ...prev,
                                newsletters: prev.newsletters.map((x) =>
                                  x.id === nl.id ? { ...x, pdfUrl: newPdf } : x
                                )
                              }))
                          )
                        }
                        title="Select Newsletter PDF from Assets"
                      >
                        <FolderOpen size={11} />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        className="mvrt-onscreen-pill danger"
                        onClick={() =>
                          mutateData((prev) => ({
                            ...prev,
                            newsletters: prev.newsletters.filter(
                              (x) => x.id !== nl.id
                            )
                          }))
                        }
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}

                  <div
                    className="mvrt-inline-img-wrap"
                    style={{ display: 'block' }}
                    onClick={() => {
                      if (showEditOverlays) {
                        pickImage(
                          `${nl.title} Cover Thumbnail`,
                          nl.thumbnailUrl,
                          'newsletters',
                          (newUrl) =>
                            mutateData((prev) => ({
                              ...prev,
                              newsletters: prev.newsletters.map((x) =>
                                x.id === nl.id
                                  ? { ...x, thumbnailUrl: newUrl }
                                  : x
                              )
                            }))
                        );
                      } else {
                        window.open(
                          resolveAssetUrl(nl.pdfUrl),
                          '_blank',
                          'noopener'
                        );
                      }
                    }}
                  >
                    <img
                      className={
                        showEditOverlays ? 'mvrt-inline-img-clickable' : ''
                      }
                      src={resolveAssetUrl(nl.thumbnailUrl)}
                      alt={nl.title}
                      onError={(e) => {
                        e.currentTarget.src = createMvrtSvgFallback(
                          nl.title,
                          'MVRT Team 115 Newsletter'
                        );
                      }}
                    />
                    {showEditOverlays && (
                      <span className="mvrt-img-pick-badge">
                        Click to Pick Cover Image
                      </span>
                    )}
                  </div>
                  <div className="mvrt-gallery-desc">
                    <h4
                      className={`mvrt-inline-editable ${
                        activeTextSel?.styleKey === `nl-title-${nl.id}`
                          ? 'is-active-edit'
                          : ''
                      }`}
                      style={getCustomStyle(`nl-title-${nl.id}`)}
                      onClick={() => {
                        if (!showEditOverlays) {
                          window.open(
                            resolveAssetUrl(nl.pdfUrl),
                            '_blank',
                            'noopener'
                          );
                          return;
                        }
                        setActiveTextSel({
                          styleKey: `nl-title-${nl.id}`,
                          label: 'Newsletter Title & PDF File',
                          defaultSize: 20,
                          getText: (d) =>
                            d.newsletters.find((x) => x.id === nl.id)?.title ||
                            '',
                          setText: (val) =>
                            mutateData((prev) => ({
                              ...prev,
                              newsletters: prev.newsletters.map((x) =>
                                x.id === nl.id ? { ...x, title: val } : x
                              )
                            })),
                          linkLabel: 'Newsletter PDF Path',
                          getLink: (d) =>
                            d.newsletters.find((x) => x.id === nl.id)?.pdfUrl ||
                            '',
                          setLink: (url) =>
                            mutateData((prev) => ({
                              ...prev,
                              newsletters: prev.newsletters.map((x) =>
                                x.id === nl.id ? { ...x, pdfUrl: url } : x
                              )
                            })),
                          linkAssetAccept: 'pdf',
                          linkFolderHint: 'newsletters'
                        });
                      }}
                    >
                      {nl.title}
                    </h4>
                    <p
                      className={`mvrt-inline-editable ${
                        activeTextSel?.styleKey === `nl-sum-${nl.id}`
                          ? 'is-active-edit'
                          : ''
                      }`}
                      style={getCustomStyle(`nl-sum-${nl.id}`)}
                      onClick={() => {
                        if (!showEditOverlays) return;
                        setActiveTextSel({
                          styleKey: `nl-sum-${nl.id}`,
                          label: 'Newsletter Summary',
                          defaultSize: 16,
                          multiline: true,
                          getText: (d) =>
                            d.newsletters.find((x) => x.id === nl.id)
                              ?.summary || '',
                          setText: (val) =>
                            mutateData((prev) => ({
                              ...prev,
                              newsletters: prev.newsletters.map((x) =>
                                x.id === nl.id ? { ...x, summary: val } : x
                              )
                            }))
                        });
                      }}
                    >
                      {nl.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* ==================== PAGE 9: JOIN (join.html) ==================== */}
      {activePage === 'join' && (
        <main className="mvrt-editable-region">
          <div className="mvrt-header-secondary">
            <h1 className="mvrt-title">Join</h1>
          </div>
          <hr className="mvrt-subpage-hr" />

          <div className="mvrt-information-container">
            <p
              className={`mvrt-join-intro mvrt-inline-editable ${
                activeTextSel?.styleKey === 'join-intro' ? 'is-active-edit' : ''
              }`}
              style={getCustomStyle('join-intro')}
              onClick={() => {
                if (!showEditOverlays) return;
                setActiveTextSel({
                  styleKey: 'join-intro',
                  label: 'Join Page Intro Paragraph',
                  defaultSize: 18,
                  multiline: true,
                  getText: (d) => d.joinPage.introParagraph,
                  setText: (val) =>
                    mutateData((prev) => ({
                      ...prev,
                      joinPage: { ...prev.joinPage, introParagraph: val }
                    }))
                });
              }}
            >
              {data.joinPage.introParagraph}{' '}
              <button
                type="button"
                className="mvrt-link-inline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate('about');
                }}
              >
                about
              </button>{' '}
              page!
            </p>

            <div className="mvrt-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={joinTab === 'regular'}
                className={`mvrt-tab ${joinTab === 'regular' ? 'active' : ''}`}
                onClick={() => setJoinTab('regular')}
              >
                Regular Season
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={joinTab === 'faqs'}
                className={`mvrt-tab ${joinTab === 'faqs' ? 'active' : ''}`}
                onClick={() => setJoinTab('faqs')}
              >
                FAQs
              </button>
            </div>

            <div className="mvrt-info-content">
              {joinTab === 'regular' && (
                <div>
                  {showEditOverlays && (
                    <div style={{ marginBottom: 14 }}>
                      <button
                        type="button"
                        className="mvrt-onscreen-pill"
                        onClick={() =>
                          mutateData((prev) => ({
                            ...prev,
                            meta: {
                              ...prev.meta,
                              registrationOpen: !prev.meta.registrationOpen
                            }
                          }))
                        }
                      >
                        <span>
                          Status:{' '}
                          {data.meta.registrationOpen
                            ? 'Registration OPEN (Click to Close)'
                            : 'Registration CLOSED (Click to Open)'}
                        </span>
                      </button>
                    </div>
                  )}
                  <h1
                    className={`mvrt-inline-editable ${
                      activeTextSel?.styleKey === 'join-reg-heading'
                        ? 'is-active-edit'
                        : ''
                    }`}
                    style={getCustomStyle('join-reg-heading')}
                    onClick={() => {
                      if (!showEditOverlays) return;
                      setActiveTextSel({
                        styleKey: 'join-reg-heading',
                        label: 'Join Registration Heading & Form Link',
                        defaultSize: 38,
                        getText: (d) =>
                          d.meta.registrationOpen
                            ? d.joinPage.regularSeasonHeading
                            : d.joinPage.closedSeasonHeading,
                        setText: (val) =>
                          mutateData((prev) =>
                            prev.meta.registrationOpen
                              ? {
                                  ...prev,
                                  joinPage: {
                                    ...prev.joinPage,
                                    regularSeasonHeading: val
                                  }
                                }
                              : {
                                  ...prev,
                                  joinPage: {
                                    ...prev.joinPage,
                                    closedSeasonHeading: val
                                  }
                                }
                          ),
                        linkLabel: 'Google Interest Form URL',
                        getLink: (d) => d.meta.interestFormUrl,
                        setLink: (url) =>
                          mutateData((prev) => ({
                            ...prev,
                            meta: { ...prev.meta, interestFormUrl: url }
                          }))
                      });
                    }}
                  >
                    {data.meta.registrationOpen
                      ? data.joinPage.regularSeasonHeading
                      : data.joinPage.closedSeasonHeading}
                  </h1>
                  <hr className="mvrt-content-hr" />
                  <p
                    className={`mvrt-inline-editable ${
                      activeTextSel?.styleKey === 'join-reg-body'
                        ? 'is-active-edit'
                        : ''
                    }`}
                    style={getCustomStyle('join-reg-body')}
                    onClick={() => {
                      if (!showEditOverlays) return;
                      setActiveTextSel({
                        styleKey: 'join-reg-body',
                        label: 'Join Registration Instructions',
                        defaultSize: 18,
                        multiline: true,
                        getText: (d) =>
                          d.meta.registrationOpen
                            ? d.joinPage.regularSeasonBody
                            : d.joinPage.closedSeasonBody,
                        setText: (val) =>
                          mutateData((prev) =>
                            prev.meta.registrationOpen
                              ? {
                                  ...prev,
                                  joinPage: {
                                    ...prev.joinPage,
                                    regularSeasonBody: val
                                  }
                                }
                              : {
                                  ...prev,
                                  joinPage: {
                                    ...prev.joinPage,
                                    closedSeasonBody: val
                                  }
                                }
                          ),
                        linkLabel: 'Google Interest Form URL',
                        getLink: (d) => d.meta.interestFormUrl,
                        setLink: (url) =>
                          mutateData((prev) => ({
                            ...prev,
                            meta: { ...prev.meta, interestFormUrl: url }
                          }))
                      });
                    }}
                  >
                    {data.meta.registrationOpen ? (
                      <>
                        {data.joinPage.regularSeasonBody}{' '}
                        <a
                          href={data.meta.interestFormUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mvrt-link-inline"
                          onClick={(e) => {
                            if (showEditOverlays) e.preventDefault();
                          }}
                        >
                          interest form
                        </a>
                        !
                      </>
                    ) : (
                      data.joinPage.closedSeasonBody
                    )}
                  </p>
                  <h3
                    style={{
                      fontSize: '23px',
                      fontWeight: 300,
                      margin: '24px 0 0',
                      color: '#3b4045'
                    }}
                  >
                    Questions?{' '}
                    <button
                      type="button"
                      className="mvrt-link-inline"
                      onClick={() => handleNavigate('contact')}
                    >
                      Contact Us
                    </button>
                    !
                  </h3>
                </div>
              )}

              {joinTab === 'faqs' && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10
                    }}
                  >
                    <h1>Frequently Asked Questions</h1>
                    {showEditOverlays && (
                      <button
                        type="button"
                        className="mvrt-onscreen-pill"
                        onClick={() =>
                          mutateData((prev) => ({
                            ...prev,
                            joinPage: {
                              ...prev.joinPage,
                              faqs: [
                                ...prev.joinPage.faqs,
                                {
                                  id: `faq-${Date.now()}`,
                                  question: 'New FAQ Question?',
                                  answer: 'Click here to edit the FAQ answer.'
                                }
                              ]
                            }
                          }))
                        }
                      >
                        <Plus size={12} />
                        <span>Add FAQ</span>
                      </button>
                    )}
                  </div>
                  <hr className="mvrt-content-hr" />
                  {data.joinPage.faqs.map((faq, idx) => (
                    <div
                      key={faq.id}
                      className="mvrt-faq-item"
                      style={{ position: 'relative' }}
                    >
                      {showEditOverlays && (
                        <button
                          type="button"
                          className="mvrt-onscreen-pill danger"
                          style={{ position: 'absolute', top: 0, right: 0 }}
                          onClick={() =>
                            mutateData((prev) => ({
                              ...prev,
                              joinPage: {
                                ...prev.joinPage,
                                faqs: prev.joinPage.faqs.filter(
                                  (f) => f.id !== faq.id
                                )
                              }
                            }))
                          }
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                      <h3
                        className={`mvrt-inline-editable ${
                          activeTextSel?.styleKey === `faq-q-${faq.id}`
                            ? 'is-active-edit'
                            : ''
                        }`}
                        style={getCustomStyle(`faq-q-${faq.id}`)}
                        onClick={() => {
                          if (!showEditOverlays) return;
                          setActiveTextSel({
                            styleKey: `faq-q-${faq.id}`,
                            label: `FAQ #${idx + 1} Question`,
                            defaultSize: 22,
                            getText: (d) =>
                              d.joinPage.faqs.find((f) => f.id === faq.id)
                                ?.question || '',
                            setText: (val) =>
                              mutateData((prev) => ({
                                ...prev,
                                joinPage: {
                                  ...prev.joinPage,
                                  faqs: prev.joinPage.faqs.map((f) =>
                                    f.id === faq.id
                                      ? { ...f, question: val }
                                      : f
                                  )
                                }
                              }))
                          });
                        }}
                      >
                        {idx + 1}. {faq.question}
                      </h3>
                      <p
                        className={`mvrt-inline-editable ${
                          activeTextSel?.styleKey === `faq-a-${faq.id}`
                            ? 'is-active-edit'
                            : ''
                        }`}
                        style={getCustomStyle(`faq-a-${faq.id}`)}
                        onClick={() => {
                          if (!showEditOverlays) return;
                          setActiveTextSel({
                            styleKey: `faq-a-${faq.id}`,
                            label: `FAQ #${idx + 1} Answer`,
                            defaultSize: 18,
                            multiline: true,
                            getText: (d) =>
                              d.joinPage.faqs.find((f) => f.id === faq.id)
                                ?.answer || '',
                            setText: (val) =>
                              mutateData((prev) => ({
                                ...prev,
                                joinPage: {
                                  ...prev.joinPage,
                                  faqs: prev.joinPage.faqs.map((f) =>
                                    f.id === faq.id ? { ...f, answer: val } : f
                                  )
                                }
                              }))
                          });
                        }}
                      >
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ==================== GLOBAL FOOTER ==================== */}
      <footer className="mvrt-footer">
        <div className="mvrt-container">
          <button
            type="button"
            className="mvrt-footer-logo"
            onClick={() => handleNavigate('home')}
          >
            {data.meta.shortName || 'MVRT'}
          </button>

          <div className="mvrt-socialmediabar">
            <a
              href={data.meta.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              title="Check out our Instagram"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a
              href={data.meta.socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              title="Check out our Facebook"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a
              href={data.meta.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              title="Check out our Twitter"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
              </svg>
            </a>
            <a
              href={data.meta.socials.youtube}
              target="_blank"
              rel="noopener noreferrer"
              title="Check out our YouTube Channel"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
              </svg>
            </a>
          </div>

          <p className="mvrt-copyright-text">
            {data.meta.copyrightYear} &copy; {data.meta.teamName}
          </p>
          <p className="mvrt-copyright-text">
            Made with{' '}
            <a
              href={data.meta.socials.heartEasterEggUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mvrt-heart-link"
            >
              <Heart size={13} fill="currentColor" />
            </a>{' '}
            in {data.meta.location}
          </p>
        </div>
      </footer>
    </div>
  );
};
