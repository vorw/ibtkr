export type Page = 'home' | 'challenges' | 'ideas' | 'profile';
export type Resume = { view: Page; compose?: string; idea?: string; edit?: string };
const pages: Page[] = ['home', 'challenges', 'ideas', 'profile'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readResume(search: string): Resume {
  const params = new URLSearchParams(search);
  const view = params.get('view') as Page;
  const idea = params.get('idea');
  const edit = params.get('edit');
  const compose = params.get('compose');
  return {
    view: pages.includes(view) ? view : 'home',
    ...(idea && uuid.test(idea) ? { idea } : {}),
    ...(edit && uuid.test(edit) ? { edit } : {}),
    ...(compose && ['queue', 'reverse', 'alone'].includes(compose) ? { compose } : {}),
  };
}

export function signInHref(resume: Resume): string {
  const params = new URLSearchParams({ view: resume.view });
  if (resume.compose) params.set('compose', resume.compose);
  if (resume.idea) params.set('idea', resume.idea);
  if (resume.edit) params.set('edit', resume.edit);
  return `/login?return_to=${encodeURIComponent(`/?${params}`)}`;
}

export type IdeaDraft = { id: string; name: string; title: string; body: string };
export function readIdeaDraft(value: string | null): IdeaDraft | null {
  try {
    const draft = JSON.parse(value ?? 'null');
    if (draft && uuid.test(draft.id) && ['name', 'title', 'body'].every(key => typeof draft[key] === 'string') && draft.name.length <= 40 && draft.title.length <= 100 && draft.body.length <= 2000) return draft;
  } catch { /* An unavailable or outdated local draft must not block a new idea. */ }
  return null;
}
