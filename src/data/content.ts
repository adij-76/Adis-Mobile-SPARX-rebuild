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

export type Meeting = {
  id: string;
  time: string;
  startsIn: string;
  title: string;
  host: string;
};

export const upcomingMeetings: Meeting[] = [
  {
    id: 'm1',
    time: '10:00 - 11:00 AM (UTC)',
    startsIn: 'Starting in 30 min',
    title: 'New hero onboarding follow-up meeting and counselling',
    host: 'Okei Joseph',
  },
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
