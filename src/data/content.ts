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
};

export const recommendedVideos: VideoItem[] = [
  {
    id: 'v1',
    title: 'Being in a relationship with your partner with the basis of what your connection is',
    duration: '14:00',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=70',
  },
  {
    id: 'v2',
    title: 'Building trust and intimacy through honest and open conversations',
    duration: '08:32',
    image: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=70',
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
