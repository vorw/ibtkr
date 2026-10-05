export type Page = 'home' | 'ideas' | 'leaderboard' | 'profile';
export type Resume = { view: Page; compose?: string; idea?: string; edit?: string;angle?:string };
const pages: Page[] = ['home', 'ideas', 'leaderboard', 'profile'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readResume(search: string): Resume {
  const params = new URLSearchParams(search);
  const view = params.get('view') as Page;
  const idea = params.get('idea');
  const edit = params.get('edit');
  const compose = params.get('compose');
  return {
    ...(['change','reverse','what-if'].includes(params.get('angle')??'')?{angle:params.get('angle')!}:{}),
    view: pages.includes(view) ? view : 'home',
    ...(idea && uuid.test(idea) ? { idea } : {}),
    ...(edit && uuid.test(edit) ? { edit } : {}),
    ...(compose && /^week-\d{4}-\d{2}-\d{2}$/.test(compose) ? { compose } : {}),
  };
}

export function signInHref(resume: Resume): string {
  const params = new URLSearchParams({ view: resume.view });
  if(resume.angle)params.set('angle',resume.angle);
  if (resume.compose) params.set('compose', resume.compose);
  if (resume.idea) params.set('idea', resume.idea);
  if (resume.edit) params.set('edit', resume.edit);
  return `/login?return_to=${encodeURIComponent(`/?${params}`)}`;
}

export type IdeaDraft = { id: string; title: string; body: string; angleId?: string;legacyKey?:string };
export function readIdeaDraft(value: string | null): IdeaDraft | null {
  try {
    const draft = JSON.parse(value ?? 'null');
    if (draft && uuid.test(draft.id) && ['title', 'body'].every(key => typeof draft[key] === 'string') && draft.title.length <= 100 && draft.body.length <= 2000) return { id: draft.id, title: draft.title, body: draft.body, ...(['ftc-draft-queue','ftc-draft-reverse','ftc-draft-alone'].includes(draft.legacyKey)?{legacyKey:draft.legacyKey}:{}), ...(typeof draft.angleId === 'string' && ['change','reverse','what-if'].includes(draft.angleId) ? {angleId:draft.angleId} : {}) };
  } catch { /* An unavailable or outdated local draft must not block a new idea. */ }
  return null;
}

