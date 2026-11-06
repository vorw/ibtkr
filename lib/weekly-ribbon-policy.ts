export const weeklyRibbonTarget=5;
// Temporary, bounded design review requested by the owner. Preserve the event
// and its cuts; only the ceremonial gate is paused for this week's test window.
export const weeklyRibbonReviewUntil='2026-11-06T23:35:00.000Z';
export function weeklyRibbonFor(week:{id:string;startsAt:string}|null,now=Date.now()){
  if(week?.id==='week-2026-11-11'&&now<Date.parse(weeklyRibbonReviewUntil))return null;
  return week&&week.startsAt>='2026-10-16T21:00:00.000Z'?{id:'ibtkr-weekly-ribbon-'+week.id,target:weeklyRibbonTarget}:null;
}
