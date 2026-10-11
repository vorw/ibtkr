export const ringGoal=[2,1,3];
export const sliderGoal=[2,0,1];
export const sealGoal=['○','◇','△'];
export function turnRing(values:number[],index:number){return values.map((v,i)=>(v+((i===index||i===index+1)?1:0))%4);}
export function shiftSlider(values:number[],index:number){return values.map((v,i)=>(v+((i===index||i===(index+1)%3)?1:0))%3);}
export function matches(values:number[],goal:number[]){return values.every((v,i)=>v===goal[i]);}
export function pressSeal(progress:number,symbol:string){return symbol===sealGoal[progress]?progress+1:(symbol===sealGoal[0]?1:0);}
