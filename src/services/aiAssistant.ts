import type {
  MvrtEventItem,
  MvrtLeaderProfile,
  MvrtPageId,
  MvrtSiteData
} from '../types/mvrt';

export interface MaintainerTask {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface AiActionResult {
  reply: string;
  nextData?: MvrtSiteData;
  nextTasks?: MaintainerTask[];
  navigateTo?: MvrtPageId;
  appliedActions: string[];
  usedCloudLlm: boolean;
}

export interface AiSettings {
  provider: 'builtin' | 'gemini' | 'openai';
  apiKey: string;
}

type StructuredAction =
  | {
      type: 'add_event';
      title: string;
      isoDate?: string;
      endDate?: string;
      timeText?: string;
      dateText?: string;
      location?: string;
      category?: 'team_meeting' | 'team_event' | 'demo_outreach';
    }
  | { type: 'remove_event'; titleQuery: string }
  | { type: 'toggle_registration'; open: boolean; seasonLabel?: string }
  | { type: 'update_hero'; subtitle?: string; typewriterPhrases?: string[] }
  | {
      type: 'update_stats';
      yearsAsTeam?: number;
      currentMembersDisplay?: string;
      currentMentors?: number;
    }
  | { type: 'add_outreach'; title: string; description: string }
  | { type: 'add_faq'; question: string; answer: string }
  | {
      type: 'add_leader';
      name: string;
      role: string;
      tier?: MvrtLeaderProfile['tier'];
      email?: string;
    }
  | { type: 'add_members'; names: string[] }
  | {
      type: 'add_resource';
      division:
        | 'Mechanical'
        | 'Software'
        | 'Electrical'
        | 'Outreach'
        | 'Finance'
        | 'Marketing';
      title: string;
      url?: string;
    }
  | { type: 'season_rollover'; year: number; game: string; robotName: string }
  | { type: 'navigate_page'; page: MvrtPageId }
  | { type: 'add_task'; text: string }
  | { type: 'complete_task'; query: string };

function formatHumanDate(isoDate?: string, timeText?: string): string {
  if (!isoDate) return 'Upcoming';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(y, m - 1, d);
  const base = `${dt.toLocaleString('en-US', { month: 'long' })} ${d}, ${y}`;
  return timeText ? `${base}, ${timeText}` : base;
}

function tryParseDateFromPrompt(text: string): string | undefined {
  const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const monthNames =
    'january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec';
  const namedMatch = text.match(
    new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}))?\\b`, 'i')
  );
  if (namedMatch) {
    const mStr = namedMatch[1].toLowerCase().slice(0, 3);
    const map: Record<string, number> = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12
    };
    const m = map[mStr] || 1;
    const d = Number(namedMatch[2]);
    const y = namedMatch[3] ? Number(namedMatch[3]) : new Date().getFullYear();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return undefined;
}

function applyStructuredActions(
  actions: StructuredAction[],
  data: MvrtSiteData,
  tasks: MaintainerTask[]
): {
  nextData: MvrtSiteData;
  nextTasks: MaintainerTask[];
  navigateTo?: MvrtPageId;
  appliedActions: string[];
} {
  let nextData: MvrtSiteData = structuredClone(data);
  let nextTasks: MaintainerTask[] = [...tasks];
  let navigateTo: MvrtPageId | undefined;
  const appliedActions: string[] = [];

  for (const act of actions) {
    switch (act.type) {
      case 'add_event': {
        const isoDate =
          act.isoDate || new Date().toISOString().slice(0, 10);
        const newEvent: MvrtEventItem = {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: act.title,
          isoDate,
          endDate: act.endDate,
          timeText: act.timeText,
          dateText:
            act.dateText || formatHumanDate(isoDate, act.timeText),
          location: act.location || 'Monta Vista High School',
          category: act.category || 'team_event'
        };
        nextData.eventsConfig.items.push(newEvent);
        appliedActions.push(`Added "${newEvent.title}" (${newEvent.dateText}) to Calendar`);
        navigateTo = navigateTo || 'calendar';
        break;
      }
      case 'remove_event': {
        const q = act.titleQuery.toLowerCase();
        const before = nextData.eventsConfig.items.length;
        nextData.eventsConfig.items = nextData.eventsConfig.items.filter(
          (e) => !e.title.toLowerCase().includes(q)
        );
        const removed = before - nextData.eventsConfig.items.length;
        if (removed > 0) {
          appliedActions.push(`Removed ${removed} matching event(s)`);
        }
        break;
      }
      case 'toggle_registration': {
        nextData.meta.registrationOpen = act.open;
        if (act.seasonLabel) {
          nextData.meta.registrationSeasonLabel = act.seasonLabel;
          nextData.joinPage.regularSeasonHeading = `Registration for the ${act.seasonLabel} season is currently open!`;
        }
        appliedActions.push(
          `Set student registration to ${act.open ? 'OPEN' : 'CLOSED'}`
        );
        navigateTo = navigateTo || 'join';
        break;
      }
      case 'update_hero': {
        if (act.subtitle) {
          nextData.meta.heroSubtitle = act.subtitle;
          appliedActions.push('Updated Hero subtitle');
        }
        if (act.typewriterPhrases && act.typewriterPhrases.length > 0) {
          nextData.meta.typewriterPhrases = act.typewriterPhrases;
          appliedActions.push('Updated Hero typewriter phrases');
        }
        navigateTo = navigateTo || 'home';
        break;
      }
      case 'update_stats': {
        if (typeof act.yearsAsTeam === 'number') {
          nextData.glanceStats.yearsAsTeam = act.yearsAsTeam;
        }
        if (act.currentMembersDisplay) {
          nextData.glanceStats.autoCountMembers = false;
          nextData.glanceStats.currentMembersDisplay = act.currentMembersDisplay;
        }
        if (typeof act.currentMentors === 'number') {
          nextData.glanceStats.currentMentors = act.currentMentors;
        }
        appliedActions.push('Updated Team At A Glance stats');
        navigateTo = navigateTo || 'home';
        break;
      }
      case 'add_outreach': {
        nextData.outreach.unshift({
          id: `out-${Date.now()}`,
          title: act.title,
          description: act.description,
          imageUrl: 'assets/images/programs/stem4kids.jpg'
        });
        appliedActions.push(`Added Outreach program "${act.title}"`);
        navigateTo = navigateTo || 'outreach';
        break;
      }
      case 'add_faq': {
        nextData.joinPage.faqs.push({
          id: `faq-${Date.now()}`,
          question: act.question,
          answer: act.answer
        });
        appliedActions.push(`Added FAQ: "${act.question}"`);
        navigateTo = navigateTo || 'join';
        break;
      }
      case 'add_leader': {
        nextData.leadership.push({
          id: `lead-${Date.now()}`,
          name: act.name,
          role: act.role,
          tier: act.tier || 'Engineering Directors',
          email: act.email || 'mvrt@mvrt.com',
          imageUrl: 'assets/images/officers/2027/anna.jpg'
        });
        appliedActions.push(`Added ${act.name} (${act.role}) to Leadership`);
        navigateTo = navigateTo || 'about';
        break;
      }
      case 'add_members': {
        const merged = Array.from(
          new Set([...nextData.members, ...act.names.map((n) => n.trim()).filter(Boolean)])
        ).sort((a, b) => a.localeCompare(b));
        nextData.members = merged;
        appliedActions.push(`Added ${act.names.length} member(s) to roster`);
        navigateTo = navigateTo || 'about';
        break;
      }
      case 'add_resource': {
        nextData.resources = nextData.resources.map((r) =>
          r.division === act.division
            ? {
                ...r,
                comingSoon: false,
                items: [
                  ...r.items,
                  {
                    id: `res-${Date.now()}`,
                    title: act.title,
                    url: act.url || 'https://mvrt.com/resources.html',
                    thumbnailUrl: 'assets/images/resources/blank.png'
                  }
                ]
              }
            : r
        );
        appliedActions.push(`Added "${act.title}" to ${act.division} Resources`);
        navigateTo = navigateTo || 'resources';
        break;
      }
      case 'season_rollover': {
        const existing = nextData.seasons.some((s) => s.year === act.year);
        if (!existing) {
          nextData.seasons.unshift({
            year: act.year,
            game: act.game,
            robotName: act.robotName,
            robotImage: 'assets/images/robot-images/mvrt2026.jpg',
            teamImage: 'assets/images/team/team-2026-temp.png',
            showInPastRobots: true,
            awards: ['Season Kickoff & Competition Prep'],
            leadership: nextData.leadership.map((l) => `${l.name} - ${l.role}`)
          });
        }
        nextData.glanceStats.featuredSeasonYear = act.year;
        nextData.glanceStats.yearsAsTeam = Math.max(
          nextData.glanceStats.yearsAsTeam,
          act.year - 1997
        );
        nextData.meta.copyrightYear = act.year;
        appliedActions.push(
          `Rolled over site to ${act.year} Season (${act.game} / ${act.robotName})`
        );
        navigateTo = navigateTo || 'home';
        break;
      }
      case 'navigate_page': {
        navigateTo = act.page;
        appliedActions.push(`Opened ${act.page} page`);
        break;
      }
      case 'add_task': {
        nextTasks.unshift({
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          text: act.text,
          done: false,
          createdAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
        });
        appliedActions.push(`Added task: "${act.text}"`);
        break;
      }
      case 'complete_task': {
        const q = act.query.toLowerCase();
        nextTasks = nextTasks.map((t) =>
          t.text.toLowerCase().includes(q) ? { ...t, done: true } : t
        );
        appliedActions.push(`Completed task matching "${act.query}"`);
        break;
      }
    }
  }

  return { nextData, nextTasks, navigateTo, appliedActions };
}

function runBuiltInParser(prompt: string): {
  actions: StructuredAction[];
  reply: string;
} {
  const lower = prompt.toLowerCase().trim();
  const actions: StructuredAction[] = [];

  // 1. Task creation ("add task ...", "todo: ...", "remind me to ...")
  const taskMatch = prompt.match(
    /^(?:add\s+(?:a\s+)?task[:\s]+|todo[:\s]+|remind\s+me\s+to\s+)(.+)$/i
  );
  if (taskMatch) {
    actions.push({ type: 'add_task', text: taskMatch[1].trim() });
    return {
      actions,
      reply: `Added "${taskMatch[1].trim()}" to your Maintainer Tasks list.`
    };
  }

  // 2. Complete task
  const doneMatch = prompt.match(/^(?:complete|finish|done)\s+task[:\s]+(.+)$/i);
  if (doneMatch) {
    actions.push({ type: 'complete_task', query: doneMatch[1].trim() });
    return {
      actions,
      reply: `Marked matching task "${doneMatch[1].trim()}" as done.`
    };
  }

  // 3. Open / Close Registration
  if (/\b(close|disable|shut)\b.*\bregistration\b/i.test(lower)) {
    actions.push({ type: 'toggle_registration', open: false });
    return {
      actions,
      reply: 'Closed student registration across Homepage and Join page.'
    };
  }
  if (/\b(open|enable)\b.*\bregistration\b/i.test(lower)) {
    actions.push({ type: 'toggle_registration', open: true });
    return {
      actions,
      reply: 'Opened student registration across Homepage and Join page.'
    };
  }

  // 4. Add Calendar Event / Meeting / Demo
  const eventMatch = prompt.match(
    /\b(?:add|create|schedule)\s+(?:an?\s+)?(?:(meeting|demo|outreach|event|competition)\s+)?(?:called|named|titled)?\s*["']?([^"'\n]+?)["']?(?:\s+(?:on|for|at)\s+(.+))?$/i
  );
  if (
    eventMatch &&
    /\b(event|meeting|demo|calendar|schedule|kickoff|competition|workshop)\b/i.test(
      lower
    )
  ) {
    const kind = (eventMatch[1] || '').toLowerCase();
    const category: MvrtEventItem['category'] =
      kind === 'meeting' || /\bmeeting\b/i.test(lower)
        ? 'team_meeting'
        : kind === 'demo' || kind === 'outreach' || /\bdemo\b/i.test(lower)
          ? 'demo_outreach'
          : 'team_event';

    const isoDate = tryParseDateFromPrompt(prompt);
    const timeMatch = prompt.match(
      /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)(?:\s*[-–to]+\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))?)\b/i
    );
    const rawTitle = (eventMatch[2] || 'New MVRT Event')
      .replace(/\b(to|on)\s+(the\s+)?calendar\b/i, '')
      .trim();

    actions.push({
      type: 'add_event',
      title: rawTitle || 'New MVRT Event',
      isoDate,
      timeText: timeMatch ? timeMatch[1] : undefined,
      category
    });
    return {
      actions,
      reply: `Added "${rawTitle}" to the Calendar & Homepage Upcoming Events.`
    };
  }

  // 5. Add FAQ ("add faq Question | Answer")
  const faqMatch = prompt.match(/\badd\s+faq[:\s]+([^|?]+\??)\s*[|>-]+\s*(.+)$/i);
  if (faqMatch) {
    actions.push({
      type: 'add_faq',
      question: faqMatch[1].trim(),
      answer: faqMatch[2].trim()
    });
    return {
      actions,
      reply: `Added FAQ "${faqMatch[1].trim()}" to the Join page.`
    };
  }

  // 6. Add Outreach Program ("add outreach Title | Description")
  const outreachMatch = prompt.match(
    /\badd\s+outreach(?:\s+program)?[:\s]+([^|]+)\s*[|:]\s*(.+)$/i
  );
  if (outreachMatch) {
    actions.push({
      type: 'add_outreach',
      title: outreachMatch[1].trim(),
      description: outreachMatch[2].trim()
    });
    return {
      actions,
      reply: `Added outreach program "${outreachMatch[1].trim()}".`
    };
  }

  // 7. Update Hero Subtitle
  const heroMatch = prompt.match(
    /\b(?:change|set|update)\s+(?:the\s+)?hero\s+(?:subtitle|text|intro)\s+(?:to|with)[:\s]+(.+)$/i
  );
  if (heroMatch) {
    actions.push({ type: 'update_hero', subtitle: heroMatch[1].trim() });
    return {
      actions,
      reply: 'Updated the Homepage hero introduction paragraph.'
    };
  }

  // 8. Navigate to page
  const navPages: MvrtPageId[] = [
    'home',
    'about',
    'outreach',
    'calendar',
    'resources',
    'contact',
    'sponsors',
    'newsletters',
    'join'
  ];
  for (const p of navPages) {
    if (
      new RegExp(`\\b(open|go\\s+to|show|view)\\s+(?:the\\s+)?${p}\\b`, 'i').test(
        lower
      )
    ) {
      actions.push({ type: 'navigate_page', page: p });
      return { actions, reply: `Switched to the ${p} page.` };
    }
  }

  // 9. Season rollover
  const rollMatch = prompt.match(/\broll\s*over\s+(?:to\s+)?(20\d{2})\b/i);
  if (rollMatch) {
    const yr = Number(rollMatch[1]);
    actions.push({
      type: 'season_rollover',
      year: yr,
      game: `FRC ${yr}`,
      robotName: `El Toro ${yr - 1997}`
    });
    return {
      actions,
      reply: `Rolled over website to the ${yr} season!`
    };
  }

  return {
    actions: [],
    reply:
      'Try commands like: "add event Build Workshop on 2027-01-16 at 10am", "add task upload 2027 robot photo", "close registration", "add faq Cost? | Free to join!", or connect a Gemini/OpenAI key in Settings for free-form AI edits.'
  };
}

export async function runAiCommand(params: {
  prompt: string;
  siteData: MvrtSiteData;
  tasks: MaintainerTask[];
  settings: AiSettings;
}): Promise<AiActionResult> {
  const { prompt, siteData, tasks, settings } = params;

  // Use Cloud LLM if configured with an API key
  if (settings.provider !== 'builtin' && settings.apiKey.trim()) {
    const systemPrompt = `You are the AI Maintainer Assistant for mvrt.com (Monta Vista Robotics Team 115).
Return ONLY valid JSON with this exact shape:
{
  "reply": "short friendly confirmation",
  "actions": [ ... ]
}
Supported action objects:
- {"type":"add_event","title":"...","isoDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","timeText":"...","location":"...","category":"team_event|team_meeting|demo_outreach"}
- {"type":"remove_event","titleQuery":"..."}
- {"type":"toggle_registration","open":true|false,"seasonLabel":"26-27"}
- {"type":"update_hero","subtitle":"...","typewriterPhrases":["MVRT.","..."]}
- {"type":"update_stats","yearsAsTeam":29,"currentMembersDisplay":"130","currentMentors":8}
- {"type":"add_outreach","title":"...","description":"..."}
- {"type":"add_faq","question":"...","answer":"..."}
- {"type":"add_leader","name":"...","role":"...","tier":"President|Vice Presidents|Engineering Directors|Operations Directors","email":"..."}
- {"type":"add_members","names":["..."]}
- {"type":"add_resource","division":"Mechanical|Software|Electrical|Outreach|Finance|Marketing","title":"...","url":"..."}
- {"type":"season_rollover","year":2027,"game":"...","robotName":"..."}
- {"type":"navigate_page","page":"home|about|outreach|calendar|resources|contact|sponsors|newsletters|join"}
- {"type":"add_task","text":"..."}
- {"type":"complete_task","query":"..."}

Current state summary:
- Featured season: ${siteData.glanceStats.featuredSeasonYear}
- Registration open: ${siteData.meta.registrationOpen} (${siteData.meta.registrationSeasonLabel})
- Events count: ${siteData.eventsConfig.items.length}
- Tasks: ${tasks.map((t) => `[${t.done ? 'x' : ' '}] ${t.text}`).join('; ')}`;

    let rawJsonText = '';

    if (settings.provider === 'gemini') {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          settings.apiKey.trim()
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nUser request: ${prompt}` }]
              }
            ],
            generationConfig: { responseMimeType: 'application/json' }
          })
        }
      );
      if (!resp.ok) {
        throw new Error(`Gemini API error (${resp.status})`);
      }
      const json = await resp.json();
      rawJsonText =
        json?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    } else if (settings.provider === 'openai') {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        })
      });
      if (!resp.ok) {
        throw new Error(`OpenAI API error (${resp.status})`);
      }
      const json = await resp.json();
      rawJsonText = json?.choices?.[0]?.message?.content || '{}';
    }

    const parsed = JSON.parse(rawJsonText) as {
      reply?: string;
      actions?: StructuredAction[];
    };
    const applied = applyStructuredActions(
      Array.isArray(parsed.actions) ? parsed.actions : [],
      siteData,
      tasks
    );

    return {
      reply: parsed.reply || 'Done!',
      nextData: applied.nextData,
      nextTasks: applied.nextTasks,
      navigateTo: applied.navigateTo,
      appliedActions: applied.appliedActions,
      usedCloudLlm: true
    };
  }

  // Built-in instant parser (zero API key needed)
  const local = runBuiltInParser(prompt);
  const applied = applyStructuredActions(local.actions, siteData, tasks);
  return {
    reply: local.reply,
    nextData: applied.nextData,
    nextTasks: applied.nextTasks,
    navigateTo: applied.navigateTo,
    appliedActions: applied.appliedActions,
    usedCloudLlm: false
  };
}
