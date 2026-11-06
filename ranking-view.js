// Figma 737:22657 and 744:144167. Amounts are demo data.
export const governanceReasons=['不推荐','礼物功能限制','直播封禁','断播'];
export const creatorStatus=(creator,ranking)=>ranking===1?`${creator.inactiveDays}天未开播`:ranking===2?(creator.reasons?.join('、')||creator.reason):`${creator.startDate?.slice(5).replace('-','.')||'今日'} ${creator.duration||'—'}`;
export const gradeClass=grade=>grade==='Top'?'top':grade==='G3'?'neutral':grade==='Pre-top'?'pre-top':'mature';
export const rankingExplanation=ranking=>ranking===1?'仅统计今日仍未开播、且连续未开播天数超过所选门槛的大主播，按 T−30 至 T−1 的主播收入从高到低排序。榜单仅展示名单及连续未开播天数，不展示收入。':'仅统计当前仍处于治理状态的大主播；断播统计 UTC 今日收到断播处罚的主播，按 T−30 至 T−1 的主播收入从高到低排序。榜单仅展示名单及当前治理原因，不展示收入。';
export function initRankingControls({state,renderRanking}){
  const panel=document.querySelector('.ranking-panel');
  const toolbar=document.createElement('div');toolbar.className='ranking-state-filters';toolbar.hidden=true;
  panel.querySelector('.ranking-filters').after(toolbar);
  const help=document.createElement('div');help.className='ranking-explanation';help.id='ranking-explanation';help.role='tooltip';help.hidden=true;panel.append(help);
  const arrow='<img src="assets/figma-ranking/chevron.svg" alt="">';
  function sync(){
    const special=state.ranking!==0;panel.dataset.ranking=state.ranking;
    panel.querySelector('.ranking-filters').hidden=special;toolbar.hidden=!special;help.hidden=true;
    if(!special)return;
    const inactive=state.ranking===1;
    const options=inactive?[1,3,7,14,30].map(n=>[String(n),`连续超 ${n} 天未开播`]):[['all','全部'],...governanceReasons.map(s=>[s,s])];
    const selected=inactive?String(state.inactiveDays):state.governance;
    toolbar.innerHTML=`<details class="ranking-select ${inactive?'ranking-inactive-select':''}"><summary aria-label="${inactive?'连续未开播天数':'治理原因筛选'}">${options.find(([key])=>key===selected)[1]}${arrow}</summary><div class="ranking-options" aria-label="${inactive?'未开播天数选项':'治理原因选项'}">${options.map(([key,label])=>`<button type="button" data-ranking-filter="${key}" aria-pressed="${key===selected}">${label}</button>`).join('')}</div></details><div class="ranking-sort-note"><span>仅统计今日</span><i></i><span title="近30天收入倒排">近30天收入倒排</span><button type="button" class="ranking-help" aria-label="${inactive?'未开播':'被治理'}榜单排序说明" aria-describedby="ranking-explanation" aria-expanded="false"><img src="assets/figma-ranking/help.svg" alt=""></button></div>`;
    help.textContent=rankingExplanation(state.ranking);
    const trigger=toolbar.querySelector('.ranking-help');
    const show=()=>{help.hidden=false;trigger.setAttribute('aria-expanded','true');};
    const hide=()=>{help.hidden=true;trigger.setAttribute('aria-expanded','false');};
    trigger.addEventListener('pointerenter',show);trigger.addEventListener('pointerleave',hide);trigger.addEventListener('focus',show);trigger.addEventListener('blur',hide);trigger.addEventListener('click',show);
  }
  toolbar.addEventListener('click',event=>{const option=event.target.closest('[data-ranking-filter]');if(!option)return;if(state.ranking===1)state.inactiveDays=Number(option.dataset.rankingFilter);else state.governance=option.dataset.rankingFilter;state.page=1;renderRanking();});
  document.addEventListener('pointerdown',event=>{if(!toolbar.contains(event.target))toolbar.querySelector('details')?.removeAttribute('open');if(!event.target.closest('.ranking-help'))help.hidden=true;});
  toolbar.addEventListener('keydown',event=>{if(event.key==='Escape'){toolbar.querySelector('details')?.removeAttribute('open');help.hidden=true;event.stopPropagation();}if(['ArrowDown','ArrowUp'].includes(event.key)&&event.target.closest('details')){event.preventDefault();const details=toolbar.querySelector('details');details.open=true;const buttons=[...details.querySelectorAll('button')];const index=buttons.indexOf(document.activeElement);buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();}});
  document.addEventListener('dashboard:ranking',sync);sync();
}
