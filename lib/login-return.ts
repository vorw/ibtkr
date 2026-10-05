// Only resume the known application views; never accept an external destination.
import { readResume } from './participation';
export function loginReturn(value: string | null): string {
  if (!value || !value.startsWith('/?') || value.includes('\\')) return '/';
  const parsed = new URL(value, 'https://ibtkr.space');
  if (parsed.origin !== 'https://ibtkr.space' || parsed.pathname !== '/') return '/';
  const resume = readResume(parsed.search);
  const query = new URLSearchParams({ view: resume.view });
  for (const key of ['compose', 'idea', 'edit','angle'] as const) if (resume[key]) query.set(key, resume[key]!);
  return '/?' + query;
}
