/**
 * Mock content for the SPARx app screens. In a real build this would come
 * from an API; it's centralized here so screens stay declarative.
 */

import type { Step } from '@/components/ui/stepper';

export const WORKSHOP_STEPS: Step[] = [
  { key: 'intro', label: 'Intro' },
  { key: 'video', label: 'Video' },
  { key: 'worksheet', label: 'Worksheet' },
  { key: 'summary', label: 'Summary' },
];

export const user = {
  name: 'Okei',
  avatar: 'https://i.pravatar.cc/120?img=12',
  /** The user's specific struggle — the check-in customizes to this. */
  struggle: { verb: 'drink', noun: 'drinking' },
};

export const positiveEmotions = [
  'Calm', 'Hopeful', 'Grateful', 'Proud', 'Content', 'Confident', 'Loved',
  'Motivated', 'Peaceful', 'Joyful', 'Energized', 'Connected', 'Focused',
  'Relieved', 'Optimistic', 'Strong', 'Inspired', 'Safe',
];

export const negativeEmotions = [
  'Fear', 'Boredom', 'Hopelessness', 'Sickness', 'Frustration', 'Anxiety',
  'Irritability', 'Shame', 'Weakness', 'Vulnerability', 'Down', 'Overwhelmed',
  'Confusion', 'Guilt', 'Triggered', 'Depressed', 'Insecurity', 'Anger',
  'Disappointment', 'Uncertainty', 'Burn-out', 'Exhaustion',
];

export const dailyQuote = {
  text: 'Success is not final, failure is not fatal: It is the courage to continue that counts.',
  author: 'Winston Churchill',
};

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  /** Where tapping the item takes the user. The backend will personalize these. */
  route: string;
};

export const dailyChecklist: ChecklistItem[] = [
  { id: 'checkin', label: 'Your daily check-in', done: true, route: '/checkin' },
  { id: 'video', label: 'Video: Learning to face your experience', done: false, route: '/videos/v1' },
  { id: 'workshop', label: 'Workshop: The inner map of Relationships', done: false, route: '/workshop/list' },
];

export type Program = {
  id: string;
  badge: string;
  title: string;
  progress: number; // 0–1
};

export const heroProgram: Program = {
  id: 'hero',
  badge: 'SPARx Hero Program',
  title: 'Setting the scene for success',
  progress: 0.24,
};

export type Coach = {
  name: string;
  role: string;
  bio: string;
  avatar: string;
};

export const coachAdi: Coach = {
  name: 'Adi Jaffe',
  role: 'Hypnosis & Recovery Coaching',
  bio: 'Dr. Adi Jaffe is dedicated to changing the way we think about and approach mental health issues. He is passionate about ending the shame and stigma surrounding addiction.',
  avatar: 'https://i.pravatar.cc/120?img=68',
};

export type MeetingStatus = 'upcoming' | 'past' | 'canceled';

export type Meeting = {
  id: string;
  time: string;
  date?: string;
  startsIn?: string;
  title: string;
  host: string;
  status: MeetingStatus;
  description: string;
  via: string;
  coach: Coach;
};

const meetingBlurb =
  'This is an accountability coach call. Any member can book this call to help navigate the program, check in on your progress, and to discuss your goals.';

export const meetings: Meeting[] = [
  {
    id: 'm1',
    time: '10:00 - 11:00 AM (UTC)',
    date: 'Wednesday 24th July, 2024',
    startsIn: 'Starting in 2 hours',
    title: 'New hero onboarding follow-up meeting and counselling',
    host: 'Chavel Chambers',
    status: 'upcoming',
    description: meetingBlurb,
    via: 'Video Meeting via Zoom call',
    coach: coachAdi,
  },
  {
    id: 'm2',
    time: '10:00 - 11:00 AM (UTC)',
    date: 'Thursday 25th July, 2024',
    startsIn: 'Starting in 12 hours',
    title: 'Importance of therapy and counselling, with tips on finding the right therapist',
    host: 'Okei Joseph',
    status: 'upcoming',
    description: meetingBlurb,
    via: 'Video Meeting via Zoom call',
    coach: coachAdi,
  },
  {
    id: 'm3',
    time: '10:00 - 11:00 AM (UTC)',
    date: 'Friday 26th July, 2024',
    startsIn: 'Starting in 24 hours',
    title: 'Importance of therapy and counselling, with tips on finding the right therapist',
    host: 'Okei Joseph',
    status: 'upcoming',
    description: meetingBlurb,
    via: 'Video Meeting via Zoom call',
    coach: coachAdi,
  },
  {
    id: 'm4',
    time: '24th July, 2024 · 10:00 - 11:00 AM (UTC)',
    date: 'Wednesday 24th July, 2024',
    title: 'Inspirational recovery stories with individuals who have successfully recovered',
    host: 'Chavel Chambers',
    status: 'past',
    description: meetingBlurb,
    via: 'Video Meeting via Zoom call',
    coach: coachAdi,
  },
  {
    id: 'm5',
    time: '22nd July, 2024 · 10:00 - 11:00 AM (UTC)',
    date: 'Monday 22nd July, 2024',
    title: 'New hero onboarding follow-up meeting and counselling',
    host: 'Okei Joseph',
    status: 'canceled',
    description: meetingBlurb,
    via: 'Video Meeting via Zoom call',
    coach: coachAdi,
  },
];

/** Convenience: the meetings shown on the Home dashboard. */
export const upcomingMeetings = meetings.filter((m) => m.status === 'upcoming');

export const socials = [
  { id: 'instagram', icon: 'logo-instagram' as const, url: 'https://instagram.com' },
  { id: 'facebook', icon: 'logo-facebook' as const, url: 'https://facebook.com' },
  { id: 'x', icon: 'logo-twitter' as const, url: 'https://x.com' },
];

export type VideoItem = {
  id: string;
  title: string;
  duration: string;
  image: string;
  presenter: string;
  views: string;
  description: string;
  /** Vimeo URL the player opens. Placeholder IDs — swap for real SPARx videos. */
  vimeoUrl?: string;
};

/** Demo Vimeo video used by mock players until real SPARx video IDs are wired in. */
export const DEMO_VIDEO_URL = 'https://vimeo.com/76979871';

export const recommendedVideos: VideoItem[] = [
  {
    id: 'v1',
    title: 'Being in a relationship with your partner with the basis of what your connection is',
    duration: '14:00',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=70',
    presenter: 'Dr. Adi Jaffe',
    views: '2.4k views',
    description:
      'Connection is the foundation of every healthy relationship. In this session we explore how to show up authentically, communicate needs without fear, and rebuild trust after it has been broken.',
    vimeoUrl: 'https://vimeo.com/879923572',
  },
  {
    id: 'v2',
    title: 'Building trust and intimacy through honest and open conversations',
    duration: '08:32',
    image: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=70',
    presenter: 'Sarah Lin',
    views: '1.1k views',
    description:
      'Intimacy grows when we feel safe to be honest. Learn a simple framework for difficult conversations that deepens connection instead of creating distance.',
    vimeoUrl: 'https://vimeo.com/22439234',
  },
  {
    id: 'v3',
    title: 'Understanding your triggers and building healthier coping habits',
    duration: '11:45',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=70',
    presenter: 'Dr. Adi Jaffe',
    views: '3.8k views',
    description:
      'Triggers are signals, not failures. This video breaks down how to recognise your patterns and replace automatic reactions with intentional, healthier responses.',
    vimeoUrl: 'https://vimeo.com/76979871',
  },
];

/** Mood buckets used to recommend a quote from the user's latest check-in. */
export type QuoteMood = 'struggling' | 'craving' | 'low' | 'steady' | 'growth';

export type Quote = {
  id: string;
  text: string;
  author: string;
  /** Which check-in state this quote speaks to (drives recommendations). */
  mood: QuoteMood;
};

export const quotes: Quote[] = [
  { id: 'q1', mood: 'struggling', text: 'Success is not final, failure is not fatal: It is the courage to continue that counts.', author: 'Winston Churchill' },
  { id: 'q2', mood: 'low', text: 'The wound is the place where the Light enters you.', author: 'Rumi' },
  { id: 'q3', mood: 'craving', text: 'You don’t have to control your thoughts. You just have to stop letting them control you.', author: 'Dan Millman' },
  { id: 'q4', mood: 'low', text: 'Recovery is not a race. You don’t have to feel guilty for taking your time.', author: 'Unknown' },
  { id: 'q5', mood: 'craving', text: 'Almost everything will work again if you unplug it for a few minutes — including you.', author: 'Anne Lamott' },
  { id: 'q6', mood: 'growth', text: 'You are not your mistakes. You are not your struggles. You are here now with the power to shape your day.', author: 'Steve Maraboli' },
  { id: 'q7', mood: 'low', text: 'Healing is not linear.', author: 'Unknown' },
  { id: 'q8', mood: 'struggling', text: 'The only way out is through.', author: 'Robert Frost' },
  { id: 'q9', mood: 'growth', text: 'What you stay focused on will grow.', author: 'Roy T. Bennett' },
  { id: 'q10', mood: 'low', text: 'Be patient with yourself. Nothing in nature blooms all year.', author: 'Unknown' },
  { id: 'q11', mood: 'struggling', text: 'Rock bottom became the solid foundation on which I rebuilt my life.', author: 'J.K. Rowling' },
  { id: 'q12', mood: 'struggling', text: 'Courage doesn’t always roar. Sometimes it’s the quiet voice at the end of the day saying, “I will try again tomorrow.”', author: 'Mary Anne Radmacher' },
  { id: 'q13', mood: 'craving', text: 'You don’t have to see the whole staircase, just take the first step.', author: 'Martin Luther King Jr.' },
  { id: 'q14', mood: 'steady', text: 'Self-care is how you take your power back.', author: 'Lalah Delia' },
  { id: 'q15', mood: 'growth', text: 'Every moment is a fresh beginning.', author: 'T.S. Eliot' },
];

export type WorkshopSummary = {
  id: string;
  title: string;
  author: string;
  description: string;
  rating: number;
  image: string;
};

/** Browse list shown on the "See all" / My Lessons screen. */
export const workshops: WorkshopSummary[] = [
  {
    id: 'heart-therapy',
    title: 'Heart Therapy',
    author: 'Lynell Yasno',
    description:
      'Lynell Yasno leads you through an at-home art therapy workshop where she helps you honestly explore and express what you feel.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=600&q=70',
  },
  {
    id: 'bliss-blueprint',
    title: 'Ultimate bliss blueprint: A human motivation science + system solution',
    author: 'Dr. Jaffe',
    description:
      'Dr. Jaffe dives into human needs, motivation and the aspects of life that fulfill our most basic requirements for a meaningful life.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&q=70',
  },
  {
    id: 'inner-map',
    title: 'The inner map of relationships',
    author: 'Adi Jaffe',
    description:
      'Understand the patterns that shape how you connect, and learn to redraw the map toward healthier, more honest relationships.',
    rating: 4,
    image: 'https://images.unsplash.com/photo-1516585427167-9f4af9627e6c?w=600&q=70',
  },
  {
    id: 'face-experience',
    title: 'Learning to face your experience',
    author: 'Sarah Lin',
    description:
      'A guided practice for sitting with difficult emotions without avoidance, building the courage to continue.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=70',
  },
];

export type Challenge = {
  id: string;
  title: string;
  description: string;
  days: number;
  progress: number; // 0–1
  icon: string; // Ionicons name
  color: string;
};

export const challenges: Challenge[] = [
  {
    id: '7-day-reset',
    title: '7-Day Reset',
    description: 'A week of small daily actions to rebuild momentum and routine.',
    days: 7,
    progress: 0.43,
    icon: 'flame',
    color: '#FF9D4B',
  },
  {
    id: 'mindful-mornings',
    title: 'Mindful Mornings',
    description: 'Start each day with a 5-minute grounding practice.',
    days: 14,
    progress: 0.2,
    icon: 'sunny',
    color: '#F7C948',
  },
  {
    id: 'connection',
    title: 'Connection Challenge',
    description: 'Reach out to one supportive person every day this week.',
    days: 10,
    progress: 0,
    icon: 'people',
    color: '#166890',
  },
];

/* ------------------------------------------------------------------ */
/* My Data — Wheel of Life, Daily Assessment, Leaderboard             */
/* ------------------------------------------------------------------ */

/** Wheel of Life categories (from the SPARx design). Each has two
 *  sub-dimensions scored 0–100; the category score is their average. */
export type WheelArea = {
  id: string;
  label: string; // full label, e.g. "Family & Friends"
  short: string; // short axis label for the chart
  icon: string; // Ionicons name
  color: string; // base hue (each wedge a distinct color)
  prompt: string; // assessment question
  last: number; // last month's score (0-100)
  current: number; // current month's score (0-100)
};

/** The 10 SPARx Wheel of Life areas (matches the v_wol data in the n8n flow). */
export const wheelAreas: WheelArea[] = [
  { id: 'purpose', label: 'Purpose', short: 'Purpose', icon: 'compass', color: '#7A5AF8',
    prompt: 'How aligned do you feel with what matters to you?', last: 55, current: 68 },
  { id: 'contribution', label: 'Contribution', short: 'Contrib.', icon: 'hand-left', color: '#5B8DEF',
    prompt: 'How satisfied are you with your service to the world?', last: 60, current: 72 },
  { id: 'business', label: 'Business / Career', short: 'Career', icon: 'briefcase', color: '#F2A65A',
    prompt: 'How fulfilled are you in your work and career?', last: 78, current: 80 },
  { id: 'finance', label: 'Finances', short: 'Finances', icon: 'cash', color: '#F7C948',
    prompt: 'How comfortable are you with your finances?', last: 65, current: 62 },
  { id: 'health', label: 'Health', short: 'Health', icon: 'fitness', color: '#EE6A8C',
    prompt: 'How satisfied are you with your current health?', last: 70, current: 84 },
  { id: 'family', label: 'Family & Friends', short: 'Family', icon: 'people', color: '#E5739B',
    prompt: 'How satisfied are you with your family & friend relationships?', last: 82, current: 88 },
  { id: 'romance', label: 'Romance', short: 'Romance', icon: 'heart', color: '#C77DFF',
    prompt: 'How fulfilled do you feel in your romantic life?', last: 45, current: 50 },
  { id: 'growth', label: 'Personal Growth', short: 'Growth', icon: 'leaf', color: '#9B6DD6',
    prompt: 'How satisfied are you with your growth and learning?', last: 68, current: 76 },
  { id: 'fun', label: 'Fun & Recreation', short: 'Fun', icon: 'happy', color: '#B79CED',
    prompt: 'How much fun and recreation do you make time for?', last: 40, current: 58 },
  { id: 'environment', label: 'Physical Environment', short: 'Environ.', icon: 'home', color: '#C9A66B',
    prompt: 'How satisfied are you with your living environment?', last: 72, current: 70 },
];

/** One month's overall Wheel of Life score. */
export type WheelMonth = { key: string; label: string; year: number; score: number };

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Builds the trailing 12 months of overall Wheel scores, ending at the current
 * month. The two most recent points are the user's real `current` + `last`
 * averages; earlier months are synthesised as a believable rising trend so the
 * Monthly/Annual views have something to render. Swap this for real monthly
 * snapshots from Supabase (`wheel_scores` history) when the backend is live.
 */
export function wheelHistory(current: number, last: number): WheelMonth[] {
  const now = new Date();
  const start = Math.max(28, Math.min(current, last) - 20);
  const wobble = [0, 3, -2, 4, 1, -3, 2, 4, -1, 2]; // 10 oldest months
  const out: WheelMonth[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    let score: number;
    if (i === 0) score = current; // this month
    else if (i === 1) score = last; // last month
    else {
      const t = (11 - i) / 9; // 0 at oldest → ~1 approaching last month
      score = Math.round(start + (last - start) * t) + (wobble[(11 - i) % wobble.length] ?? 0);
    }
    out.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: MONTH_LABELS[d.getMonth()],
      year: d.getFullYear(),
      score: Math.max(0, Math.min(100, score)),
    });
  }
  return out;
}

export type LeaderboardEntry = {
  id: string;
  rank: number;
  name: string;
  points: number;
  avatar: string;
  you?: boolean;
};

export const leaderboard: LeaderboardEntry[] = [
  { id: 'l1', rank: 1, name: 'Maya R.', points: 1840, avatar: 'https://i.pravatar.cc/80?img=5' },
  { id: 'l2', rank: 2, name: 'James K.', points: 1620, avatar: 'https://i.pravatar.cc/80?img=12' },
  { id: 'l3', rank: 3, name: 'Okei (You)', points: 1480, avatar: 'https://i.pravatar.cc/80?img=68', you: true },
  { id: 'l4', rank: 4, name: 'Sara L.', points: 1320, avatar: 'https://i.pravatar.cc/80?img=20' },
  { id: 'l5', rank: 5, name: 'David M.', points: 1110, avatar: 'https://i.pravatar.cc/80?img=33' },
  { id: 'l6', rank: 6, name: 'Aisha B.', points: 980, avatar: 'https://i.pravatar.cc/80?img=45' },
];

export type Report = {
  id: string;
  title: string;
  date: string;
  summary: string;
};

export const reports: Report[] = [
  {
    id: 'r1',
    title: 'Weekly wellbeing summary',
    date: 'Jul 22 – Jul 28',
    summary: 'Your mood trended upward this week and cravings dropped by 30%. Sleep remains an area to focus on.',
  },
  {
    id: 'r2',
    title: 'Wheel of Life check-in',
    date: 'Jul 2024',
    summary: 'Personal growth and relationships are your strongest areas. Finances scored lowest — consider a small goal here.',
  },
];

/* ------------------------------------------------------------------ */
/* Community                                                          */
/* ------------------------------------------------------------------ */

export type Comment = {
  id: string;
  author: string;
  avatar: string;
  time: string;
  text: string;
};

export type Post = {
  id: string;
  author: string;
  avatar: string;
  time: string;
  community: string;
  text: string;
  image?: string;
  likes: number;
  /** Real feed: comment count from the view (comments[] is fetched on demand). */
  commentsCount?: number;
  /** Real feed: the comm_channels id this post belongs to. */
  channelId?: string | null;
  comments: Comment[];
};

export type Community = {
  id: string;
  name: string;
  members: string;
  /** Ionicons name — seed set uses a few, real channels get one assigned by name. */
  icon: string;
  color: string;
  /** Optional blurb (real channels carry a description). */
  description?: string;
};

export const communities: Community[] = [
  { id: 'helping-hands', name: 'Helping Hands', members: '3.2k', icon: 'hand-left', color: '#FF9D4B' },
  { id: 'sober-curious', name: 'Sober Curious', members: '1.8k', icon: 'leaf', color: '#38C793' },
  { id: 'parents', name: 'Parents in Recovery', members: '940', icon: 'people', color: '#166890' },
  { id: 'mindfulness', name: 'Daily Mindfulness', members: '2.5k', icon: 'sparkles', color: '#4A2B6B' },
];

export const posts: Post[] = [
  {
    id: 'p1',
    author: 'Maya R.',
    avatar: 'https://i.pravatar.cc/80?img=5',
    time: '2h ago',
    community: 'Helping Hands',
    text: 'Day 30 today. The mornings are finally getting easier. Thank you all for the encouragement last week — it genuinely kept me going. 💙',
    image: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=70',
    likes: 128,
    comments: [
      { id: 'c1', author: 'James K.', avatar: 'https://i.pravatar.cc/80?img=12', time: '1h ago', text: 'So proud of you Maya. One day at a time. 🙌' },
      { id: 'c2', author: 'Sara L.', avatar: 'https://i.pravatar.cc/80?img=20', time: '45m ago', text: 'The mornings were my hardest too. It does get better!' },
    ],
  },
  {
    id: 'p2',
    author: 'David M.',
    avatar: 'https://i.pravatar.cc/80?img=33',
    time: '5h ago',
    community: 'Daily Mindfulness',
    text: 'Anyone have a breathing exercise that helps when cravings hit out of nowhere? Looking for something I can do at my desk.',
    likes: 54,
    comments: [
      { id: 'c3', author: 'Aisha B.', avatar: 'https://i.pravatar.cc/80?img=45', time: '4h ago', text: 'Box breathing: in 4, hold 4, out 4, hold 4. Works for me every time.' },
    ],
  },
];
