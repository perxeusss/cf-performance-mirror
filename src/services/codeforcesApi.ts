import type {
  CodeforcesApiResponse,
  CodeforcesContest,
  CodeforcesRatingChange,
  CodeforcesSubmission,
} from '../types/codeforces';

const API_BASE = 'https://codeforces.com/api';

async function get<T>(path: string): Promise<CodeforcesApiResponse<T>> {
  const response = await fetch(`${API_BASE}${path}`);
  return response.json() as Promise<CodeforcesApiResponse<T>>;
}

export async function fetchContests(): Promise<CodeforcesContest[]> {
  const data = await get<CodeforcesContest[]>('/contest.list');
  return data.status === 'OK' ? (data.result ?? []) : [];
}

export async function fetchUserRating(handle: string): Promise<CodeforcesRatingChange[]> {
  const data = await get<CodeforcesRatingChange[]>(`/user.rating?handle=${encodeURIComponent(handle)}`);
  return data.status === 'OK' ? (data.result ?? []) : [];
}

export async function fetchUserSubmissions(handle: string): Promise<CodeforcesSubmission[]> {
  const data = await get<CodeforcesSubmission[]>(`/user.status?handle=${encodeURIComponent(handle)}&count=10000`);
  if (data.status !== 'OK') {
    throw new Error(data.comment || 'unknown');
  }
  return data.result ?? [];
}

export async function fetchUserDataset(handle: string): Promise<{
  submissions: CodeforcesSubmission[];
  ratingHistory: CodeforcesRatingChange[];
}> {
  const [submissions, ratingHistory] = await Promise.all([
    fetchUserSubmissions(handle),
    fetchUserRating(handle),
  ]);
  return { submissions, ratingHistory };
}
