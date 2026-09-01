import type { Category } from '../types/settings';
import { DEFAULT_INDICES } from '../types/settings';
import type { ModeData } from '../types/performance';
import { median } from './utils';

export interface TableCell {
  index: string;
  averageTime: number | null;
  medianTime: number | null;
  solved: number;
  attempts: number;
  failurePercent: number | null;
  acIds: number[];
  wrongIds: number[];
}

export interface TableModel {
  category: Category;
  indices: string[];
  rows: TableCell[];
}

export function buildTableModel(modeData: ModeData, category: Category): TableModel {
  const times = modeData.categoryIndexTimes[category] || {};
  const attempts = modeData.categoryIndexAttempts[category] || {};
  const solved = modeData.categoryIndexSolved[category] || {};
  const wrongIds = modeData.categoryIndexWrongIds[category] || {};
  const acIds = modeData.categoryIndexAcIds[category] || {};
  const indices = Array.from(new Set([...DEFAULT_INDICES, ...Object.keys(times), ...Object.keys(attempts)])).sort((a, b) => a.localeCompare(b));
  return {
    category,
    indices,
    rows: indices.map(index => {
      const arr = times[index] || [];
      const att = attempts[index] || 0;
      const sol = solved[index] || 0;
      return {
        index,
        averageTime: arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null,
        medianTime: median(arr) === null ? null : Math.round((median(arr) as number) * 10) / 10,
        solved: sol,
        attempts: att,
        failurePercent: att > 0 ? Math.round(((att - sol) / att) * 100) : null,
        acIds: acIds[index] || [],
        wrongIds: wrongIds[index] || [],
      };
    }),
  };
}
