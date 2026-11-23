// Turns a frozen placement into an Arabic HTML/plain-text congratulations.
// Participant text is escaped; rendering this template does not send it.

import { weeklyEmailHtml } from './weekly-email-html';
import type { WeeklyChallenge } from './weekly';

export type WeeklyEmailResult = {
  user_id: string;
  name: string;
  likes: number;
  rank: number;
  entries: number;
};
const placements = ['الأول', 'الثاني', 'الثالث'];
const accents = ['#c9f86d', '#d9caff', '#ffc7a9'];
const number = new Intl.NumberFormat('ar-SA-u-nu-arab');
const date = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Riyadh',
});
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );

export function renderWeeklyEmail(
  week: WeeklyChallenge,
  result: WeeklyEmailResult,
) {
  if (
    ![1, 2, 3].includes(result.rank) ||
    !Number.isSafeInteger(result.likes) ||
    result.likes < 1
  )
    throw Error('Invalid congratulations result');
  const name =
    result.name
      .replace(/[\r\n\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, 100) || 'مبدعنا';
  const placement = placements[result.rank - 1];
  const likes = number.format(result.likes);
  const subject =
    result.rank === 1
      ? `${name}، أنت مبتكر الأسبوع في ابتكر!`
      : result.rank === 2
        ? `${name}، المركز الثاني من نصيبك. ألف مبروك!`
        : `${name}، أنت ضمن أفضل ثلاثة هذا الأسبوع!`;
  const preheader = `${likes} إعجاب على حلولك، والمركز ${placement} من نصيبك. ألف مبروك!`;
  const message =
    result.rank === 1
      ? `وصلت للمركز الأول في تحدّي الأسبوع، وحلولك جمعت ${likes} إعجاب من المجتمع. سعدنا بمشاركتك، وبهالإنجاز اللي حققته معنا.`
      : result.rank === 2
        ? `المركز الثاني من نصيبك في تحدّي الأسبوع! حلولك جمعت ${likes} إعجاب من المجتمع، وصار لك مكان بين متصدّري الأسبوع.`
        : `وصلت للمركز الثالث في تحدّي الأسبوع، وحلولك جمعت ${likes} إعجاب من المجتمع. إنجاز يستاهل نحتفل فيه معك!`;
  // Keep wording neutral: a display name is not evidence of a person's gender.
  const closing =
    result.rank === 1
      ? 'شكراً لأنك شفت المشكلة من زاوية مختلفة وشاركتنا حلّك. ننتظر فكرتك الجاية!'
      : result.rank === 2
        ? 'شكراً على الأفكار اللي شاركتنا فيها. وجودك معنا يضيف للمجتمع، وننتظر إبداعك في التحدّي الجاي!'
        : 'شكراً على مشاركتك وعلى الزاوية اللي أضفتها للمجتمع. سعدنا بوجودك، وننتظر فكرتك الجاية!';
  const leaderboardUrl = `https://ibtkr.space/?${new URLSearchParams({ view: 'leaderboard', week: week.id })}`;
  const dateRange = `${date.format(new Date(week.startsAt))} — ${date.format(new Date(new Date(week.endsAt).getTime() - 1))}`;
  const values: Record<string, string> = {
    name,
    likes,
    subject,
    preheader,
    placement,
    message,
    closing,
    leaderboardUrl,
    dateRange,
    weekNumber: week.number,
    weekTitle: week.title,
    rankNumber: String(result.rank).padStart(2, '0'),
    accent: accents[result.rank - 1],
    eyebrow: result.rank === 1 ? 'مبتكر الأسبوع' : 'من متصدّري الأسبوع',
    headline: ['الأول هذا الأسبوع،', 'إبداعك له مكان،', 'فكرتك وصلت،'][
      result.rank - 1
    ],
    subtitle: [
      'فكرتك تستاهل هاللحظة.',
      'وهالأسبوع، مكانك الثاني.',
      'ضمن أفضل ثلاثة هالأسبوع.',
    ][result.rank - 1],
  };
  const html = weeklyEmailHtml.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!(key in values)) throw Error('Unknown email template field');
    return escapeHtml(values[key]);
  });
  const text = `${subject}\n\nألف مبروك يا ${name}!\n\n${message}\n\nتحدّي الأسبوع ${week.number}\n${week.title}\n${dateRange}\n\n${closing}\n\nشاهد ترتيبك: ${leaderboardUrl}\n\nفخورين فيك،\nفريق ابتكر\nلجنة الابتكار · نادي تقنية المستقبل\nibtkr.space`;
  return { subject, html, text };
}
