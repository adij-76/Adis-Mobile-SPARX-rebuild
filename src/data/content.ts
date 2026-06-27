/**
 * Mock content for the IGNTD app screens. In a real build this would come
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
};

export const dailyQuote = {
  text: 'Success is not final, failure is not fatal: It is the courage to continue that counts.',
  author: 'Winston Churchill',
};

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export const dailyChecklist: ChecklistItem[] = [
  { id: 'checkin', label: 'Your daily check-in', done: true },
  { id: 'video', label: 'Video: Learning to face your experience', done: false },
  { id: 'workshop', label: 'Workshop: The inner map of Relationships', done: false },
];

export type Program = {
  id: string;
  badge: string;
  title: string;
  progress: number; // 0–1
};

export const heroProgram: Program = {
  id: 'hero',
  badge: 'IGNTD Hero Program',
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
};

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
  },
];

export type Quote = {
  id: string;
  text: string;
  author: string;
};

export const quotes: Quote[] = [
  {
    id: 'q1',
    text: 'Success is not final, failure is not fatal: It is the courage to continue that counts.',
    author: 'Winston Churchill',
  },
  {
    id: 'q2',
    text: 'The wound is the place where the Light enters you.',
    author: 'Rumi',
  },
  {
    id: 'q3',
    text: 'You don’t have to control your thoughts. You just have to stop letting them control you.',
    author: 'Dan Millman',
  },
  {
    id: 'q4',
    text: 'Recovery is not a race. You don’t have to feel guilty for taking your time.',
    author: 'Unknown',
  },
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

export const workshop = {
  title: 'Master your belief with Dr. Bruce Lipton',
  rating: 5,
  hero: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=70',
  intro:
    'The "Ultimate Bliss Blueprint" aims to craft a comprehensive system that integrates scientific understanding of human motivation with practical strategies to achieve optimal well-being and fulfillment. This blueprint is designed to provide actionable insights and methodologies for individuals seeking to maximize their happiness and life satisfaction.',
  videoPoster: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=70',
  videoBody:
    'Behavioural Economics: Insights into how people make decisions and what drives their choices, including concepts like nudging and incentive structures.\n\nFostering intrinsic motivation for sustainable happiness through autonomy, mastery, and purpose.',
};

/* ------------------------------------------------------------------ */
/* My Data — Wheel of Life, Daily Assessment, Leaderboard             */
/* ------------------------------------------------------------------ */

export type LifeArea = {
  id: string;
  label: string;
  icon: string; // Ionicons name
  score: number; // 0–10
  color: string;
};

export const lifeAreas: LifeArea[] = [
  { id: 'health', label: 'Health', icon: 'fitness', score: 7, color: '#38C793' },
  { id: 'career', label: 'Career', icon: 'briefcase', score: 6, color: '#166890' },
  { id: 'relationships', label: 'Relationships', icon: 'heart', score: 8, color: '#FF9D4B' },
  { id: 'finances', label: 'Finances', icon: 'wallet', score: 5, color: '#699AC1' },
  { id: 'growth', label: 'Personal Growth', icon: 'leaf', score: 9, color: '#C7D66D' },
  { id: 'fun', label: 'Fun & Recreation', icon: 'happy', score: 6, color: '#DF1C41' },
  { id: 'environment', label: 'Environment', icon: 'home', score: 7, color: '#1C3B55' },
  { id: 'spirituality', label: 'Spirituality', icon: 'sparkles', score: 8, color: '#4A2B6B' },
];

export type AssessmentQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

export const dailyAssessment: AssessmentQuestion[] = [
  {
    id: 'mood',
    prompt: 'How would you rate your overall mood today?',
    options: ['Great', 'Good', 'Okay', 'Low', 'Struggling'],
  },
  {
    id: 'cravings',
    prompt: 'Did you experience any cravings or urges today?',
    options: ['None at all', 'Mild', 'Moderate', 'Strong', 'Overwhelming'],
  },
  {
    id: 'sleep',
    prompt: 'How well did you sleep last night?',
    options: ['Very well', 'Well', 'Average', 'Poorly', 'Barely slept'],
  },
  {
    id: 'connection',
    prompt: 'Did you connect with someone supportive today?',
    options: ['Yes, meaningfully', 'Briefly', 'Not yet', 'I felt isolated'],
  },
  {
    id: 'gratitude',
    prompt: 'Were you able to notice something you’re grateful for?',
    options: ['Several things', 'One thing', 'Not really', 'It was a hard day'],
  },
];

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
  comments: Comment[];
};

export const communities = [
  { id: 'helping-hands', name: 'Helping Hands', members: '3.2k', icon: 'hand-left' as const, color: '#FF9D4B' },
  { id: 'sober-curious', name: 'Sober Curious', members: '1.8k', icon: 'leaf' as const, color: '#38C793' },
  { id: 'parents', name: 'Parents in Recovery', members: '940', icon: 'people' as const, color: '#166890' },
  { id: 'mindfulness', name: 'Daily Mindfulness', members: '2.5k', icon: 'sparkles' as const, color: '#4A2B6B' },
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
