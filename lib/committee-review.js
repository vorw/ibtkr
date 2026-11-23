// Pin one historical week for review without reopening its database writes.
// Set the ID to null to resume real-time selection. Maintenance applies only
// while its configured time window is active. Historical records stay intact.
/** @type {string | null} */
export const committeeReviewWeekId = 'week-2026-11-11';
export const committeeReviewEnabled = committeeReviewWeekId !== null;

/** @param {{id:string,endsAt:string}} week @param {boolean} review */
export function packagingSession(week, review) {
  // A review attempt has its own local storage and a full two-minute timer.
  // This does not change the challenge's real deadline or database identity.
  return {
    storageWeekId: review ? 'committee-review-' + week.id : week.id,
    endsAt: review ? '9999-12-31T23:59:59.999Z' : week.endsAt,
  };
}
