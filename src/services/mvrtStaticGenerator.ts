import type { MvrtPageId, MvrtSiteData } from '../types/mvrt';

export interface GeneratedStaticFile {
  filename: string;
  title: string;
  pageId?: MvrtPageId;
  language: 'html' | 'css' | 'json';
  content: string;
  description: string;
}

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getInitials(name: string): string {
  return (
    String(name ?? '')
      .trim()
      .split(/\s+/)
      .map((part) => part.replace(/[^A-Za-z]/g, '')[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'MV'
  );
}

function makeAvatarSvgDataUri(name: string): string {
  const initials = escapeHtml(getInitials(name));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110" viewBox="0 0 110 110"><circle cx="55" cy="55" r="55" fill="#662d91"/><text x="55" y="65" text-anchor="middle" fill="#ffffff" font-family="Montserrat, Josefin Sans, sans-serif" font-size="34" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function formatHeroSubtitleHtml(subtitle: string): string {
  const escaped = escapeHtml(subtitle);
  if (escaped.includes('FIRST Robotics Competition')) {
    return escaped.replace(
      'FIRST Robotics Competition',
      '<a href="https://www.firstinspires.org" target="_blank" rel="noopener"><i>FIRST</i> Robotics Competition</a>'
    );
  }
  return escaped;
}

function formatMeetingsNoteHtml(note: string): string {
  const escaped = escapeHtml(note);
  if (escaped.includes('calendar')) {
    return escaped.replace('calendar', '<a href="calendar.html">calendar</a>');
  }
  return escaped;
}

function formatRegistrationSubtextHtml(subtext: string): string {
  const escaped = escapeHtml(subtext);
  if (escaped.includes('Join page')) {
    return escaped.replace('Join page', '<a href="join.html" style="color: #fff; text-decoration: underline;">Join page</a>');
  }
  return escaped;
}

function formatJoinIntroHtml(intro: string): string {
  const escaped = escapeHtml(intro);
  if (escaped.includes('about page')) {
    return escaped.replace('about page', '<a href="about.html">about page</a>');
  }
  return escaped;
}

function formatJoinRegularBodyHtml(body: string, interestFormUrl: string): string {
  const escaped = escapeHtml(body);
  if (escaped.includes('interest form')) {
    return escaped.replace(
      'interest form',
      `<a href="${escapeHtml(interestFormUrl)}" target="_blank" rel="noopener">interest form</a>`
    );
  }
  return escaped;
}

function renderSharedHead(title: string, data: MvrtSiteData): string {
  const baseAsset = escapeHtml(data.meta.baseAssetUrl.replace(/\/$/, ''));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.meta.shortName)} | ${escapeHtml(title)}</title>
  <meta name="description" content="Home of the ${escapeHtml(data.meta.teamName)} from ${escapeHtml(data.meta.location)}. Participating in the FIRST Robotics Competition as Team ${data.meta.teamNumber}!" />
  <meta property="og:title" content="${escapeHtml(data.meta.shortName)} | ${escapeHtml(title)}" />
  <meta property="og:image" content="${baseAsset}/assets/images/bull2.jpg" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${escapeHtml(data.meta.shortName)}" />
  <link rel="icon" href="${baseAsset}/assets/favicons/favicon-32x32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="${baseAsset}/assets/favicons/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
  <link rel="stylesheet" href="assets/css/style.css" />
</head>`;
}

function renderSharedNavbar(activePage: MvrtPageId, data: MvrtSiteData): string {
  const navLinks: Array<{ id: MvrtPageId; label: string; href: string; delay: string }> = [
    { id: 'home', label: 'HOME', href: 'index.html', delay: '0.045s' },
    { id: 'about', label: 'ABOUT', href: 'about.html', delay: '0.07s' },
    { id: 'outreach', label: 'OUTREACH', href: 'outreach.html', delay: '0.095s' },
    { id: 'calendar', label: 'CALENDAR', href: 'calendar.html', delay: '0.12s' },
    { id: 'resources', label: 'RESOURCES', href: 'resources.html', delay: '0.145s' },
    { id: 'contact', label: 'CONTACT', href: 'contact.html', delay: '0.17s' },
    { id: 'sponsors', label: 'SPONSORS', href: 'sponsors.html', delay: '0.195s' },
    { id: 'newsletters', label: 'NEWSLETTERS', href: 'newsletters.html', delay: '0.22s' }
  ];

  const isHome = activePage === 'home';

  return `  <!-- Global Navigation (Shared across all 9 MVRT pages) -->
  <header class="container nav-container ${isHome ? 'home-nav' : ''}" id="${isHome ? 'home-nav' : 'subpage-nav'}">
    <div class="nav-box">
      <svg id="menubtn" viewBox="0 0 100 100" role="button" tabindex="0" aria-label="Toggle Navigation" onclick="this.classList.toggle('opened'); document.getElementById('top-nav').classList.toggle('opened'); document.documentElement.classList.toggle('noscroll');">
        <path class="line line1" d="M 20 29 H 82 C 91 29 107 91 77 75 l -52 -50"></path>
        <path class="line line2" d="M 20 50 H 80 "></path>
        <path class="line line3" d="M 20 71 H 82 C 91 71 107 9 77 25 L 25 75 "></path>
      </svg>
      <a class="logo" href="index.html">
        <h1>${escapeHtml(data.meta.shortName)}</h1>
      </a>
      <nav>
        <ul class="nav navbar-nav menu" id="top-nav">
${navLinks
  .map(
    (item) =>
      `          <li class="${activePage === item.id ? 'active' : ''}" style="transition-delay: ${item.delay};"><a href="${item.href}"><b>${item.label}</b></a></li>`
  )
  .join('\n')}
          <li style="transition-delay: 0.245s;">
            <a href="join.html" class="btn-main-nav btn-main-nav-sm ${activePage === 'join' ? 'active-pill' : ''}" style="color: #fff;">
              Join <i class="far fa-arrow-alt-circle-right"></i>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </header>`;
}

function renderSubpageHeader(title: string): string {
  return `  <section class="header-secondary">
    <div class="container">
      <h1 class="title">${escapeHtml(title)}</h1>
    </div>
  </section>
  <hr class="subpage-divider" />`;
}

function renderSharedFooter(data: MvrtSiteData): string {
  return `  <!-- Global Footer (Shared across all 9 MVRT pages) -->
  <footer>
    <div class="container text-center">
      <div class="block">
        <a class="footer-logo" href="index.html">
          <h1>${escapeHtml(data.meta.shortName)}</h1>
        </a>
        <div class="socialmediabar">
          <a href="${escapeHtml(data.meta.socials.instagram)}" title="Check out our Instagram" target="_blank" rel="noopener"><i class="fab fa-instagram"></i></a>
          <a href="${escapeHtml(data.meta.socials.facebook)}" title="Check out our Facebook" target="_blank" rel="noopener"><i class="fab fa-facebook-square"></i></a>
          <a href="${escapeHtml(data.meta.socials.twitter)}" title="Check out our Twitter" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a>
          <a href="${escapeHtml(data.meta.socials.youtube)}" title="Check out our YouTube Channel" target="_blank" rel="noopener"><i class="fab fa-youtube"></i></a>
        </div>
        <p class="copyright-text">${data.meta.copyrightYear} &copy; ${escapeHtml(data.meta.teamName)}</p>
        <p class="copyright-text">
          Made with <a href="${escapeHtml(data.meta.socials.heartEasterEggUrl)}" target="_blank" rel="noopener"><i class="fas fa-heart"></i></a> in ${escapeHtml(data.meta.location)}
        </p>
      </div>
    </div>
  </footer>`;
}

function generateHomeHtml(data: MvrtSiteData): string {
  const featuredSeason =
    data.seasons.find((s) => s.year === data.glanceStats.featuredSeasonYear) ||
    data.seasons[0];
  const teamEvents = data.eventsConfig.items.filter(
    (e) => e.category === 'team_event'
  );
  const demoEvents = data.eventsConfig.items.filter(
    (e) => e.category === 'demo_outreach'
  );
  const memberCount = data.glanceStats.autoCountMembers
    ? String(data.members.length)
    : data.glanceStats.currentMembersDisplay;

  const slides =
    data.meta.heroSlides.length > 0
      ? data.meta.heroSlides
      : [`${data.meta.baseAssetUrl.replace(/\/$/, '')}/assets/images/home-page-slides/im1.webp`];

  return `${renderSharedHead('Home', data)}
<body id="body">
${renderSharedNavbar('home', data)}

  <!-- Hero Section -->
  <section class="hero-area">
    <div class="splashing">
      <div class="hero-slides">
${slides
  .map(
    (slide, idx) =>
      `        <div class="hero-slide ${idx === 0 ? 'active' : ''}" style="background-image: url('${escapeHtml(slide)}'); animation-delay: ${idx * 4.5}s;">
          <img class="splash-img" src="${escapeHtml(slide)}" alt="MVRT Team 115 Slide ${idx + 1}" />
        </div>`
  )
  .join('\n')}
      </div>
    </div>
    <div class="hero-gradient-overlay"></div>
    <div class="container hero-content">
      <div class="hero-block block">
        <h1><span id="headertop">We are <span id="typewriter">${escapeHtml(data.meta.typewriterPhrases[0] || 'MVRT.')}</span><span class="typed-cursor typed-cursor--blink">|</span></span></h1>
        <p>${formatHeroSubtitleHtml(data.meta.heroSubtitle)}</p>
        <a class="btn btn-main" href="about.html" role="button">Learn More <i class="fas fa-arrow-right"></i></a>
      </div>
    </div>
  </section>

  <!-- Upcoming Events Section -->
  <section class="feature section">
    <div class="container">
      <div class="heading text-center">
        <h2>Upcoming Events</h2>
        <h3>A full calendar is available on our <a href="calendar.html">calendar</a> page.</h3>
      </div>
      <div class="grid-3">
        <div class="events text-center">
          <p>Team Meetings:</p>
          <h3>${formatMeetingsNoteHtml(data.eventsConfig.meetingsNote)}</h3>
        </div>
        <div class="events text-center">
          <p>Team Events:</p>
${
  teamEvents.length > 0
    ? teamEvents
        .map(
          (ev) => `          <div class="event">
            <h1 class="big">${escapeHtml(ev.title)}</h1>
            <h4>${escapeHtml(ev.dateText)}</h4>
            ${ev.location ? `<div class="event-location">${escapeHtml(ev.location)}</div>` : ''}
          </div>`
        )
        .join('\n')
    : '          <h3>No upcoming competition events posted right now.</h3>'
}
        </div>
        <div class="events text-center">
          <p>Demos and Outreach:</p>
${
  demoEvents.length > 0
    ? demoEvents
        .map(
          (ev) => `          <div class="event">
            <h1 class="big">${escapeHtml(ev.title)}</h1>
            <h4>${escapeHtml(ev.dateText)}</h4>
            ${ev.location ? `<div class="event-location">${escapeHtml(ev.location)}</div>` : ''}
          </div>`
        )
        .join('\n')
    : '          <h3>Check the calendar for upcoming community demos and outreach workshops.</h3>'
}
        </div>
      </div>
    </div>
  </section>

  <!-- Registration Callout Banner -->
  <section class="third-section section bg-opacity">
    <div class="container cta-flex">
      <div class="cta-copy">
        <h2>${escapeHtml(
          data.meta.registrationOpen
            ? data.meta.registrationHeadline
            : data.joinPage.closedSeasonHeading
        )}</h2>
        <p>${
          data.meta.registrationOpen
            ? formatRegistrationSubtextHtml(data.meta.registrationSubtext)
            : escapeHtml(data.joinPage.closedSeasonBody)
        }</p>
      </div>
      <div class="cta-action">
        <a href="join.html" class="btn btn-main-alt" role="button">Join <i class="far fa-arrow-alt-circle-right"></i></a>
      </div>
    </div>
  </section>

  <!-- Our Team At A Glance -->
  <section class="feature-list section">
    <div class="container">
      <div class="heading text-center">
        <h2>Our Team At A Glance</h2>
      </div>
      <div class="glance-row">
        <div class="glance-media text-center">
          <img class="program-images" src="${escapeHtml(data.glanceStats.teamPhotoUrl)}" alt="MVRT Team Photo" />
        </div>
        <div class="glance-stats text-center">
          <div class="stat-item">
            <h3>Years As A Team:</h3>
            <h1>${data.glanceStats.yearsAsTeam}</h1>
          </div>
          <div class="stat-item">
            <h3>Current Members:</h3>
            <h1>${escapeHtml(memberCount)}</h1>
          </div>
          <div class="stat-item">
            <h3>Current Mentors:</h3>
            <h1>${data.glanceStats.currentMentors}</h1>
          </div>
        </div>
      </div>
${
  featuredSeason
    ? `      <div class="glance-row reverse-mobile">
        <div class="glance-season text-center">
          <h2>${featuredSeason.year} Season:</h2>
          <span class="glance-game-name">${escapeHtml(featuredSeason.game)}</span>
          <h3>Awards:</h3>
          <div class="awards-stack">
${featuredSeason.awards.map((a) => `            <h4>${escapeHtml(a)}</h4>`).join('\n')}
          </div>
          <h3 class="robot-heading">Robot:</h3>
          <h4>${escapeHtml(featuredSeason.robotName || '')}</h4>
          <div style="margin-top: 24px;">
            <a href="about.html#robots" class="btn btn-main" role="button">Learn More <i class="fas fa-arrow-right"></i></a>
          </div>
        </div>
        <div class="glance-media text-center">
          <img class="program-images" id="robot-image" src="${escapeHtml(featuredSeason.robotImage || data.glanceStats.teamPhotoUrl)}" alt="${escapeHtml(featuredSeason.robotName || 'MVRT Robot')}" />
        </div>
      </div>`
    : ''
}
    </div>
  </section>

  <!-- Subscribe To Our Newsletter -->
  <section class="call-to-action section bg-opacity bg-1">
    <div class="container text-center">
      <div class="block">
        <h2>Subscribe To Our Newsletter</h2>
        <p>Drop us your email below to receive our newsletters about how our team is doing!</p>
        <form action="${escapeHtml(data.meta.mailchimpEndpoint)}" method="post" target="_blank" class="newsletter-form input-group">
          <input type="email" name="EMAIL" placeholder="email address" aria-label="Email Address" required />
          <button type="submit" class="btn btn-main">Subscribe</button>
        </form>
      </div>
    </div>
  </section>

${renderSharedFooter(data)}

  <script>
    (function() {
      var phrases = ${JSON.stringify(data.meta.typewriterPhrases)};
      var el = document.getElementById('typewriter');
      if (el && phrases && phrases.length) {
        var pIdx = 0;
        var cIdx = phrases[0].length;
        var deleting = true;
        var paused = false;
        setInterval(function() {
          if (paused) return;
          var current = phrases[pIdx];
          if (deleting) {
            cIdx--;
            el.textContent = current.slice(0, cIdx);
            if (cIdx <= 0) {
              deleting = false;
              pIdx = (pIdx + 1) % phrases.length;
            }
          } else {
            cIdx++;
            el.textContent = current.slice(0, cIdx);
            if (cIdx >= current.length) {
              paused = true;
              setTimeout(function() {
                deleting = true;
                paused = false;
              }, 1300);
            }
          }
        }, 90);
      }

      var slides = document.querySelectorAll('.hero-slide');
      if (slides.length > 1) {
        var currentSlide = 0;
        setInterval(function() {
          slides[currentSlide].classList.remove('active');
          currentSlide = (currentSlide + 1) % slides.length;
          slides[currentSlide].classList.add('active');
        }, 4500);
      }
    })();
  </script>
</body>
</html>`;
}

function generateAboutHtml(data: MvrtSiteData): string {
  const pastRobots = data.seasons.filter((s) => s.showInPastRobots);
  const tiers: Array<'President' | 'Vice Presidents' | 'Engineering Directors' | 'Operations Directors'> = [
    'President',
    'Vice Presidents',
    'Engineering Directors',
    'Operations Directors'
  ];
  const sortedMembers = [...data.members].sort((a, b) => a.localeCompare(b));

  return `${renderSharedHead('About', data)}
<body>
${renderSharedNavbar('about', data)}
${renderSubpageHeader('About')}

  <section class="information">
    <div class="container">
      <div class="tabs" role="tablist">
        <button class="tab tab-1 tab-btn active" role="tab" data-tab="overview" onclick="switchAboutTab('overview', this)">Overview</button>
        <button class="tab tab-2 tab-btn" role="tab" data-tab="first" onclick="switchAboutTab('first', this)">About FIRST</button>
        <button class="tab tab-3 tab-btn" role="tab" data-tab="history" onclick="switchAboutTab('history', this)">Team History</button>
        <button class="tab tab-4 tab-btn" role="tab" data-tab="robots" onclick="switchAboutTab('robots', this)">Past Robots</button>
        <button class="tab tab-5 tab-btn" role="tab" data-tab="leadership" onclick="switchAboutTab('leadership', this)">Leadership</button>
        <button class="tab tab-6 tab-btn" role="tab" data-tab="members" onclick="switchAboutTab('members', this)">Members</button>
        <button class="tab tab-7 tab-btn" role="tab" data-tab="mentors" onclick="switchAboutTab('mentors', this)">Mentors</button>
      </div>

      <div class="content content-2 tab-card">
        <!-- Tab 1: Overview -->
        <div class="content__section visible" id="tab-overview">
          <h1>Team Overview</h1>
          <h2>History</h2>
          <p>${escapeHtml(data.aboutOverview.historyParagraph)}</p>
          <h2>Mission Statement</h2>
          <p>${escapeHtml(data.aboutOverview.missionParagraph)}</p>
          <h2>Team Goals</h2>
          <ul class="goals-list">
${data.aboutOverview.goalsList.map((g) => `            <li>${escapeHtml(g)}</li>`).join('\n')}
          </ul>
        </div>

        <!-- Tab 2: About FIRST -->
        <div class="content__section" id="tab-first">
          <h1>About FIRST</h1>
          <h2>What is FIRST?</h2>
          <p>${escapeHtml(data.aboutOverview.firstIntroParagraph)}</p>
          <h2>FIRST Robotics Competition (FRC)</h2>
          <p>${escapeHtml(data.aboutOverview.frcParagraph)}</p>
          ${
            data.aboutOverview.firstValuesParagraph
              ? `<p>${escapeHtml(data.aboutOverview.firstValuesParagraph)}</p>`
              : ''
          }
        </div>

        <!-- Tab 3: Team History -->
        <div class="content__section" id="tab-history">
          <h1>Team History</h1>
          <p>We pride ourselves in our long and successful history as a team. Here is a glimpse of our past.</p>

          <div class="cd-horizontal-timeline loaded">
            <div class="timeline">
              <button type="button" class="timeline-nav-btn prev" aria-label="Previous years" onclick="scrollTimelineTrack(-1)">
                <i class="fas fa-chevron-left"></i>
              </button>
              <div class="events-wrapper" id="timeline-events-wrapper">
                <div class="events-track" id="timeline-events-track">
                  <span class="filling-line" id="timeline-filling-line"></span>
${data.seasons
  .map(
    (s, idx) =>
      `                  <button type="button" class="timeline-year-dot ${idx === 0 ? 'active selected' : ''}" data-year="${s.year}" data-idx="${idx}" onclick="selectHistoryYear(${s.year}, this)">
                    <span class="year-label">${s.year}</span>
                    <span class="year-dot"></span>
                  </button>`
  )
  .join('\n')}
                </div>
              </div>
              <button type="button" class="timeline-nav-btn next" aria-label="Next years" onclick="scrollTimelineTrack(1)">
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>

            <div class="events-content">
${data.seasons
  .map(
    (s, idx) => `              <div class="history-year-panel ${idx === 0 ? 'visible selected' : ''}" id="history-year-${s.year}">
                <div class="history-cols">
                  <div class="history-details-col">
                    <h2 class="history-season-year">${s.year}</h2>
                    <em class="history-season-game">${escapeHtml(s.game)}</em>
                    <h3>Awards</h3>
                    <ul class="history-detail-list">
${s.awards.map((a) => `                      <li>${escapeHtml(a)}</li>`).join('\n')}
                    </ul>
                    <h3>Leadership</h3>
                    <ul class="history-detail-list">
${s.leadership.map((l) => `                      <li>${escapeHtml(l)}</li>`).join('\n')}
                    </ul>
                  </div>
                  ${
                    s.teamImage
                      ? `<div class="history-photo-col">
                    <div class="history-photo">
                      <img src="${escapeHtml(s.teamImage)}" alt="MVRT ${s.year} Team" loading="lazy" onerror="this.parentElement.style.display='none';" />
                    </div>
                  </div>`
                      : ''
                  }
                </div>
              </div>`
  )
  .join('\n')}
            </div>
          </div>
        </div>

        <!-- Tab 4: Past Robots -->
        <div class="content__section" id="tab-robots">
          <h1>Past Robots</h1>
          <p>A look back at our robots throughout the years.</p>
${pastRobots
  .map(
    (s) => `          <div class="bot-card">
            <div class="bot-card__info">
              <div class="bot-card__year">${s.year} Season:</div>
              <span class="bot-card__game">${escapeHtml(s.game)}</span>
              <div class="bot-card__label">Robot:</div>
              <div class="bot-card__name">${escapeHtml(s.robotName || '')}</div>
              ${
                s.technicalBinderUrl
                  ? `<a class="bot-card__binder" href="${escapeHtml(s.technicalBinderUrl)}" target="_blank" rel="noopener">TECHNICAL BINDER</a>`
                  : ''
              }
            </div>
            <div class="bot-card__image bot-card__media">
              <img class="bot-circle-img" src="${escapeHtml(s.robotImage || '')}" alt="${escapeHtml(s.robotName || `${s.year} Robot`)}" loading="lazy" />
            </div>
          </div>`
  )
  .join('\n')}
        </div>

        <!-- Tab 5: Leadership -->
        <div class="content__section team" id="tab-leadership">
          <h1>Leadership</h1>
${tiers
  .map((tier) => {
    const leaders = data.leadership.filter((l) => l.tier === tier);
    if (!leaders.length) return '';
    return `          <h2 class="text-center tier-heading">${escapeHtml(tier)}</h2>
          <div class="leadership-grid">
${leaders
  .map((l) => {
    const fallbackUri = makeAvatarSvgDataUri(l.name);
    const imgSrc = l.imageUrl ? escapeHtml(l.imageUrl) : fallbackUri;
    return `            <div class="profile-box">
              <img class="leader-portrait" src="${imgSrc}" alt="${escapeHtml(l.name)}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackUri}';" />
              <h3>${escapeHtml(l.name)}</h3>
              <h4 class="role-label"><i>${escapeHtml(l.role)}</i></h4>
              <div class="btn-container">
                <a class="btn btn-main btn-main-sm" href="mailto:${escapeHtml(l.email)}"><i class="far fa-envelope"></i> Email</a>
              </div>
            </div>`;
  })
  .join('\n')}
          </div>`;
  })
  .join('\n')}
        </div>

        <!-- Tab 6: Members -->
        <div class="content__section" id="tab-members">
          <div class="members-header-row">
            <h1>Members</h1>
            <div class="member-search-bar">
              <i class="fas fa-search"></i>
              <input type="search" id="member-search-input" placeholder="Search ${sortedMembers.length} members..." aria-label="Search members" oninput="filterMembersList(this.value)" />
              <span class="member-count-pill" id="member-search-count">${sortedMembers.length} members</span>
            </div>
          </div>
          <ul class="memberlist" id="about-memberlist">
${sortedMembers
  .map(
    (m) =>
      `            <li data-member="${escapeHtml(m.toLowerCase())}">${escapeHtml(m)}</li>`
  )
  .join('\n')}
          </ul>
          <p id="member-search-empty" class="member-search-empty" style="display: none;">No members found matching your search.</p>
        </div>

        <!-- Tab 7: Mentors -->
        <div class="content__section" id="tab-mentors">
          <h1>Mentors</h1>
          <p>${escapeHtml(data.mentors.introText)}</p>
          <h2>Head Mentors</h2>
          <ul class="memberlist">
${data.mentors.headMentors.map((m) => `            <li>${escapeHtml(m)}</li>`).join('\n')}
          </ul>
          <h2>Current Mentors</h2>
          <ul class="memberlist">
${data.mentors.currentMentors.map((m) => `            <li>${escapeHtml(m)}</li>`).join('\n')}
          </ul>
          <h2>Past Mentors</h2>
          <ul class="memberlist">
${data.mentors.pastMentors.map((m) => `            <li>${escapeHtml(m)}</li>`).join('\n')}
          </ul>
        </div>
      </div>
    </div>
  </section>

${renderSharedFooter(data)}

  <script>
    function switchAboutTab(tabId, btn) {
      document.querySelectorAll('#tab-overview, #tab-first, #tab-history, #tab-robots, #tab-leadership, #tab-members, #tab-mentors').forEach(function(sec) {
        sec.classList.remove('visible');
      });
      document.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      var target = document.getElementById('tab-' + tabId);
      if (target) target.classList.add('visible');
      if (btn) {
        btn.classList.add('active');
      } else {
        var matchedBtn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
        if (matchedBtn) matchedBtn.classList.add('active');
      }
    }

    function selectHistoryYear(year, btn) {
      document.querySelectorAll('.history-year-panel').forEach(function(p) {
        p.classList.remove('visible', 'selected');
      });
      var dots = Array.prototype.slice.call(document.querySelectorAll('.timeline-year-dot'));
      var activeIdx = 0;
      dots.forEach(function(d, idx) {
        d.classList.remove('active', 'selected', 'older-event');
        if (d === btn || Number(d.getAttribute('data-year')) === Number(year)) {
          activeIdx = idx;
        }
      });
      dots.forEach(function(d, idx) {
        if (idx < activeIdx) d.classList.add('older-event');
        if (idx === activeIdx) d.classList.add('active', 'selected');
      });

      var panel = document.getElementById('history-year-' + year);
      if (panel) panel.classList.add('visible', 'selected');

      var activeBtn = dots[activeIdx];
      var wrapper = document.getElementById('timeline-events-wrapper');
      var filling = document.getElementById('timeline-filling-line');
      if (activeBtn && filling) {
        var centerPos = activeBtn.offsetLeft + activeBtn.offsetWidth / 2;
        filling.style.width = centerPos + 'px';
      }
      if (activeBtn && wrapper) {
        var scrollLeft = activeBtn.offsetLeft - wrapper.clientWidth / 2 + activeBtn.offsetWidth / 2;
        wrapper.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
      }
    }

    function scrollTimelineTrack(dir) {
      var wrapper = document.getElementById('timeline-events-wrapper');
      if (wrapper) {
        wrapper.scrollBy({ left: dir * 280, behavior: 'smooth' });
      }
    }

    function filterMembersList(query) {
      var q = String(query || '').trim().toLowerCase();
      var items = document.querySelectorAll('#about-memberlist li');
      var visibleCount = 0;
      items.forEach(function(li) {
        var name = li.getAttribute('data-member') || li.textContent.toLowerCase();
        var show = !q || name.indexOf(q) !== -1;
        li.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });
      var countEl = document.getElementById('member-search-count');
      if (countEl) {
        countEl.textContent = q
          ? visibleCount + ' of ' + items.length + ' members'
          : items.length + ' members';
      }
      var emptyEl = document.getElementById('member-search-empty');
      if (emptyEl) {
        emptyEl.style.display = visibleCount === 0 ? 'block' : 'none';
      }
    }

    (function() {
      var firstDot = document.querySelector('.timeline-year-dot.active');
      if (firstDot) {
        var filling = document.getElementById('timeline-filling-line');
        if (filling) {
          filling.style.width = (firstDot.offsetLeft + firstDot.offsetWidth / 2) + 'px';
        }
      }
      var hash = (window.location.hash || '').replace('#', '');
      var validTabs = ['overview', 'first', 'history', 'robots', 'leadership', 'members', 'mentors'];
      if (validTabs.indexOf(hash) !== -1) {
        switchAboutTab(hash);
      }
    })();
  </script>
</body>
</html>`;
}

function generateOutreachHtml(data: MvrtSiteData): string {
  return `${renderSharedHead('Outreach', data)}
<body>
${renderSharedNavbar('outreach', data)}
${renderSubpageHeader('Outreach')}

  <section class="outreach-section">
    <div class="container">
      <ul class="programs-list">
${data.outreach
  .map((prog, idx) => {
    const alignClass = idx % 2 === 0 ? 'float-left align-left' : 'float-right align-right';
    const hasPrimary = Boolean(prog.primaryButtonText && prog.primaryButtonUrl);
    const hasSecondary = Boolean(prog.secondaryButtonText && prog.secondaryButtonUrl);
    return `        <li class="program-card clearfix ${alignClass}">
          <div class="program-image">
            <img class="program-photo" src="${escapeHtml(prog.imageUrl)}" alt="${escapeHtml(prog.title)} program" loading="lazy" />
          </div>
          <div class="program-text program-copy">
            <h2>${escapeHtml(prog.title)}</h2>
            <p>${escapeHtml(prog.description)}</p>
            ${
              prog.partnerLogoUrl
                ? `<div class="polygence-mini-logo"><img src="${escapeHtml(prog.partnerLogoUrl)}" alt="${escapeHtml(prog.title)} Partner" loading="lazy" /></div>`
                : ''
            }
            ${
              hasPrimary || hasSecondary
                ? `<div class="program-links">
              ${
                hasPrimary
                  ? `<a class="join-btn" href="${escapeHtml(prog.primaryButtonUrl || '#')}" target="_blank" rel="noopener">${escapeHtml(prog.primaryButtonText || '')}</a>`
                  : ''
              }
              ${
                hasSecondary
                  ? `<a class="resources-btn" href="${escapeHtml(prog.secondaryButtonUrl || '#')}" target="_blank" rel="noopener">${escapeHtml(prog.secondaryButtonText || '')}</a>`
                  : ''
              }
            </div>`
                : ''
            }
          </div>
        </li>`;
  })
  .join('\n')}
      </ul>
    </div>
  </section>

${renderSharedFooter(data)}
</body>
</html>`;
}

function generateCalendarHtml(data: MvrtSiteData): string {
  return `${renderSharedHead('Calendar', data)}
<body>
${renderSharedNavbar('calendar', data)}
${renderSubpageHeader('Calendar')}

  <section class="information">
    <div class="container">
      <div class="content tab-card text-center">
        <h1>Calendar</h1>
        <p>If you have any questions about upcoming events, or something doesn't look quite right, please <a href="contact.html">let us know</a>! The calendar is best viewed on a computer.</p>
        <div class="calendar-embed-wrapper aspect4by3">
          <iframe src="${escapeHtml(data.meta.calendarEmbedUrl)}" style="border: 0" width="100%" height="650" frameborder="0" scrolling="no" title="MVRT Team Calendar"></iframe>
        </div>
${
  data.eventsConfig.items.length > 0
    ? `        <div style="margin-top: 36px; text-align: left;">
          <h2>Scheduled MVRT Events (${data.eventsConfig.items.length})</h2>
          <div class="grid-3">
${data.eventsConfig.items
  .map(
    (ev) => `            <div class="event">
              <div class="big">${escapeHtml(ev.title)}</div>
              <h4>${escapeHtml(ev.dateText)}</h4>
              ${ev.location ? `<p style="font-size: 14px; margin: 6px 0 0;">${escapeHtml(ev.location)}</p>` : ''}
            </div>`
  )
  .join('\n')}
          </div>
        </div>`
    : ''
}
      </div>
    </div>
  </section>

${renderSharedFooter(data)}
</body>
</html>`;
}

function generateResourcesHtml(data: MvrtSiteData): string {
  return `${renderSharedHead('Resources', data)}
<body>
${renderSharedNavbar('resources', data)}
${renderSubpageHeader('Resources')}

  <section class="resources-section">
    <div class="container">
${data.resources
  .map(
    (div) => `      <div class="resource-division">
        <h2 class="division-title">${escapeHtml(div.division)}</h2>
        ${
          div.comingSoon || div.items.length === 0
            ? `<div class="coming-soon-box">Coming Soon</div>`
            : `<div class="resource-list">
${div.items
  .map(
    (item) => `          <a class="resource-row" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
            <div class="resource-thumb">
              <img src="${escapeHtml(item.thumbnailUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" />
            </div>
            <div class="resource-title-box">
              <h3>${escapeHtml(item.title)}</h3>
              ${item.badge ? `<span class="resource-badge">${escapeHtml(item.badge)}</span>` : ''}
            </div>
          </a>`
  )
  .join('\n')}
        </div>`
        }
      </div>`
  )
  .join('\n')}
    </div>
  </section>

${renderSharedFooter(data)}
</body>
</html>`;
}

function generateContactHtml(data: MvrtSiteData): string {
  return `${renderSharedHead('Contact', data)}
<body>
${renderSharedNavbar('contact', data)}
${renderSubpageHeader('Contact')}

  <section class="contactform">
    <div class="container">
      <form id="contact" action="${escapeHtml(data.meta.contactFormEndpoint)}" method="POST">
        <div class="head">
          <h2>Contact Us Here</h2>
        </div>
        <input type="text" name="name" placeholder="Name" required />
        <br />
        <input type="email" name="_replyto" placeholder="Email" required />
        <br />
        <textarea name="message" rows="6" placeholder="Message" required></textarea>
        <br />
        <div class="message">Message Sent!</div>
        <button id="submit" type="submit">Send Message</button>
      </form>
    </div>
  </section>

${renderSharedFooter(data)}
</body>
</html>`;
}

function generateSponsorsHtml(data: MvrtSiteData): string {
  const promoTextEscaped = escapeHtml(data.sponsorsPage.promoBannerText);
  const promoCodeEscaped = escapeHtml(data.sponsorsPage.promoCode);
  const formattedPromo =
    promoCodeEscaped && promoTextEscaped.includes(promoCodeEscaped)
      ? promoTextEscaped.replace(
          promoCodeEscaped,
          `<strong class="promo-code-highlight">${promoCodeEscaped}</strong>`
        )
      : promoTextEscaped;

  return `${renderSharedHead('Sponsors', data)}
<body>
${renderSharedNavbar('sponsors', data)}
${renderSubpageHeader('Sponsors')}

  <section class="sponsors-section">
    <div class="container text-center">
      <div class="heading">
        <h2 class="subheading">${escapeHtml(data.sponsorsPage.heading)}</h2>
      </div>
      <div class="sponsor-grid sponsorrow">
${data.sponsorsPage.sponsors
  .map(
    (sp) => `        <a class="sponsor-item" href="${escapeHtml(sp.websiteUrl)}" target="_blank" rel="noopener" title="${escapeHtml(sp.name)}">
          <img class="sponsorimg" src="${escapeHtml(sp.logoUrl)}" alt="${escapeHtml(sp.name)}" loading="lazy" />
        </a>`
  )
  .join('\n')}
      </div>
      <div class="sponsor-callout">
        <h3 class="promo-text">${formattedPromo}</h3>
        <div class="sponsor-doc-links">
          <a href="${escapeHtml(data.sponsorsPage.grantImpactReportUrl)}" target="_blank" rel="noopener">Grant Impact Report</a>
          <span class="divider-pipe">&nbsp;|&nbsp;</span>
          <a href="${escapeHtml(data.sponsorsPage.sponsorPacketUrl)}" target="_blank" rel="noopener">Sponsor Packet</a>
        </div>
      </div>
    </div>
  </section>

${renderSharedFooter(data)}
</body>
</html>`;
}

function generateNewslettersHtml(data: MvrtSiteData): string {
  return `${renderSharedHead('Newsletters', data)}
<body>
${renderSharedNavbar('newsletters', data)}
${renderSubpageHeader('Newsletters')}

  <section class="newsletters-section">
    <div class="container">
      <div class="newsletter-grid">
${data.newsletters
  .map(
    (nl) => `        <a class="link-box gallery-card" href="${escapeHtml(nl.pdfUrl)}" target="_blank" rel="noopener">
          <div class="gallery">
            <div class="gallery-thumb">
              <img src="${escapeHtml(nl.thumbnailUrl)}" alt="${escapeHtml(nl.title)}" loading="lazy" />
            </div>
            <div class="desc gallery-body">
              <h3>${escapeHtml(nl.title)}</h3>
              <p>${escapeHtml(nl.summary)}</p>
            </div>
          </div>
        </a>`
  )
  .join('\n')}
      </div>
    </div>
  </section>

${renderSharedFooter(data)}
</body>
</html>`;
}

function generateJoinHtml(data: MvrtSiteData): string {
  return `${renderSharedHead('Join', data)}
<body>
${renderSharedNavbar('join', data)}
${renderSubpageHeader('Join')}

  <section class="information">
    <div class="container">
      <p class="join-intro">${formatJoinIntroHtml(data.joinPage.introParagraph)}</p>
      <div class="tabs" role="tablist">
        <button class="tab tab-1 tab-btn active" role="tab" onclick="switchJoinTab('regular', this)">Regular Season</button>
        <button class="tab tab-2 tab-btn" role="tab" onclick="switchJoinTab('faqs', this)">FAQs</button>
      </div>
      <div class="content content-2 tab-card">
        <div class="content__section visible text-center" id="join-tab-regular">
          <h1>${escapeHtml(
            data.meta.registrationOpen
              ? data.joinPage.regularSeasonHeading
              : data.joinPage.closedSeasonHeading
          )}</h1>
          <h3>${
            data.meta.registrationOpen
              ? formatJoinRegularBodyHtml(
                  data.joinPage.regularSeasonBody,
                  data.meta.interestFormUrl
                )
              : escapeHtml(data.joinPage.closedSeasonBody)
          }</h3>
          ${
            data.meta.registrationOpen
              ? `<div style="margin: 28px 0;">
            <a class="btn btn-main" href="${escapeHtml(data.meta.interestFormUrl)}" target="_blank" rel="noopener">Open Interest Form <i class="fas fa-arrow-right"></i></a>
          </div>`
              : ''
          }
          <h3 style="margin-top: 28px;">Questions? <a href="contact.html">Contact Us</a>!</h3>
        </div>
        <div class="content__section" id="join-tab-faqs">
          <h1>Frequently Asked Questions</h1>
          <div class="faq-list">
${data.joinPage.faqs
  .map(
    (faq, idx) => `            <div class="faq-item">
              <h3>${idx + 1}. ${escapeHtml(faq.question)}</h3>
              <p>${escapeHtml(faq.answer)}</p>
            </div>`
  )
  .join('\n')}
          </div>
        </div>
      </div>
    </div>
  </section>

${renderSharedFooter(data)}

  <script>
    function switchJoinTab(tabId, btn) {
      document.querySelectorAll('#join-tab-regular, #join-tab-faqs').forEach(function(sec) {
        sec.classList.remove('visible');
      });
      document.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      var target = document.getElementById('join-tab-' + tabId);
      if (target) target.classList.add('visible');
      if (btn) btn.classList.add('active');
    }
  </script>
</body>
</html>`;
}

function generateStyleCss(): string {
  return `/* ==========================================================================
   MVRT.com Unified Production Stylesheet (FRC Team 115)
   Brand Colors: #662d91 (MVRT Purple), #4f2cca (Tab Active), #3b4045 (Headings)
   Typography: Josefin Sans (Body & Headings), Montserrat (Logo)
   ========================================================================== */

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  font-family: "Josefin Sans", sans-serif;
  font-size: 16px;
  font-weight: 300;
  line-height: 25px;
  color: #3b4045;
  background-color: #ffffff;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  transition: 0.2s;
}

h1, h2, h3, h4, h5, h6 {
  font-family: "Josefin Sans", sans-serif;
  color: #3b4045;
  font-weight: 300;
  margin: 0;
}

h1 {
  font-size: 44px;
  line-height: 50px;
}

h2 {
  font-size: 30px;
  line-height: 36px;
}

h3 {
  font-size: 23px;
  line-height: 28px;
}

h4 {
  font-size: 20px;
  line-height: 25px;
  font-weight: 400;
}

p {
  font-size: 18px;
  line-height: 26px;
  color: #4a4f55;
  margin: 0 0 16px;
}

ul {
  padding: 0;
  margin: 0;
  list-style: none;
}

a {
  color: #0275d8;
  text-decoration: none;
  transition: all 0.2s ease-in-out 0s;
}

a:hover,
a:focus {
  color: #662d91;
  text-decoration: none;
  outline: 0;
}

.container {
  width: 90%;
  max-width: 1180px;
  margin: 0 auto;
}

.text-center {
  text-align: center;
}

.purple-accent {
  color: #662d91;
}

.clearfix::after {
  content: "";
  display: table;
  clear: both;
}

/* ==========================================================================
   Global Navigation & Animated SVG Hamburger
   ========================================================================== */
.nav-container {
  width: 100%;
  max-width: 100%;
  min-height: 76px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 100;
  background-color: #ffffff;
  padding: 0 4vw;
}

#home-nav,
.nav-container.home-nav {
  background-image: linear-gradient(to right, #fff 0%, 35vw, #662d9100 100%);
  background-color: transparent;
}

.nav-box {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding-top: 0.5vh;
}

.logo {
  user-select: none;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 120px;
  padding: 0;
  z-index: 11;
  transition: 0.28s cubic-bezier(0.25, 0.1, 0.2, 1.2);
}

.logo h1 {
  color: #662d91;
  font-size: 40px;
  font-family: "Montserrat", sans-serif;
  font-weight: 500;
  margin: 8px 0 0;
  line-height: 1;
  position: relative;
  display: inline-block;
}

#menubtn {
  display: none;
}

.menu {
  margin-top: 10px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.menu li {
  display: inline-block;
  margin: 0 12px;
}

.menu li a {
  color: #444;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-align: center;
  text-decoration: none;
  position: relative;
  padding-bottom: 4px;
}

.menu li a::after,
.logo h1::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 0%;
  margin-left: 50%;
  height: 2px;
  transition: 0.15s ease;
  background-color: #662d91;
}

.logo h1::after {
  height: 3px;
  bottom: -4px;
}

.menu li:last-of-type a::after {
  display: none;
}

.menu li a:hover::after,
.menu li a:focus::after,
.logo h1:hover::after,
.logo h1:focus::after,
.menu li.active a::after {
  width: 100%;
  margin-left: 0;
}

/* ==========================================================================
   Pill Buttons (.btn-main, .btn-main-nav, .btn-main-alt)
   ========================================================================== */
.btn-main,
.btn-main-nav {
  color: #fff !important;
  border-radius: 30px;
  font-size: 18px;
  padding: 15px 40px;
  display: inline-block;
  background-color: #662d91;
  border: none;
  cursor: pointer;
  box-shadow: 0 15px 40px rgba(173, 120, 251, 0.5);
  background-image: linear-gradient(
    to top,
    rgba(188, 145, 252, 0) 0%,
    rgba(173, 120, 251, 0.25) 100%
  );
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.btn-main:hover,
.btn-main:focus,
.btn-main-nav:hover,
.btn-main-nav:focus {
  background-color: #662d91 !important;
  color: #fff !important;
  transform: translateY(-2px);
  box-shadow: 0 18px 44px rgba(102, 45, 145, 0.58);
}

.btn-main-sm,
.btn-main-nav-sm {
  padding: 12px 35px;
  text-transform: uppercase;
  font-size: 14px;
  font-weight: 700;
}

.btn-main-alt {
  color: #000 !important;
  border-radius: 30px;
  font-size: 18px;
  font-weight: 600;
  padding: 15px 40px;
  margin: 10px 0;
  display: inline-block;
  background-color: #fff;
  background-image: linear-gradient(
    120deg,
    rgba(245, 244, 244, 0.9) 0%,
    rgba(255, 255, 255, 0.95) 100%
  );
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-main-alt:hover,
.btn-main-alt:focus {
  background-color: #fff;
  color: #3d3d3d !important;
  transform: translateY(-2px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);
}

/* ==========================================================================
   Hero Section & Crossfade Slide Carousel
   ========================================================================== */
.hero-area {
  position: relative;
  min-height: 86vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background-image: linear-gradient(to right, #fff 0%, 35vw, #662d9100 100%);
}

.splashing {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
}

.hero-slides {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-slide {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: right center;
  opacity: 0;
  transition: opacity 1.1s ease-in-out;
}

.hero-slide.active {
  opacity: 1;
}

.hero-slide .splash-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: right center;
  display: block;
}

.hero-gradient-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  background-image: linear-gradient(to right, #fff 0%, 35vw, #662d9100 100%);
}

.hero-content {
  position: relative;
  z-index: 3;
}

.hero-block {
  max-width: 650px;
  padding: 40px 0;
}

.hero-area h1 {
  font-size: 60px;
  font-weight: 700;
  color: #3d3d3d;
  padding-bottom: 19px;
  margin-top: 20px;
  line-height: 1.2;
}

.hero-area p {
  font-size: 20px;
  line-height: 1.4;
  color: #3d3d3d;
  margin-bottom: 10px;
}

.hero-area .btn-main {
  margin-top: 24px;
}

.typed-cursor {
  opacity: 1;
  font-weight: 300;
}

.typed-cursor.typed-cursor--blink {
  animation: typedjsBlink 0.7s infinite;
}

@keyframes typedjsBlink {
  50% {
    opacity: 0;
  }
}

/* ==========================================================================
   Homepage Sections: Upcoming Events, Registration CTA, At A Glance, Newsletter
   ========================================================================== */
.section {
  padding: 90px 0;
}

.feature.section {
  padding-top: 40px;
  padding-bottom: 90px;
  background-color: #ffffff;
}

.heading {
  text-align: center;
  color: #777777;
  padding-bottom: 36px;
}

.heading h2 {
  color: #3c3c3c;
  padding-bottom: 12px;
  text-transform: capitalize;
  font-weight: 700;
  font-size: 40px;
  line-height: 44px;
}

.heading h3 {
  font-size: 22px;
  font-weight: 300;
  color: #596168;
}

.subheading {
  color: #3c3c3c;
  padding-bottom: 15px;
  text-transform: capitalize;
  font-weight: 700;
  font-size: 38px;
  line-height: 45px;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  align-items: start;
}

.feature .events {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  padding: 0 10px;
}

.feature .events > p {
  margin: 0;
  color: #662d91;
  font-weight: 700;
  font-size: 20px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.feature .events > h3 {
  color: #596168;
  font-size: 18px;
  line-height: 1.45;
  font-weight: 300;
}

.feature .events .event {
  min-height: 106px;
  padding: 20px 22px;
  border: 1px solid #e8e1ed;
  border-left: 5px solid #662d91;
  border-radius: 5px;
  background: #fff;
  text-align: left;
  box-shadow: 0 4px 14px rgba(102, 45, 145, 0.04);
}

.feature .events .event .big {
  color: #3b4045;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  margin: 0;
}

.feature .events .event h4 {
  margin-top: 10px;
  color: #662d91;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.feature .events .event .event-location {
  margin-top: 4px;
  font-size: 14px;
  color: #777;
}

/* Parallax Purple Gradient Banners */
.third-section,
.call-to-action {
  background: linear-gradient(
      125deg,
      rgba(62, 28, 87, 0.93) 0%,
      rgba(116, 81, 152, 0.84) 100%
    ),
    url("https://mvrt.com/assets/images/thirdbg.jpg") no-repeat center;
  background-attachment: fixed;
  background-repeat: no-repeat;
  background-size: cover;
  padding: 90px 0;
  color: #fff;
  position: relative;
}

.third-section h2 {
  color: #fff;
  font-weight: 700;
  font-size: 34px;
  margin-bottom: 10px;
  text-align: left;
}

.third-section p {
  color: #fff;
  font-size: 18px;
  margin: 0;
}

.cta-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

.cta-copy {
  flex: 1 1 520px;
}

/* Team At A Glance */
.glance-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 48px;
  margin-bottom: 72px;
}

.glance-row:last-child {
  margin-bottom: 0;
}

.program-images {
  border-radius: 50%;
  width: 310px;
  height: 310px;
  max-width: 78%;
  object-fit: cover;
  background: #fff;
  box-shadow: 0px 0px 37px 13px rgba(0, 0, 0, 0.38);
}

#robot-image {
  padding: 5%;
  object-fit: contain;
}

.stat-item {
  margin-bottom: 24px;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.stat-item h3 {
  font-size: 23px;
  font-weight: 300;
  color: #3b4045;
  margin-bottom: 4px;
}

.stat-item h1 {
  font-size: 46px;
  font-weight: 300;
  color: #3b4045;
}

.glance-season h2 {
  font-size: 32px;
  font-weight: 500;
  color: #3b4045;
  margin-bottom: 2px;
}

.glance-game-name {
  display: block;
  font-style: italic;
  font-size: 16px;
  color: #555;
  margin-bottom: 20px;
}

.glance-season h3 {
  font-size: 23px;
  font-weight: 300;
  color: #3b4045;
  margin-bottom: 6px;
}

.glance-season .robot-heading {
  margin-top: 20px;
}

.awards-stack h4 {
  font-size: 19px;
  font-weight: 400;
  color: #3b4045;
  line-height: 1.38;
  margin: 3px 0;
}

/* Newsletter Call-To-Action */
.call-to-action .block h2 {
  color: #fff;
  font-size: 38px;
  font-weight: 600;
  margin-bottom: 10px;
}

.call-to-action .block p {
  color: #fff;
  font-size: 18px;
  margin-bottom: 0;
}

.newsletter-form {
  display: flex;
  justify-content: center;
  max-width: 560px;
  margin: 30px auto 0;
}

.newsletter-form input {
  flex: 1;
  height: 50px;
  border-top-left-radius: 40px;
  border-bottom-left-radius: 40px;
  border: none;
  padding: 0 22px;
  font-family: "Josefin Sans", sans-serif;
  font-size: 16px;
  color: #3b4045;
  outline: none;
}

.newsletter-form .btn-main {
  height: 50px;
  padding: 0 40px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-top-right-radius: 40px;
  border-bottom-right-radius: 40px;
}

/* ==========================================================================
   Subpage Header (.header-secondary) & Tabbed Containers (.information)
   ========================================================================== */
.header-secondary {
  min-height: 18vh;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 36px 0 12px;
  position: relative;
}

.header-secondary .title {
  font-size: 60px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  color: #3b4045;
  margin: 0;
}

.subpage-divider {
  border: 0;
  border-top: 1px solid #ece8f0;
  width: 92%;
  margin: 0 auto 30px;
}

.information {
  padding-bottom: 90px;
}

.information .container {
  position: relative;
  margin: 20px auto;
  padding: 20px;
  width: 78%;
  max-width: 1080px;
  border-radius: 2px;
}

.information .container .tabs {
  display: flex;
  position: relative;
  z-index: 3;
  width: 100%;
  flex-wrap: wrap;
}

.information .container .tabs .tab,
.tab-btn {
  text-align: center;
  background: #fff;
  border: none;
  border-bottom: 2px solid transparent;
  font-family: "Josefin Sans", sans-serif;
  font-weight: 700;
  font-size: 14px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  color: #0275d8;
  display: inline-block;
}

.information .container .tabs .tab:hover,
.tab-btn:hover {
  color: #4f2cca;
  background-color: rgba(79, 44, 202, 0.1);
}

.information .container .tabs .tab.active,
.tab-btn.active {
  color: #4f2cca;
  background-color: rgba(79, 44, 202, 0.09);
  border-bottom: 2px solid #4f2cca;
}

.information .container .content,
.information .container .content-2,
.tab-card {
  position: relative;
  background-color: #fff;
  padding: 40px;
  box-shadow: 0 0.125rem 0.375rem 0 rgba(0, 0, 0, 0.12);
  width: 100%;
  border-radius: 2px;
}

.content__section {
  display: none;
}

.content__section.visible {
  display: block;
  animation: fadeInSection 0.3s ease;
}

@keyframes fadeInSection {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.content__section h1 {
  font-size: 44px;
  font-weight: 300;
  color: #3b4045;
  margin-bottom: 22px;
}

.content__section h2 {
  font-size: 28px;
  font-weight: 400;
  color: #3b4045;
  margin: 24px 0 10px;
}

.goals-list {
  list-style: disc;
  padding-left: 24px;
}

.goals-list li {
  font-size: 18px;
  line-height: 26px;
  color: #4a4f55;
  margin-bottom: 8px;
}

/* ==========================================================================
   About Page: Team History Horizontal Timeline (.cd-horizontal-timeline)
   ========================================================================== */
.cd-horizontal-timeline {
  margin: 2.5em auto 1em;
}

.cd-horizontal-timeline .timeline {
  position: relative;
  height: 100px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
}

.timeline-nav-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #dfdfdf;
  background: #fff;
  color: #662d91;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
  z-index: 3;
}

.timeline-nav-btn:hover {
  border-color: #662d91;
  background: rgba(102, 45, 145, 0.06);
}

.cd-horizontal-timeline .events-wrapper {
  position: relative;
  height: 100%;
  flex: 1;
  margin: 0 12px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.cd-horizontal-timeline .events-wrapper::-webkit-scrollbar {
  display: none;
}

.cd-horizontal-timeline .events-track {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 100%;
  height: 100%;
  padding: 0 24px;
  gap: 32px;
}

.cd-horizontal-timeline .events-track::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 58px;
  height: 2px;
  background: #dfdfdf;
  z-index: 1;
}

.cd-horizontal-timeline .filling-line {
  position: absolute;
  left: 0;
  top: 58px;
  height: 2px;
  width: 48px;
  background-color: #662d91;
  z-index: 1;
  transition: width 0.3s ease;
}

.timeline-year-dot {
  position: relative;
  z-index: 2;
  background: none;
  border: none;
  padding: 0 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: "Josefin Sans", sans-serif;
  color: #383838;
  flex-shrink: 0;
}

.timeline-year-dot .year-label {
  font-size: 19px;
  font-weight: 300;
  margin-bottom: 12px;
  transition: color 0.2s ease, font-weight 0.2s ease;
}

.timeline-year-dot .year-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #dfdfdf;
  background-color: #f8f8f8;
  transition: all 0.25s ease;
}

.timeline-year-dot:hover .year-dot,
.timeline-year-dot.active .year-dot {
  background-color: #662d91;
  border-color: #662d91;
  transform: scale(1.15);
}

.timeline-year-dot.older-event .year-dot {
  border-color: #662d91;
}

.timeline-year-dot.active .year-label {
  color: #662d91;
  font-weight: 700;
}

.history-year-panel {
  display: none;
  padding-top: 16px;
}

.history-year-panel.visible {
  display: block;
}

.history-cols {
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 36px;
  align-items: start;
}

.history-season-year {
  font-size: 64px !important;
  font-weight: 700 !important;
  line-height: 1.1;
  color: #3b4045;
  margin: 0 0 6px !important;
}

.history-season-game {
  display: block;
  font-style: italic;
  font-size: 18px;
  color: #777;
  margin-bottom: 20px;
}

.history-details-col h3 {
  font-size: 24px;
  font-weight: 400;
  color: #3b4045;
  margin: 18px 0 8px;
}

.history-detail-list li {
  font-size: 16px;
  line-height: 1.55;
  color: #555;
  margin-bottom: 4px;
}

.history-photo img {
  width: 100%;
  max-width: 580px;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.14);
}

/* ==========================================================================
   About Page: Past Robots (.bot-card)
   ========================================================================== */
.bot-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60px;
  padding: 50px 20px;
  border-bottom: 1px solid #eee;
}

.bot-card:last-child {
  border-bottom: none;
}

.bot-card__info {
  flex: 0 1 400px;
  text-align: center;
}

.bot-card__year {
  font-size: 30px;
  font-weight: 300;
  color: #3b4045;
  margin-bottom: 5px;
}

.bot-card__game {
  font-size: 26px;
  font-style: italic;
  color: #888;
  display: block;
  margin-bottom: 25px;
}

.bot-card__label {
  font-size: 22px;
  color: #888;
  margin-bottom: 5px;
}

.bot-card__name {
  font-size: 20px;
  font-weight: 400;
  color: #3b4045;
}

.bot-card__binder {
  display: inline-block;
  margin-top: 15px;
  padding: 10px 28px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  color: #555;
  background-color: #eee;
  transition: all 0.25s ease;
}

.bot-card__binder:hover {
  background-color: #ddd;
  color: #333;
}

.bot-card__image {
  flex: 0 0 280px;
  max-width: 280px;
  text-align: center;
}

.bot-card__image img,
.bot-circle-img {
  width: 250px;
  height: 250px;
  object-fit: contain;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

/* ==========================================================================
   About Page: Leadership (.team .profile-box) & Members (.memberlist)
   ========================================================================== */
.team h2.tier-heading {
  text-align: center;
  text-decoration: underline;
  font-size: 30px;
  font-weight: 300;
  margin: 32px 0 20px;
}

.leadership-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
  margin-bottom: 28px;
}

.team .profile-box,
.profile-box {
  background: #f7f7f7;
  box-shadow: 0 2px 6px 0 rgba(47, 83, 151, 0.1);
  border-radius: 10px;
  padding: 22px 24px 26px;
  width: 250px;
  text-align: center;
  transition: box-shadow 300ms ease, transform 300ms ease;
}

.team .profile-box:hover,
.profile-box:hover {
  box-shadow: 0px 0px 20px 5px rgba(0, 0, 0, 0.18);
  transform: translateY(-2px);
}

.team .profile-box img,
.leader-portrait {
  margin-top: 8px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 2px 6px 0 rgba(47, 83, 151, 0.12);
  margin-bottom: 12px;
}

.profile-box h3 {
  font-size: 23px;
  font-weight: 300;
  margin: 8px 0 4px;
  color: #3b4045;
}

.profile-box h4.role-label {
  font-size: 18px;
  color: #666;
  margin-bottom: 16px;
}

.members-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 22px;
}

.members-header-row h1 {
  margin-bottom: 0;
}

.member-search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f7f5fa;
  border: 1px solid #dfd7e8;
  border-radius: 30px;
  padding: 8px 16px;
  min-width: 280px;
}

.member-search-bar i {
  color: #662d91;
  font-size: 14px;
}

.member-search-bar input {
  border: none;
  background: transparent;
  font-family: "Josefin Sans", sans-serif;
  font-size: 15px;
  color: #3b4045;
  outline: none;
  flex: 1;
}

.member-count-pill {
  font-size: 12px;
  font-weight: 700;
  color: #662d91;
  background: rgba(102, 45, 145, 0.1);
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
}

.memberlist {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px 18px;
}

.memberlist li {
  font-size: 16px;
  color: #3b4045;
  line-height: 1.45;
}

.member-search-empty {
  text-align: center;
  color: #888;
  padding: 24px 0;
}

/* ==========================================================================
   Outreach Page (.programs-list)
   ========================================================================== */
.outreach-section {
  padding-bottom: 80px;
}

.programs-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.programs-list li.program-card {
  position: relative;
  margin: 24px auto;
  width: 90%;
  background: #ffffff;
  padding: 28px 34px;
  border-radius: 2px;
  display: block;
  filter: drop-shadow(5px 5px 12px rgba(102, 45, 145, 0.28));
}

.programs-list .float-left .program-image {
  float: left;
  width: 38%;
  height: auto;
  margin: 6px 30px 16px 0;
}

.programs-list .float-right .program-image {
  float: right;
  width: 38%;
  height: auto;
  margin: 6px 0 16px 30px;
}

.programs-list .program-image img {
  border: solid 4px #550575;
  border-radius: 20px;
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

.programs-list h2 {
  padding: 12px 0 10px;
  font-size: 38px;
  line-height: 1.2;
  font-weight: 700;
  color: rgba(77, 26, 114, 0.933);
}

.programs-list p {
  font-size: 16px;
  line-height: 1.6;
  color: #222;
}

.programs-list .program-links {
  text-align: center;
  font-weight: 600;
  padding: 20px 0 8px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  clear: both;
}

.programs-list .program-links a {
  font-size: 17px;
  padding: 13px 28px;
  background: #662d91;
  color: #ffffff;
  border-radius: 10px;
  display: inline-block;
}

.programs-list .program-links a.resources-btn {
  background: #eeeeee;
  color: #3b4045;
}

.programs-list .program-links a.join-btn:hover {
  box-shadow: 0px 0px 20px 5px rgba(102, 45, 145, 0.4);
  color: #fff;
}

.programs-list .program-links a.resources-btn:hover {
  box-shadow: 0px 0px 20px 5px rgba(0, 0, 0, 0.2);
}

.polygence-mini-logo img {
  width: 110px;
  height: auto;
  border: 0;
  margin: 10px 0 4px;
}

/* ==========================================================================
   Calendar Page
   ========================================================================== */
.calendar-embed-wrapper {
  margin-top: 24px;
  width: 100%;
  min-height: 650px;
  border-radius: 4px;
  overflow: hidden;
  background: #fafafa;
}

.calendar-embed-wrapper iframe {
  width: 100%;
  min-height: 650px;
  border: 0;
  display: block;
}

/* ==========================================================================
   Resources Page (6 Divisions, 2-Part Horizontal Rows)
   ========================================================================== */
.resources-section {
  padding-bottom: 90px;
}

.resource-division {
  max-width: 920px;
  margin: 0 auto 44px;
}

.division-title {
  font-size: 38px;
  font-weight: 300;
  color: #3b4045;
  margin-bottom: 18px;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.resource-row {
  display: flex;
  align-items: stretch;
  gap: 24px;
  text-decoration: none;
  color: #3b4045;
}

.resource-thumb {
  flex: 0 0 230px;
  width: 230px;
  aspect-ratio: 16 / 9;
  background: #ffffff;
  border: 1px solid #e4dfea;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.resource-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.resource-title-box {
  flex: 1;
  background: #ffffff;
  border: 1px solid #e4dfea;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  padding: 22px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.resource-title-box h3 {
  font-size: 28px;
  font-weight: 400;
  color: #3b4045;
  margin: 0;
}

.resource-badge {
  font-size: 13px;
  font-weight: 700;
  color: #662d91;
  background: rgba(102, 45, 145, 0.08);
  padding: 6px 14px;
  border-radius: 20px;
  white-space: nowrap;
}

.resource-row:hover .resource-title-box,
.resource-row:hover .resource-thumb {
  border-color: #662d91;
  box-shadow: 0 6px 18px rgba(102, 45, 145, 0.15);
  transform: translateY(-2px);
}

.coming-soon-box {
  background: #ffffff;
  border: 1px solid #e4dfea;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  padding: 28px;
  font-size: 26px;
  font-weight: 300;
  color: #777;
}

/* ==========================================================================
   Contact Page (.contactform)
   ========================================================================== */
.contactform {
  padding-bottom: 90px;
}

.contactform .container {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  border-radius: 6px;
  background-color: #fafafa;
  padding: 20px 20px 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.contactform h2 {
  text-align: center;
  padding: 18px 0;
  font-size: 26px;
  font-weight: 400;
  color: #000;
}

.contactform input,
.contactform textarea {
  font-family: "Josefin Sans", sans-serif;
  font-size: 16px;
  padding: 15px 12px 12px;
  border: 1px solid #cecece;
  background: #efefef;
  color: #000;
  border-radius: 5px;
  width: 80%;
  max-width: 800px;
  margin-bottom: 12px;
}

.contactform textarea {
  height: 120px;
  resize: vertical;
}

.contactform button {
  margin-top: 15px;
  margin-bottom: 15px;
  background-color: #662d91;
  padding: 12px 45px;
  border-radius: 5px;
  border: 1px solid #662d91;
  font-family: "Josefin Sans", sans-serif;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  transition: 0.3s;
}

.contactform button:hover {
  text-decoration: underline;
  background-color: #542378;
}

.contactform .message {
  display: none;
}

/* ==========================================================================
   Sponsors Page (.sponsorrow, .sponsorimg)
   ========================================================================== */
.sponsors-section {
  padding-bottom: 90px;
}

.sponsor-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 54px 72px;
  padding: 40px 0 50px;
}

.sponsor-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sponsorimg {
  transition: transform 0.2s ease;
  height: calc(5vw + 70px - 4vh);
  min-height: 68px;
  max-height: 110px;
  max-width: 260px;
  object-fit: contain;
  transform: scale(1);
}

.sponsorimg:hover {
  transform: scale(1.1);
}

.sponsor-callout {
  margin-top: 20px;
  padding-top: 24px;
}

.promo-text {
  font-size: 24px;
  font-weight: 400;
  color: #3b4045;
  margin-bottom: 16px;
}

.promo-code-highlight {
  color: #662d91;
  font-weight: 700;
}

.sponsor-doc-links {
  font-size: 20px;
}

.sponsor-doc-links a {
  color: #0275d8;
  font-weight: 400;
}

.sponsor-doc-links a:hover {
  color: #662d91;
  text-decoration: underline;
}

/* ==========================================================================
   Newsletters Page (4-Column .gallery Grid with #dab0ec Hover Glow)
   ========================================================================== */
.newsletters-section {
  padding-bottom: 90px;
}

.newsletter-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 28px;
  align-items: stretch;
}

.link-box {
  color: #444;
  display: flex;
  text-decoration: none;
}

div.gallery {
  background: #ffffff;
  box-shadow: 0px 0px 30px 5px rgba(113, 100, 123, 0.38);
  padding: 15px;
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  width: 100%;
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

div.gallery:hover {
  box-shadow: 0px 0px 20px 5px #dab0ec;
  transform: translateY(-3px);
}

.gallery-thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #f5f2f8;
}

div.gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

div.desc {
  padding: 24px 16px 16px;
  text-align: center;
  width: 100%;
}

div.desc h3 {
  color: #662d91;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 12px;
}

div.desc p {
  font-size: 16px;
  line-height: 1.5;
  color: #555;
  margin: 0;
}

/* ==========================================================================
   Join Page
   ========================================================================== */
.join-intro {
  font-size: 18px;
  line-height: 1.6;
  color: #4a4f55;
  margin-bottom: 28px;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.faq-item h3 {
  font-size: 22px;
  font-weight: 400;
  color: #3b4045;
  margin-bottom: 8px;
}

.faq-item p {
  margin: 0;
}

/* ==========================================================================
   Global Footer
   ========================================================================== */
footer {
  text-align: center;
  background: #f4f4f4;
  padding: 50px 0;
}

footer .footer-logo h1 {
  font-size: 40px;
  font-family: "Montserrat", sans-serif;
  font-weight: 500;
  color: #662d91;
  margin: 0;
}

.socialmediabar i {
  font-size: 35px;
  transition: 0.2s;
  padding: 20px 15px;
  margin-top: 10px;
  color: #282828;
}

.socialmediabar i:hover {
  transform: scale(1.2);
  cursor: pointer;
  color: #662d91;
}

footer p.copyright-text {
  font-weight: 300;
  font-size: 12px;
  color: #888;
  letter-spacing: 3px;
  margin-top: 12px;
  margin-bottom: 0;
}

footer p.copyright-text a {
  color: #282828;
}

/* ==========================================================================
   Responsive Breakpoints (Mobile Animated SVG Drawer & Stacked Grids)
   ========================================================================== */
@media (max-width: 1000px) {
  html.noscroll,
  html.noscroll body {
    overflow: hidden;
    width: 100%;
    height: 100%;
    margin: 0;
  }

  #top-nav {
    left: 0;
    top: 0;
    margin: 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    flex-direction: column;
    padding: calc(5vh + 80px) 0 5vh;
    position: fixed;
    width: 100vw;
    height: 100vh;
    background-color: #ffffff;
    opacity: 0;
    pointer-events: none;
    z-index: -1;
    transition: opacity 0.25s ease;
  }

  #top-nav.opened {
    z-index: 10;
    opacity: 1;
    pointer-events: auto;
  }

  #top-nav li {
    transition: 0.2s cubic-bezier(0.25, 0.1, 0.2, 1.2);
    transform: translateX(-80px);
    opacity: 0;
  }

  .noscroll #top-nav li,
  #top-nav.opened li {
    transform: translateX(0);
    opacity: 1;
  }

  .line {
    fill: none;
    stroke: #111;
    stroke-width: 7;
    transition: 0.25s ease;
    stroke-dashoffset: 0;
  }

  .line1,
  .line3 {
    stroke-dasharray: 60 197;
  }

  .line2 {
    stroke-dasharray: 60 60;
  }

  .opened .line1,
  .opened .line3 {
    stroke-dasharray: 73 172;
    stroke-dashoffset: -128;
    stroke-width: 8;
  }

  .opened .line2 {
    stroke-dasharray: 0 60;
    stroke-dashoffset: -30.5;
  }

  #menubtn {
    transition: 0.2s;
    background-color: transparent;
    border-radius: 50%;
    width: 64px;
    height: 64px;
    padding: 14px;
    position: absolute;
    right: 15px;
    top: 6px;
    z-index: 12;
    display: block;
    cursor: pointer;
  }

  #menubtn.opened {
    position: fixed;
  }

  .programs-list .float-left .program-image,
  .programs-list .float-right .program-image {
    float: none;
    width: 100%;
    margin: 0 0 18px 0;
  }

  .newsletter-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .memberlist {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 820px) {
  .grid-3,
  .glance-row,
  .history-cols {
    grid-template-columns: 1fr;
  }

  .information .container {
    width: 96%;
    padding: 10px;
  }

  .information .container .content,
  .information .container .content-2,
  .tab-card {
    padding: 24px 18px;
  }

  .bot-card {
    flex-direction: column;
    gap: 28px;
  }

  .resource-row {
    flex-direction: column;
    gap: 12px;
  }

  .resource-thumb {
    width: 100%;
    flex: none;
  }

  .hero-area,
  #home-nav {
    background-image: linear-gradient(to right, #fff 0%, 88vw, #662d9100 100%);
  }

  .hero-gradient-overlay {
    background-image: linear-gradient(to right, #fff 0%, 88vw, rgba(255, 255, 255, 0.4) 100%);
  }

  .hero-area h1 {
    font-size: 42px;
  }
}

@media (max-width: 540px) {
  .newsletter-grid,
  .memberlist {
    grid-template-columns: 1fr;
  }

  .newsletter-form {
    flex-direction: column;
    gap: 10px;
  }

  .newsletter-form input,
  .newsletter-form .btn-main {
    border-radius: 30px;
    width: 100%;
  }
}
`;
}

export function generateAllStaticSiteFiles(
  data: MvrtSiteData
): GeneratedStaticFile[] {
  return [
    {
      filename: 'index.html',
      title: 'Home (index.html)',
      pageId: 'home',
      language: 'html',
      description:
        'Homepage with Hero typewriter & slide carousel, 3-column Upcoming Events, Registration CTA banner, Team At A Glance, and Newsletter subscription.',
      content: generateHomeHtml(data)
    },
    {
      filename: 'about.html',
      title: 'About (about.html)',
      pageId: 'about',
      language: 'html',
      description:
        '7-tab About hub: Overview, About FIRST, 28-year Team History timeline, Past Robots, Leadership cards, Members roster, and Mentors.',
      content: generateAboutHtml(data)
    },
    {
      filename: 'outreach.html',
      title: 'Outreach (outreach.html)',
      pageId: 'outreach',
      language: 'html',
      description:
        'Alternating left/right purple-bordered program cards for all 13 MVRT STEM outreach initiatives.',
      content: generateOutreachHtml(data)
    },
    {
      filename: 'calendar.html',
      title: 'Calendar (calendar.html)',
      pageId: 'calendar',
      language: 'html',
      description:
        'Embedded Google Calendar view with contact link and meeting instructions.',
      content: generateCalendarHtml(data)
    },
    {
      filename: 'resources.html',
      title: 'Resources (resources.html)',
      pageId: 'resources',
      language: 'html',
      description:
        'Division training decks and documentation organized across Mechanical, Software, Electrical, Outreach, Finance, and Marketing.',
      content: generateResourcesHtml(data)
    },
    {
      filename: 'contact.html',
      title: 'Contact (contact.html)',
      pageId: 'contact',
      language: 'html',
      description:
        'Clean Formspree contact form without legacy jQuery/DOM null listener errors.',
      content: generateContactHtml(data)
    },
    {
      filename: 'sponsors.html',
      title: 'Sponsors (sponsors.html)',
      pageId: 'sponsors',
      language: 'html',
      description:
        'Responsive sponsor logo showcase with Fabworks FRC115 discount banner, Grant Impact Report, and Sponsor Packet PDF links.',
      content: generateSponsorsHtml(data)
    },
    {
      filename: 'newsletters.html',
      title: 'Newsletters (newsletters.html)',
      pageId: 'newsletters',
      language: 'html',
      description:
        '4-column responsive newsletter archive linking directly to build & offseason PDF issues.',
      content: generateNewslettersHtml(data)
    },
    {
      filename: 'join.html',
      title: 'Join (join.html)',
      pageId: 'join',
      language: 'html',
      description:
        '2-tab onboarding card with Regular Season registration toggle/form link and numbered FAQs.',
      content: generateJoinHtml(data)
    },
    {
      filename: 'assets/css/style.css',
      title: 'Unified Stylesheet (assets/css/style.css)',
      language: 'css',
      description:
        'Clean, responsive stylesheet preserving MVRT #662d91 purple, Josefin Sans & Montserrat typography, pill glow buttons, and cards.',
      content: generateStyleCss()
    },
    {
      filename: 'site-data/mvrt-site.json',
      title: 'Single Source of Truth Data (mvrt-site.json)',
      language: 'json',
      description:
        'Structured JSON config powering every page, season, timeline, roster, and resource.',
      content: JSON.stringify(data, null, 2)
    }
  ];
}
