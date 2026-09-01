import type { CodeforcesContest, CodeforcesRatingChange } from '../types/codeforces';
import type { Category } from '../types/settings';

export type ContestCategory = Category | 'Div1+Div2';

export function classifyContest(contest: CodeforcesContest | undefined | null): ContestCategory {
  if (!contest || !contest.name) return 'Other';
  const name = String(contest.name);
  if (/Div\.?\s*1\s*\+\s*Div\.?\s*2/i.test(name) || /Div\.?\s*2\s*\+\s*Div\.?\s*1/i.test(name) || /Global/i.test(name)) return 'Div1+Div2';
  if (/Educational/i.test(name)) return 'Div2';
  const match = name.match(/Div\.?\s*([1-4])|Division\s*([1-4])/i);
  if (match) return `Div${match[1] || match[2]}` as Category;
  return 'Other';
}

export function decideUserDivisionForContest(
  contestId: number,
  contest: CodeforcesContest | undefined,
  isUnofficial: boolean,
  ratingHistory: readonly CodeforcesRatingChange[],
): Category {
  if (!contest || typeof contest.startTimeSeconds !== 'number') return 'Div2';
  if (isUnofficial) return 'Div2';

  let ratingBefore = 0;
  const sorted = [...ratingHistory].sort((a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds);
  for (const change of sorted) {
    if (change.contestId === contestId) {
      ratingBefore = change.oldRating;
      break;
    }
    if (change.ratingUpdateTimeSeconds < contest.startTimeSeconds) ratingBefore = change.newRating;
  }
  return ratingBefore >= 1900 ? 'Div1' : 'Div2';
}
