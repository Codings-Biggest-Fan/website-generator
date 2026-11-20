export type MvrtPageId =
  | 'home'
  | 'about'
  | 'outreach'
  | 'calendar'
  | 'resources'
  | 'contact'
  | 'sponsors'
  | 'newsletters'
  | 'join';

export type AboutTabId =
  | 'overview'
  | 'first'
  | 'history'
  | 'robots'
  | 'leadership'
  | 'members'
  | 'mentors';

export type JoinTabId = 'regular' | 'faqs';

export interface MvrtEventItem {
  id: string;
  title: string;
  dateText: string;
  isoDate?: string; // YYYY-MM-DD for interactive monthly calendar grid
  endDate?: string; // Optional YYYY-MM-DD for multi-day events
  timeText?: string;
  location?: string;
  category: 'team_meeting' | 'team_event' | 'demo_outreach';
}

export interface MvrtSeasonRecord {
  year: number;
  game: string;
  robotName?: string;
  robotImage?: string;
  teamImage?: string;
  technicalBinderUrl?: string;
  showInPastRobots: boolean;
  awards: string[];
  leadership: string[];
}

export interface MvrtLeaderProfile {
  id: string;
  name: string;
  role: string;
  tier: 'President' | 'Vice Presidents' | 'Engineering Directors' | 'Operations Directors';
  email: string;
  imageUrl: string;
}

export interface MvrtOutreachProgram {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  partnerLogoUrl?: string;
  primaryButtonText?: string;
  primaryButtonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
}

export interface MvrtResourceItem {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  badge?: string;
}

export interface MvrtResourceDivision {
  id: string;
  division: 'Mechanical' | 'Software' | 'Electrical' | 'Outreach' | 'Finance' | 'Marketing';
  comingSoon?: boolean;
  items: MvrtResourceItem[];
}

export interface MvrtSponsor {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
}

export interface MvrtNewsletter {
  id: string;
  title: string;
  summary: string;
  thumbnailUrl: string;
  pdfUrl: string;
  seasonYear?: number;
}

export interface MvrtFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface MvrtTextStyleOverride {
  fontSize?: number;
  fontWeight?: '300' | '400' | '600' | '700';
  fontStyle?: 'normal' | 'italic';
  color?: string;
}

export interface MvrtSiteData {
  textStyles?: Record<string, MvrtTextStyleOverride>;
  meta: {
    teamName: string;
    teamNumber: number;
    shortName: string;
    location: string;
    copyrightYear: number;
    baseAssetUrl: string;
    typewriterPhrases: string[];
    heroSubtitle: string;
    heroSlides: string[];
    registrationOpen: boolean;
    registrationSeasonLabel: string;
    registrationHeadline: string;
    registrationSubtext: string;
    interestFormUrl: string;
    calendarEmbedUrl: string;
    contactFormEndpoint: string;
    mailchimpEndpoint: string;
    socials: {
      instagram: string;
      facebook: string;
      twitter: string;
      youtube: string;
      heartEasterEggUrl: string;
    };
  };
  glanceStats: {
    yearsAsTeam: number;
    currentMembersDisplay: string;
    autoCountMembers: boolean;
    currentMentors: number;
    teamPhotoUrl: string;
    featuredSeasonYear: number;
  };
  eventsConfig: {
    meetingsNote: string;
    items: MvrtEventItem[];
  };
  aboutOverview: {
    historyParagraph: string;
    missionParagraph: string;
    goalsList: string[];
    firstIntroParagraph: string;
    frcParagraph: string;
    firstValuesParagraph?: string;
  };
  seasons: MvrtSeasonRecord[];
  leadership: MvrtLeaderProfile[];
  members: string[];
  mentors: {
    introText: string;
    headMentors: string[];
    currentMentors: string[];
    pastMentors: string[];
  };
  outreach: MvrtOutreachProgram[];
  resources: MvrtResourceDivision[];
  sponsorsPage: {
    heading: string;
    promoBannerText: string;
    promoCode: string;
    grantImpactReportUrl: string;
    sponsorPacketUrl: string;
    sponsors: MvrtSponsor[];
  };
  newsletters: MvrtNewsletter[];
  joinPage: {
    introParagraph: string;
    regularSeasonHeading: string;
    regularSeasonBody: string;
    closedSeasonHeading: string;
    closedSeasonBody: string;
    faqs: MvrtFaqItem[];
  };
}
