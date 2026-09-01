import type { TimelineValue } from '../types/settings';
import type { ResolvedTimeline } from '../types/performance';

export function resolveTimelineValue(
  savedTimeline: TimelineValue,
  customStart: string,
  customEnd: string,
  customContestFrom: string,
  customContestTo: string,
): ResolvedTimeline {
  if (savedTimeline === 'custom') {
    return { type: 'custom', start: customStart, end: customEnd };
  }
  if (savedTimeline === 'cc') {
    const lo = Number.parseInt(customContestFrom, 10);
    const hi = Number.parseInt(customContestTo, 10);
    if (!Number.isNaN(lo) && lo >= 1 && !Number.isNaN(hi) && hi >= 1) {
      return { type: 'contestRank', lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
    }
    return 'all';
  }
  if (savedTimeline === 'c5') return { type: 'contests', n: 5 };
  if (savedTimeline === 'c10') return { type: 'contests', n: 10 };
  if (savedTimeline === 'c20') return { type: 'contests', n: 20 };
  return savedTimeline;
}

export function timelineLabel(value: TimelineValue): string {
  const labels: Record<TimelineValue, string> = {
    all: 'All time',
    '1': '1 month',
    '3': '3 months',
    '6': '6 months',
    '12': '12 months',
    '24': '24 months',
    custom: 'Custom range',
    c5: 'Last 5 contests',
    c10: 'Last 10 contests',
    c20: 'Last 20 contests',
    cc: 'Contest range',
  };
  return labels[value];
}
