import type { Board } from '../domain/types';
export async function animateFlips(root:HTMLElement,before:Board,after:Board,ms:number):Promise<void> {
  const pending:Promise<unknown>[]=[];
  after.forEach((color,index)=>{
    if(!color||!before[index]||color===before[index])return;
    const stone=root.querySelector<HTMLElement>(`[data-index="${index}"] .stone`);
    if(!stone)return;
    const old=before[index]===1?'radial-gradient(circle at 32% 25%,#d8ffff,#39dce9 32%,#06768d 70%,#032732)':'radial-gradient(circle at 32% 25%,#fff0cf,#ffaf62 32%,#b14b22 70%,#36170e)';
    const current=getComputedStyle(stone).backgroundImage;
    const animation=stone.animate([
      {transform:'perspective(400px) rotateY(0deg)',backgroundImage:old,offset:0},
      {transform:'perspective(400px) rotateY(89deg)',backgroundImage:old,offset:.49},
      {transform:'perspective(400px) rotateY(91deg)',backgroundImage:current,offset:.51},
      {transform:'perspective(400px) rotateY(180deg)',backgroundImage:current,offset:1},
    ],{duration:ms,easing:'ease-in-out'});
    pending.push(animation.finished.catch(()=>undefined));
  });
  await Promise.all(pending);
}
