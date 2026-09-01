import type { ProblemEntry } from '../types/performance';

export function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function totalErrors(problem: Pick<ProblemEntry, 'wa' | 'tle' | 'rte' | 'mle' | 'other'>): number {
  return (problem.wa || 0) + (problem.tle || 0) + (problem.rte || 0) + (problem.mle || 0) + (problem.other || 0);
}

export function getRatingColor(rating: number | null | undefined): string {
  if (!rating || rating < 1200) return '#808080';
  if (rating < 1400) return '#008000';
  if (rating < 1600) return '#03a89e';
  if (rating < 1900) return '#0000ff';
  if (rating < 2100) return '#aa00aa';
  if (rating < 2400) return '#ff8c00';
  if (rating < 3000) return '#ff0000';
  return '#cc0000';
}
