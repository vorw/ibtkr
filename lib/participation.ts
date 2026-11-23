// Browser draft and sign-in resume helpers. Keep a draft attached to its
// original week, and allow only the known internal return actions.

export type Page = 'home' | 'ideas' | 'leaderboard' | 'profile';
export type Resume = {
  view: Page;
  compose?: string;
  idea?: string;
  edit?: string;
  angle?: string;
  week?: string;
};
const pages: Page[] = ['home', 'ideas', 'leaderboard', 'profile'];
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readResume(search: string): Resume {
  const params = new URLSearchParams(search);
  const view = params.get('view') as Page;
  const idea = params.get('idea');
  const edit = params.get('edit');
  const compose = params.get('compose');
  const week = params.get('week');
  return {
    ...(['change', 'reverse', 'what-if'].includes(params.get('angle') ?? '')
      ? { angle: params.get('angle')! }
      : {}),
    view: pages.includes(view) ? view : 'home',
    ...(week && /^week-\d{4}-\d{2}-\d{2}$/.test(week) ? { week } : {}),
    ...(idea && uuid.test(idea) ? { idea } : {}),
    ...(edit && uuid.test(edit) ? { edit } : {}),
    ...(compose && /^week-\d{4}-\d{2}-\d{2}$/.test(compose) ? { compose } : {}),
  };
}

export function signInHref(resume: Resume): string {
  const params = new URLSearchParams({ view: resume.view });
  if (resume.week) params.set('week', resume.week);
  if (resume.angle) params.set('angle', resume.angle);
  if (resume.compose) params.set('compose', resume.compose);
  if (resume.idea) params.set('idea', resume.idea);
  if (resume.edit) params.set('edit', resume.edit);
  return `/login?return_to=${encodeURIComponent(`/?${params}`)}`;
}

export type IdeaDraft = {
  id: string;
  title: string;
  body: string;
  angleId?: string;
  drawing?: string;
};
export function readIdeaDraft(value: string | null): IdeaDraft | null {
  try {
    const draft = JSON.parse(value ?? 'null');
    if (
      draft &&
      uuid.test(draft.id) &&
      ['title', 'body'].every((key) => typeof draft[key] === 'string') &&
      draft.title.length <= 100 &&
      draft.body.length <= 2000
    )
      return {
        id: draft.id,
        title: draft.title,
        body: draft.body,
        ...(typeof draft.angleId === 'string' &&
        ['change', 'reverse', 'what-if'].includes(draft.angleId)
          ? { angleId: draft.angleId }
          : {}),
        ...(typeof draft.drawing === 'string' &&
        draft.drawing.length <= 240023 &&
        /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(draft.drawing)
          ? { drawing: draft.drawing }
          : {}),
      };
  } catch {
    /* An unavailable or outdated local draft must not block a new idea. */
  }
  return null;
}

// Scope cleanup to old participation drafts. Never clear auth tokens, account
// settings, themes, or drafts written for the official weekly programme.
export function clearLegacyDrafts(
  storage: Pick<Storage, 'length' | 'key' | 'getItem' | 'removeItem'>,
): void {
  const legacy = ['ftc-draft-queue', 'ftc-draft-reverse', 'ftc-draft-alone'];
  try {
    const remove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !key.startsWith('ftc-draft-')) continue;
      if (
        legacy.includes(key) ||
        key === 'ftc-draft-week-2026-09-30' ||
        key.startsWith('ftc-draft-week-2026-09-30-')
      ) {
        remove.push(key);
        continue;
      }
      try {
        if (
          legacy.includes(JSON.parse(storage.getItem(key) ?? 'null')?.legacyKey)
        )
          remove.push(key);
      } catch {
        /* Unrelated or malformed drafts are not reset. */
      }
    }
    for (const key of remove) storage.removeItem(key);
  } catch {
    /* Storage restrictions must not prevent account access. */
  }
}
