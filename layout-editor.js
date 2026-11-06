import {LAYOUT_KEY,cloneLayout,moveLayout,layoutHeight,validLayout} from './layout-model.js';
import {cancelUI,framePointer,animateUI} from './data-motion.js?v=20261106-smooth-expand';
const {createElement:h,useState,useRef,useEffect,useLayoutEffect}=window.React;
const {createRoot,createPortal,flushSync}=window.ReactDOM;
const definitions=[
  {id:'supply',name:'供给侧',selector:'.supply-panel',minW:240,minH:240},
  {id:'consumer',name:'消费侧',selector:'.traffic-panel',minW:240,minH:160},
  {id:'metrics',name:'核心指标',selector:'#metrics-panel',minW:360,minH:240},
  {id:'contribution',name:'区域贡献',selector:'#regional-contributions',minW:360,minH:180},
  {id:'ranking',name:'主播榜单',selector:'.ranking-panel',minW:240,minH:320}
];
const icon=name=>h('img',{src:`assets/${name==='close'?'figma-layout-nov06':'figma-layout'}/${name}.svg`,alt:'',draggable:false});
function Card({item,definition,editing,begin,hide,keyboard}){
  const host=useRef(null),original=useRef(null);
  useLayoutEffect(()=>{
    const node=document.querySelector(definition.selector),placeholder=document.createComment('layout:'+item.id);
    node.before(placeholder);original.current={node,placeholder};host.current.append(node);
    return()=>{placeholder.replaceWith(node);};
  },[]);
  return h('section',{className:'layout-slot'+(editing?' is-editable':''),hidden:item.hidden,'data-layout-id':item.id,'aria-label':definition.name+'容器',style:{left:item.x,top:item.y,width:item.w,height:item.h}},
    h('div',{className:'layout-card-frame'+(['supply','consumer'].includes(item.id)?' left-column':''),ref:host,style:{width:item.baseW,height:item.baseH,transform:`scale(${item.w/item.baseW},${item.h/item.baseH})`,'--layout-base-width':item.baseW+'px','--layout-base-height':item.baseH+'px'}}),
    editing&&h('div',{className:'layout-drag-surface',role:'button',tabIndex:0,'aria-label':'移动'+definition.name,'aria-describedby':'layout-instructions',onPointerDown:event=>begin(event,item.id,'move'),onKeyDown:event=>keyboard(event,item.id,'move')}),
    editing&&h('button',{type:'button',className:'layout-hide','aria-label':'隐藏'+definition.name,onClick:()=>hide(item.id)},icon('close')),
    editing&&h('button',{type:'button',className:'layout-resize','aria-label':'调整'+definition.name+'大小',onPointerDown:event=>begin(event,item.id,'resize'),onKeyDown:event=>keyboard(event,item.id,'resize')},icon('resize'))
  );
}
export function initLayoutEditor(){
  const dashboard=document.querySelector('#dashboard'),trigger=document.querySelector('#settings');
  trigger.setAttribute('aria-label','自定义布局');trigger.setAttribute('title','自定义布局');trigger.setAttribute('aria-pressed','false');
  const mount=document.createElement('div');mount.id='layout-editor-root';document.body.append(mount);
  function Editor(){
    const [editing,setEditing]=useState(false),[expanded,setExpanded]=useState(dashboard.classList.contains('analysis-view'));
    const [saved,setSaved]=useState(()=>{try{const value=JSON.parse(localStorage.getItem(LAYOUT_KEY));return validLayout(value,definitions.map(d=>d.id))?value:null;}catch{return null;}});
    const [draft,setDraft]=useState(null),[error,setError]=useState(''),[moving,setMoving]=useState(null);
    const baseline=useRef(null),gesture=useRef(null),history=useRef({past:[],future:[]}),live=useRef({});
    const layout=editing?draft:saved;
    live.current={editing,layout,saved,expanded};
    function capture(){
      const nodes=definitions.map(def=>document.querySelector(def.selector)),transitions=nodes.map(node=>node.style.transition);
      nodes.forEach(node=>{cancelUI(node,'layout');cancelUI(node,'content');node.style.transition='none';});
      const rect=dashboard.getBoundingClientRect(),scale=rect.width/1440;
      const result=definitions.map((def,index)=>{const node=nodes[index],box=node.getBoundingClientRect(),transform=new DOMMatrixReadOnly(getComputedStyle(node).transform);return {id:def.id,x:(box.left-rect.left)/scale-transform.m41,y:(box.top-rect.top)/scale-transform.m42,w:box.width/scale,h:box.height/scale,baseW:box.width/scale,baseH:box.height/scale,minW:def.minW,minH:def.minH,hidden:false};});
      nodes.forEach((node,index)=>node.style.transition=transitions[index]);return result;
    }
    if(expanded&&!baseline.current&&saved)baseline.current=capture();
    function commit(next){history.current.past.push(cloneLayout(live.current.layout));history.current.future=[];setDraft(next);setError('');}
    function cancel(){gesture.current=null;setMoving(null);setDraft(null);setEditing(false);setError('');trigger.focus({preventScroll:true});}
    function save(){try{const isDefault=draft.every(item=>{const original=baseline.current.find(card=>card.id===item.id);return !item.hidden&&['x','y','w','h'].every(key=>Math.abs(item[key]-original[key])<.1);});if(isDefault){localStorage.removeItem(LAYOUT_KEY);setSaved(null);}else{localStorage.setItem(LAYOUT_KEY,JSON.stringify(draft));setSaved(cloneLayout(draft));}setEditing(false);setError('');trigger.focus({preventScroll:true});}catch{setError('布局未能保存，请重试。');}}
    function begin(event,id,kind){
      if(event.button!==0)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current={id,kind,startX:event.clientX,startY:event.clientY,scale:dashboard.getBoundingClientRect().width/1440,before:cloneLayout(live.current.layout)};
      setMoving(id);
    }
    function hide(id){const next=cloneLayout(draft);if(next.filter(item=>!item.hidden).length===1){setError('请至少保留一个板块。');return;}next.find(item=>item.id===id).hidden=true;commit(next);}
    function keyboard(event,id,kind){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const item=draft.find(item=>item.id===id),amount=event.shiftKey?32:8,dx=event.key==='ArrowRight'?amount:event.key==='ArrowLeft'?-amount:0,dy=event.key==='ArrowDown'?amount:event.key==='ArrowUp'?-amount:0;commit(moveLayout(draft,id,kind==='move'?{x:item.x+dx,y:item.y+dy}:{w:item.w+dx,h:item.h+dy}));}
    useEffect(()=>{
      const observer=new MutationObserver(()=>setExpanded(dashboard.classList.contains('analysis-view')));observer.observe(dashboard,{attributes:true,attributeFilter:['class']});
      const enter=()=>{
        if(!dashboard.classList.contains('analysis-view'))document.dispatchEvent(new Event('dashboard:open-analysis'));
        if(!baseline.current)baseline.current=capture();
        history.current={past:[],future:[]};setDraft(cloneLayout(live.current.saved||baseline.current));setError('');setEditing(true);setExpanded(true);
      };
      trigger.addEventListener('click',enter);
      const move=framePointer(event=>{const g=gesture.current;if(!g)return;const original=g.before.find(item=>item.id===g.id),dx=(event.clientX-g.startX)/g.scale,dy=(event.clientY-g.startY)/g.scale;setDraft(moveLayout(g.before,g.id,g.kind==='move'?{x:original.x+dx,y:original.y+dy}:{w:original.w+dx,h:original.h+dy}));});
      const end=()=>{const g=gesture.current;if(!g)return;flushSync(()=>move.flush());if(JSON.stringify(g.before)!==JSON.stringify(live.current.layout)){history.current.past.push(g.before);history.current.future=[];}gesture.current=null;setMoving(null);};
      const aborted=()=>{move.cancel();if(gesture.current)setDraft(gesture.current.before);gesture.current=null;setMoving(null);};
      const keys=event=>{if(!live.current.editing)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancel();}else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();const from=event.shiftKey?'future':'past',to=event.shiftKey?'past':'future';if(history.current[from].length){history.current[to].push(cloneLayout(live.current.layout));setDraft(history.current[from].pop());}}};
      document.addEventListener('pointermove',move);document.addEventListener('pointerup',end);document.addEventListener('pointercancel',aborted);document.addEventListener('keydown',keys,true);
      return()=>{move.cancel();observer.disconnect();trigger.removeEventListener('click',enter);document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',aborted);document.removeEventListener('keydown',keys,true);};
    },[]);
    useLayoutEffect(()=>{
      dashboard.classList.toggle('layout-editing',editing);dashboard.classList.toggle('has-custom-layout',!!layout&&expanded);dashboard.classList.toggle('layout-dragging',!!moving);
      trigger.setAttribute('aria-pressed',String(editing));
      const height=layout&&expanded?layoutHeight(layout):900;dashboard.dataset.canvasHeight=height;dashboard.style.height=height+'px';
      document.dispatchEvent(new CustomEvent('dashboard:layout-size'));
    },[editing,layout,expanded,moving]);
    useLayoutEffect(()=>{
      if(!editing)return;
      animateUI(dashboard.querySelector('.layout-edit-toolbar'),[{opacity:0,transform:'translateY(-5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220});
      dashboard.querySelectorAll('.layout-hide,.layout-resize').forEach((control,index)=>animateUI(control,[{opacity:0},{opacity:1}],{duration:170,delay:Math.min(index,5)*15}));
    },[editing]);
    if(!expanded||!layout)return null;
    return createPortal(h(window.React.Fragment,null,
      layout.map(item=>h(Card,{key:item.id,item,definition:definitions.find(def=>def.id===item.id),editing,begin,hide,keyboard})),
      editing&&h('div',{className:'layout-edit-toolbar',role:'toolbar','aria-label':'自定义布局', 'data-node-id':'744:139071'},
        h('button',{type:'button',className:'layout-reset',onClick:()=>commit(cloneLayout(baseline.current))},'恢复默认布局'),
        layout.some(item=>item.hidden)&&h('details',{className:'layout-hidden-list'},h('summary',null,'已隐藏板块'),h('div',null,layout.filter(item=>item.hidden).map(item=>h('button',{key:item.id,type:'button',onClick:()=>{const next=cloneLayout(draft);next.find(card=>card.id===item.id).hidden=false;commit(moveLayout(next,item.id,{}));}},'恢复'+definitions.find(def=>def.id===item.id).name)))),
        h('span',{className:'layout-error',role:'status'},error),
        h('div',{className:'layout-actions'},h('button',{type:'button',className:'layout-cancel',onClick:cancel},'Cancel'),h('button',{type:'button',className:'layout-save',onClick:save},'Save')),
        h('span',{id:'layout-instructions',className:'sr-only'},'拖动板块移动，拖动右下角缩放。方向键微调，按住 Shift 加速。Ctrl 或 Command 加 Z 撤销，Escape 取消。'),
        h('div',{className:'layout-toolbar-glow','aria-hidden':true},icon('glow'))
      )
    ),dashboard);
  }
  flushSync(()=>createRoot(mount).render(h(Editor)));
}
