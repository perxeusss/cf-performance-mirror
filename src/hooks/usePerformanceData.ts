import { useMemo } from 'react';
import type { DeltaInfo, ModeData, ResolvedTimeline } from '../types/performance';
import type { Category, Mode } from '../types/settings';
import { PerformanceEngine } from '../domain/performanceEngine';

interface Result {
  modeData: ModeData;
  deltaInfoByCategory: Record<Category, DeltaInfo>;
}

export function usePerformanceData(
  engine: PerformanceEngine,
  mode: Mode,
  timeline: ResolvedTimeline,
): Result {
  return useMemo(() => {
    const modeData = engine.recalc(mode, timeline);
    const categories = ['Div1', 'Div2', 'Div3', 'Div4', 'Other'] as Category[];
    const deltaInfoByCategory = Object.fromEntries(
      categories.map(category => [category, engine.calcDeltaRating(category, timeline)]),
    ) as Record<Category, DeltaInfo>;
    return { modeData, deltaInfoByCategory };
  }, [engine, mode, timeline]);
}
