export const weeklyRibbonTarget=5;
export function weeklyRibbonFor(week:{id:string;startsAt:string}|null){
  return week&&week.startsAt>='2026-10-16T21:00:00.000Z'?{id:'ibtkr-weekly-ribbon-'+week.id,target:weeklyRibbonTarget}:null;
}
