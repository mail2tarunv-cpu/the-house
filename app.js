(() => {
'use strict';
const $ = s => document.querySelector(s);
const house = $('#house-scene'), detail = $('#detail-layer'), detailImage=$('#detail-image'), map=$('#object-hits');
const modal=$('#artifact'), backdrop=$('#dialog-backdrop'), body=$('#artifact-body');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const NS='http://www.w3.org/2000/svg', ORIGINAL={x:0,y:0,w:1672,h:941};
const ROOMS={
 maya:{name:"Maya's room",eyebrow:'A ROOM FULL OF STORIES',center:[520,265],width:720,img:'./assets/rooms/maya.webp',anchor:[550,255],label:'Maya'},
 jay:{name:"Jay's room",eyebrow:'THE SOUNDTRACK CORNER',center:[1168,263],width:750,img:'./assets/rooms/jay.webp',anchor:[1163,261],label:'Jay'},
 lounge:{name:'The shared lounge',eyebrow:'THE PLACE WE SHARE',center:[840,616],width:1120,img:'./assets/rooms/lounge.webp',anchor:[820,607],label:'The lounge'}
};
const OBJECTS={
 maya:[
  {id:'books',label:'Bookcase',rect:[596,345,559,335],point:[865,385]},
  {id:'daily',label:"Today's photo",rect:[1252,510,292,254],point:[1368,542]},
  {id:'notes',label:'Letters & notes',rect:[1375,297,161,232],point:[1463,314]},
  {id:'update',label:'Life lately',rect:[1180,570,171,160],point:[1284,583]}
 ],
 jay:[
  {id:'movies',label:'Film wall',rect:[375,220,526,316],point:[620,260]},
  {id:'vinyl',label:'Record player',rect:[340,537,452,183],point:[548,567]},
  {id:'daily',label:"Today's photo",rect:[1305,577,259,230],point:[1395,590]},
  {id:'notes',label:'Visitor notes',rect:[1330,402,177,168],point:[1410,414]},
  {id:'update',label:'Life lately',rect:[1252,652,138,117],point:[1334,671]}
 ],
 lounge:[
  {id:'tv',label:'Watch together',rect:[25,298,308,300],point:[218,326]},
  {id:'gallery',label:'Our memories',rect:[460,188,471,303],point:[677,222]},
  {id:'daily',label:"Today's photo",rect:[620,426,236,144],point:[745,435]},
  {id:'notes',label:'Leave a note',rect:[598,548,255,131],point:[714,561]},
  {id:'update',label:'Life lately',rect:[1076,405,247,170],point:[1170,423]}
 ]
};
const INITIAL={
 books:[{name:'The Creative Act',description:'A reminder to make things for the joy of it.',status:'reading',room:'maya'}, {name:'Crying in H Mart',description:'Still thinking about this one.',status:'favorites',room:'maya'}, {name:'Tomorrow, and Tomorrow, and Tomorrow',description:'I keep recommending this to friends.',status:'tbr',room:'maya'}],
 movies:[{name:'Before Sunrise',description:'The conversations feel like coming home.',status:'favorites',room:'jay'}, {name:'Perfect Days',description:'A gentle reminder to notice ordinary things.',status:'recent',room:'jay'}, {name:'The Grand Budapest Hotel',description:'For the colors alone.',status:'watchlist',room:'jay'}],
 vinyl:[{name:'Blonde — Frank Ocean',description:'For rainy afternoons.',status:'favorites',room:'jay'}, {name:'Currents — Tame Impala',description:'Still sounds like the future.',status:'favorites',room:'jay'}, {name:'In Rainbows — Radiohead',description:'No skips.',status:'favorites',room:'jay'}],
 notes:[{room:'maya',from:'Jay',text:'Saw your favorite book today and immediately thought of you.',date:'Yesterday'}],
 updates:{maya:'Trying to finish two books before the month ends. I keep making tea and finding reasons to stay in.',jay:'Found a tiny record shop I could spend three hours in. Currently playing everything on repeat.',lounge:'We still owe each other a movie night.'},
 photos:{},presence:{maya:true,jay:false,you:true},loungeMembers:{maya:true,jay:false}
};
const key='the-house-demo-v4';
function load(){try{const legacy=JSON.parse(localStorage.getItem(key)||'null');if(legacy?.version===4&&legacy.data){const v=legacy.data;const out=structuredClone(INITIAL);for(const k of Object.keys(out))if(v[k])out[k]=v[k];return out;}}catch{}return structuredClone(INITIAL);}
const data=load();
function store(){try{localStorage.setItem(key,JSON.stringify({version:4,data}));}catch{toast('Storage is full. Try a smaller image.');}}
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today=()=>new Date().toLocaleDateString('en-CA');
let room=null, active=null, filter='all', selected=0, vinylPlaying=false, pendingPhoto=null;
let camera={...ORIGINAL}, navToken=0, lastFocus=null, messageTimeout;
// Maya: consistent physical scale in both scenes and real room-floor traversal.
// Every standing frame uses its native aspect ratio; seated poses are scaled to the same person.
const MAYA_ROOT='./assets/characters/maya/';
const MAYA_DIMENSIONS={
  'idle-fixed.webp':[310,390],
  'walk_0-fixed.webp':[310,390],'walk_1-fixed.webp':[310,390],
  'walk_2-fixed.webp':[310,390],'walk_3-fixed.webp':[310,390],
  'read.webp':[342,344],'write.webp':[403,347],
  'write_atdesk_v17.webp':[660,560],
  ...Object.fromEntries(Array.from({length:8},(_,i)=>['walk_v17_'+i+'.webp',[330,616]])),
  'lounge.webp':[546,324],'plant.webp':[297,329]
};
// x = visual center; bottom = contact point in 1672 × 941 room coordinates.
// Sit/writing illustrations contain props, so their overall bounding boxes are wider.
const MAYA_POSES={
  maya:{
    idle:{frame:'idle-fixed.webp',x:1106,bottom:850,h:320,description:'Standing by the books'},
    walk:{frame:'walk_0-fixed.webp',x:1110,bottom:850,h:320,description:'Walking through the room'},
    read:{frame:'read.webp',x:965,bottom:851,h:222,description:'Reading by the green pouf'},
    write:{frame:'write_atdesk_v17.webp',x:1300,bottom:742,h:290,description:'Writing at the desk'},
    plant:{frame:'plant.webp',x:1470,bottom:850,h:372,description:'Checking the plant beside the desk'}
  },
  lounge:{
    idle:{frame:'idle-fixed.webp',x:1080,bottom:849,h:320,description:'Standing in the lounge'},
    walk:{frame:'walk_0-fixed.webp',x:1070,bottom:849,h:320,description:'Walking along the lounge floor'},
    read:{frame:'read.webp',x:475,bottom:817,h:217.5,description:'Reading in the lounge'},
    relax:{frame:'lounge.webp',x:890,bottom:677,h:267,description:'Sitting on the existing sofa'},
    plant:{frame:'plant.webp',x:1280,bottom:850,h:372,description:'Checking the kitchen plants'}
  }
};
const MAYA_WALK_ROUTES={
  maya:[{x:1045,bottom:850},{x:1300,bottom:850}],
  lounge:[{x:1020,bottom:851},{x:1340,bottom:848}]
};
const MAYA_LABELS={idle:'Stand',walk:'Walk',read:'Read',write:'Write',relax:'Relax',plant:'Plants'};
const mayaCharacter=$('#maya-character'),mayaPose=$('#maya-pose');
const mayaActions=$('#maya-actions'),mayaActionsList=$('#maya-actions-list');
const mayaCurrent={maya:'idle',lounge:'relax'};
let mayaFrame=-1,mayaAnimationId=0;
const mayaTravel={room:null,x:0,bottom:0,goal:1,last:0,holdUntil:0,facing:'right'};

// Cut the furniture out of old illustrated pose images once, using transparent
// canvas masks. Render only Maya over the furniture already painted in each room.
// Using the original assets here avoids introducing a second sofa / desk / pouf.
const MAYA_ART={};
const MAYA_CUT_BOUNDS={
  'read.webp':[27,15,289,306],
  'write.webp':[48,12,342,333],
  'lounge.webp':[112,12,290,308]
};
const MAYA_CUT_SHAPES={
  'read.webp':[
    [0.18,0.62],[0.13,0.51],[0.17,0.34],[0.23,0.13],[0.35,0.04],
    [0.52,0.06],[0.66,0.19],[0.72,0.47],[0.86,0.63],[0.88,0.75],
    [0.74,0.87],[0.56,0.94],[0.33,0.86],[0.12,0.77],[0.09,0.69]
  ],
  'write.webp':[
    [0.18,0.68],[0.15,0.46],[0.18,0.31],[0.26,0.09],[0.44,0.01],
    [0.59,0.05],[0.68,0.24],[0.81,0.45],[0.88,0.59],[0.75,0.68],
    [0.89,0.88],[0.86,0.98],[0.60,0.98],[0.45,0.9],[0.35,0.81],[0.23,0.79]
  ],
  'lounge.webp':[
    [0.28,0.56],[0.3,0.33],[0.38,0.1],[0.49,0.02],[0.58,0.13],
    [0.64,0.4],[0.73,0.55],[0.7,0.69],[0.6,0.78],[0.63,0.94],
    [0.59,0.99],[0.46,0.99],[0.4,0.84],[0.34,0.77],[0.25,0.69]
  ]
};
const MAYA_DYNAMIC_DIMS={};
function mayaImg(src){
  return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);
    im.onerror=reject;im.src=MAYA_ROOT+src;});
}
function mayaMaskCanvas(source,points,bounds){
  const canvas=document.createElement('canvas');
  canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
  const context=canvas.getContext('2d',{willReadFrequently:false});
  if(!context)return null;
  context.drawImage(source,0,0);
  context.globalCompositeOperation='destination-in';
  context.fillStyle='#000';
  context.beginPath();
  points.forEach(([x,y],index)=>{
    const xx=x*canvas.width,yy=y*canvas.height;
    if(index===0)context.moveTo(xx,yy);else context.lineTo(xx,yy);
  });
  context.closePath();context.fill();
  context.globalCompositeOperation='source-over';
  const [xx,yy,ww,hh]=bounds;
  const sx=Math.max(0,Math.min(canvas.width-1,xx));
  const sy=Math.max(0,Math.min(canvas.height-1,yy));
  const cw=Math.min(ww,canvas.width-sx),ch=Math.min(hh,canvas.height-sy);
  const out=document.createElement('canvas');out.width=cw;out.height=ch;
  out.getContext('2d').drawImage(canvas,sx,sy,cw,ch,0,0,cw,ch);
  return out;
}
async function mayaPrepareArtwork(){
  const assets=['read.webp','write.webp','lounge.webp','plant.webp','idle-fixed.webp'];
  const results=await Promise.allSettled(assets.map(mayaImg));
  const loaded=Object.fromEntries(results.map((result,index)=>
    [assets[index],result.status==='fulfilled'?result.value:null]));
  for(const name of Object.keys(MAYA_CUT_SHAPES)){
    const source=loaded[name];if(!source)continue;
    const shape=MAYA_CUT_SHAPES[name];
    // The polygon is in normalized source-image coordinates.
    const b=MAYA_CUT_BOUNDS[name];
    const canvas=mayaMaskCanvas(source,shape,b);
    if(!canvas)continue;
    MAYA_ART[name]=canvas.toDataURL('image/webp',.94);
    MAYA_DYNAMIC_DIMS[name]=[canvas.width,canvas.height];
  }
  // Plant pose was cut off at the waist. Reconstruct the trousers from Maya's
  // matching standing artwork, then lay the reaching torso over that pair of legs.
  if(loaded['plant.webp']&&loaded['idle-fixed.webp']){
    const upper=loaded['plant.webp'],idle=loaded['idle-fixed.webp'];
    const out=document.createElement('canvas');out.width=340;out.height=445;
    const ctx=out.getContext('2d');
    if(ctx){
      const [iw,ih]=[idle.naturalWidth,idle.naturalHeight];
      ctx.drawImage(idle,iw*.22,ih*.64,iw*.66,ih*.36,60,250,181,190);
      ctx.drawImage(upper,15,0,310,332);
      MAYA_ART['plant.webp']=out.toDataURL('image/webp',.94);
      MAYA_DYNAMIC_DIMS['plant.webp']=[340,445];
    }
  }
  if(MAYA_POSES[room]?.[mayaCurrent[room]]){
    const pose=MAYA_POSES[room][mayaCurrent[room]];
    if(MAYA_ART[pose.frame]){mayaPose.src=MAYA_ART[pose.frame];mayaLayout();}
  }
}
function mayaImageSource(name){
  if(MAYA_CUT_SHAPES[name]||name==='plant.webp')
    return MAYA_ART[name]||MAYA_ROOT+'idle-fixed.webp';
  return MAYA_ROOT+name;
}
mayaPrepareArtwork().catch(()=>{});
// Preload and decode motion assets once so image changes don't pause mid-stride.
const MAYA_MOTION_IMAGES=Array.from({length:8},(_,i)=>{
  const img=new Image();img.decoding='async';img.src=MAYA_ROOT+'walk_v17_'+i+'.webp';
  if(img.decode)img.decode().catch(()=>{});
  return img;
});
const MAYA_WRITING_IMAGE=new Image();
MAYA_WRITING_IMAGE.decoding='async';
MAYA_WRITING_IMAGE.src=MAYA_ROOT+'write_atdesk_v17.webp';
if(MAYA_WRITING_IMAGE.decode)MAYA_WRITING_IMAGE.decode().catch(()=>{});
// Short, interruptible character choreography. One synchronized animation controller.
const MAYA_APPROACH={
  maya:{idle:1106,walk:1110,read:1040,write:1275,plant:1400},
  lounge:{idle:1080,walk:1070,read:550,relax:980,plant:1270}
};
const MAYA_UPRIGHT={w:320*310/390,h:320};
const mayaStage={active:false,x:1106,bottom:850,...MAYA_UPRIGHT};
let mayaMotionToken=0,mayaMoveRaf=0,mayaSettlingTimer=0;
function mayaCurrentPose(){return MAYA_POSES[room]?.[mayaCurrent[room]]||null;}
function mayaFrameSize(pose){
  const d=MAYA_DYNAMIC_DIMS[pose.frame]||MAYA_DIMENSIONS[pose.frame]||[310,390];
  const w=pose.w??(pose.h*d[0]/d[1]);
  return {w,h:pose.h??(pose.w*d[1]/d[0])};
}
function mayaLayout(){
  if(mayaCharacter.hidden||detail.hidden||!mayaCurrentPose())return;
  const p=mayaCurrentPose(),sz=mayaFrameSize(p);
  const pos=mayaStage.active?mayaStage:{x:p.x,bottom:p.bottom,...sz};
  const width=detail.clientWidth,height=detail.clientHeight;
  if(!width||!height)return;
  const scale=Math.max(width/1672,height/941),ox=(width-1672*scale)/2,oy=(height-941*scale)/2;
  mayaCharacter.style.left=(ox+pos.x*scale)+'px';
  mayaCharacter.style.top=(oy+pos.bottom*scale)+'px';
  mayaCharacter.style.width=(pos.w*scale)+'px';
  mayaCharacter.style.height=(pos.h*scale)+'px';
}
function mayaAbort(){
  ++mayaMotionToken;
  if(mayaMoveRaf)cancelAnimationFrame(mayaMoveRaf);
  if(mayaAnimationId)cancelAnimationFrame(mayaAnimationId);
  if(mayaSettlingTimer)clearTimeout(mayaSettlingTimer);
  mayaMoveRaf=mayaAnimationId=mayaSettlingTimer=0;
  mayaTravel.last=0;
}
function mayaSetFrame(frame,dir='right'){
  const src=frame.startsWith('walk_')?MAYA_ROOT+frame:mayaImageSource(frame);
  if(mayaPose.getAttribute('src')!==src)mayaPose.setAttribute('src',src);
  mayaCharacter.dataset.sprite=frame;
  mayaPose.style.transform=dir==='left'?'scaleX(-1)':'';
}
function mayaSleep(ms,token){return new Promise(resolve=>{
  mayaSettlingTimer=setTimeout(()=>{mayaSettlingTimer=0;resolve(token===mayaMotionToken);},ms);
});}
function mayaTween(from,to,ms,token,walking=false){return new Promise(resolve=>{
  const start=performance.now();let last=-1;
  function tick(now){
    if(token!==mayaMotionToken||mayaCharacter.hidden){resolve(false);return;}
    const t=Math.min(1,(now-start)/ms),eased=t*t*(3-2*t);
    mayaStage.active=true;
    for(const k of ['x','bottom'])mayaStage[k]=from[k]+(to[k]-from[k])*eased;
    mayaStage.w=MAYA_UPRIGHT.w;mayaStage.h=MAYA_UPRIGHT.h;
    if(walking){
      const step=Math.floor(now/110)%8;
      if(step!==last){last=step;mayaSetFrame('walk_v17_'+step+'.webp',to.x<from.x?'left':'right');}
    }
    mayaLayout();
    if(t<1)mayaMoveRaf=requestAnimationFrame(tick);
    else{mayaMoveRaf=0;resolve(true);}
  }
  mayaMoveRaf=requestAnimationFrame(tick);
});}
async function mayaAct(action,{instant=false}={}){
  const pose=MAYA_POSES[room]?.[action];
  if(!pose)return;
  const was=mayaCurrent[room];
  const previous=mayaStage.active?{x:mayaStage.x,bottom:mayaStage.bottom,w:mayaStage.w,h:mayaStage.h}:
    {x:MAYA_POSES[room][was].x,bottom:MAYA_POSES[room][was].bottom,...mayaFrameSize(MAYA_POSES[room][was])};
  mayaAbort();const token=mayaMotionToken,where=room;
  mayaCurrent[room]=action;
  Object.assign(mayaStage,previous,{active:true});
  mayaCharacter.dataset.motion='moving';
  mayaLayout();
  mayaCharacter.dataset.action=action;
  mayaCharacter.setAttribute('aria-label','Maya: '+pose.description);
  mayaActionsList.querySelectorAll('[data-maya-action]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.mayaAction===action)));
  const finish=()=>{
    if(token!==mayaMotionToken||room!==where)return;
    mayaStage.active=false;delete mayaCharacter.dataset.motion;
    mayaSetFrame(pose.frame);mayaPose.style.opacity='1';
    mayaCharacter.dataset.action=action;mayaLayout();
  };
  if(instant||reduce.matches){finish();return;}
  const ground={x:previous.x,bottom:850,...MAYA_UPRIGHT};
  const goal={x:MAYA_APPROACH[room][action]??pose.x,bottom:850,...MAYA_UPRIGHT};
  // Rise before walking away from existing furniture, without bringing in duplicate props.
  if(['read','write','relax','plant'].includes(was)&&was!==action){
    mayaPose.style.opacity='0';
    if(!await mayaSleep(130,token))return;
    Object.assign(mayaStage,ground);
    mayaSetFrame('idle-fixed.webp');mayaLayout();
    mayaPose.style.opacity='1';
    if(!await mayaSleep(130,token))return;
  }
  const current=mayaStage.active?{x:mayaStage.x,bottom:mayaStage.bottom,w:mayaStage.w,h:mayaStage.h}:previous;
  if(action==='walk'){
    const path=MAYA_WALK_ROUTES[room];
    if(!path){finish();return;}
    const first={x:path[0].x,bottom:path[0].bottom,...MAYA_UPRIGHT};
    if(!await mayaTween(current,first,Math.max(220,Math.abs(current.x-first.x)*2.5),token,true))return;
    async function patrol(){
      let prev=first,dir=1;
      while(token===mayaMotionToken&&room===where&&mayaCurrent[room]==='walk'){
        const next={x:path[dir].x,bottom:path[dir].bottom,...MAYA_UPRIGHT};
        if(!await mayaTween(prev,next,Math.max(380,Math.abs(next.x-prev.x)*5.4),token,true))return;
        if(!await mayaSleep(160,token))return;
        prev=next;dir=1-dir;
      }
    }
    patrol();return;
  }
  if(Math.abs(current.x-goal.x)>35){
    if(!await mayaTween(current,goal,Math.max(240,Math.abs(current.x-goal.x)*4.2),token,true))return;
  }else{
    if(!await mayaTween(current,goal,230,token,false))return;
  }
  if(token!==mayaMotionToken)return;
  // Brief readiness pose, then a synchronized image/position settle into the final action.
  mayaSetFrame('idle-fixed.webp');
  if(!await mayaSleep(115,token))return;
  mayaPose.style.opacity='0';
  if(!await mayaSleep(125,token))return;
  Object.assign(mayaStage,{active:true,x:pose.x,bottom:pose.bottom,...mayaFrameSize(pose)});
  mayaSetFrame(pose.frame);mayaLayout();
  requestAnimationFrame(()=>{if(token===mayaMotionToken&&room===where)mayaPose.style.opacity='1';});
  if(!await mayaSleep(240,token))return;
  finish();
}
function setMayaPose(name){mayaAct(name);}
function mayaSwitchButtons(){
  const poseGroup=MAYA_POSES[room];
  mayaActionsList.replaceChildren();
  if(!poseGroup)return;
  for(const action of Object.keys(poseGroup)){
    const btn=document.createElement('button');btn.type='button';
    btn.dataset.mayaAction=action;btn.textContent=MAYA_LABELS[action];
    btn.setAttribute('aria-pressed',String(mayaCurrent[room]===action));
    btn.title=poseGroup[action].description;mayaActionsList.appendChild(btn);
  }
  mayaCharacter.hidden=false;mayaStage.active=false;
  mayaAct(mayaCurrent[room],{instant:true});
}
function mayaShow(){if(!MAYA_POSES[room])return;mayaSwitchButtons();mayaActions.hidden=false;mayaLayout();}
function mayaHide(){mayaAbort();delete mayaCharacter.dataset.motion;mayaCharacter.hidden=true;mayaActions.hidden=true;mayaPose.style.opacity='1';mayaStage.active=false;}
mayaActionsList.addEventListener('click',e=>{const btn=e.target.closest('[data-maya-action]');if(btn)mayaAct(btn.dataset.mayaAction);});
window.addEventListener('resize',mayaLayout);

const frames=['./assets/rooms/maya.webp','./assets/rooms/jay.webp','./assets/rooms/lounge.webp'];
frames.forEach(src=>{const im=new Image();im.src=src;im.decoding='async';});
function target(id){if(!id)return {...ORIGINAL};const r=ROOMS[id],b=house.getBoundingClientRect(),ratio=b.width/Math.max(1,b.height),w=r.width;return {x:r.center[0]-w/2,y:r.center[1]-w/ratio/2,w,h:w/ratio};}
const ease=t=>{t=Math.max(0,Math.min(1,t));return 1-Math.pow(1-t,4);};
const fade=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
function animate(from,to,duration,paint){return new Promise(resolve=>{if(reduce.matches||duration===0){paint(1);resolve();return;}const start=performance.now();const tick=now=>{const q=Math.max(0,Math.min(1,(now-start)/duration));paint(q);if(q<1)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});}
function writeCamera(v){camera=v;house.setAttribute('viewBox',`${v.x} ${v.y} ${v.w} ${v.h}`);}
function renderNavigation(){const inside=Boolean(room);$('#room-navigation').hidden=!inside;$('#mobile-rooms').hidden=inside;$('#object-discovery').hidden=!inside;objectMenu.hidden=true;objectButton.setAttribute('aria-expanded','false');hideObjectTooltip();$('#intro-hint').hidden=inside;$('#scene-heading').hidden=!inside;
  if(inside){$('#scene-title').textContent=ROOMS[room].name;$('#scene-eyebrow').textContent=ROOMS[room].eyebrow;}
  document.querySelectorAll('[data-nav]').forEach(btn=>btn.setAttribute('aria-current',String(btn.dataset.nav===room)));
  $('#room-tip').hidden=true;$('#room-hits').hidden=inside;
}
async function enter(id){if(!ROOMS[id])return;if(active)closeArtifact();if(room===id)return;
  if(room){await leave(true);}
  const token=++navToken,from={...camera},to=target(id);room=id;mayaHide();renderNavigation();
  detail.hidden=false;detail.style.opacity='0';detail.style.pointerEvents='none';
  detailImage.src=ROOMS[id].img;detailImage.alt=ROOMS[id].name+' illustrated close-up';
  drawObjects(id);
  const loaded=detailImage.complete&&detailImage.naturalWidth>0;
  await animate(from,to,reduce.matches?0:890,p=>{
    if(token!==navToken)return;
    const move=ease(Math.min(1,p/.87));writeCamera({x:mix(from.x,to.x,move),y:mix(from.y,to.y,move),w:mix(from.w,to.w,move),h:mix(from.h,to.h,move)});
    const ready=(loaded||detailImage.complete&&detailImage.naturalWidth>0);
    detail.style.opacity=String(ready?fade((p-.63)/.37):0);
  });
  if(token!==navToken)return;
  if(detailImage.complete&&detailImage.naturalWidth){detail.style.opacity='1';detail.style.pointerEvents='auto';mayaShow();}
  else{detailImage.addEventListener('load',()=>{if(token!==navToken)return;detail.animate([{opacity:0},{opacity:1}],{duration:300,fill:'forwards'}).finished.then(()=>{if(token===navToken){detail.style.opacity='1';detail.style.pointerEvents='auto';mayaShow();}}).catch(()=>{});},{once:true});}
}
async function leave(forSwitch=false){if(!room)return;mayaHide();if(active)closeArtifact();const token=++navToken;room=null;renderNavigation();const from={...camera},to={...ORIGINAL},opacity=Number(detail.style.opacity||1);
  detail.style.pointerEvents='none';
  await animate(from,to,reduce.matches?0:850,p=>{if(token!==navToken)return;const move=ease(Math.max(0,(p-.18)/.82));writeCamera({x:mix(from.x,to.x,move),y:mix(from.y,to.y,move),w:mix(from.w,to.w,move),h:mix(from.h,to.h,move)});detail.style.opacity=String(mix(opacity,0,fade(p/.38)));});
  if(token!==navToken)return;detail.hidden=true;detail.style.opacity='0';$('#object-hits').replaceChildren();
}
const objectTooltip=$('#object-tooltip');
const objectMenu=$('#object-discovery-menu');
const objectButton=$('#object-discovery-trigger');
function hideObjectTooltip(){objectTooltip.hidden=true;}
function showObjectTooltip(hit,item){
  if(!room||active)return;
  const matrix=$('#object-map').getScreenCTM(); if(!matrix)return;
  const pt=$('#object-map').createSVGPoint();
  pt.x=item.point[0];pt.y=item.point[1];
  const point=pt.matrixTransform(matrix),stage=$('#stage').getBoundingClientRect();
  $('#tooltip-text').textContent=item.label;
  const x=Math.max(95,Math.min(stage.width-95,point.x-stage.left));
  const y=Math.max(53,Math.min(stage.height-56,point.y-stage.top-28));
  objectTooltip.style.left=x+'px';objectTooltip.style.top=y+'px';objectTooltip.hidden=false;
}
function populateObjects(id){
  objectMenu.replaceChildren();
  for(const item of OBJECTS[id]){
    const btn=document.createElement('button');btn.type='button';btn.className='discovery-item';
    btn.textContent=item.label;btn.setAttribute('aria-label','Explore '+item.label);
    btn.addEventListener('click',()=>{objectMenu.hidden=true;objectButton.setAttribute('aria-expanded','false');openArtifact(item.id,id);});
    objectMenu.appendChild(btn);
  }
  $('#object-count').textContent=String(OBJECTS[id].length);
}
function drawObjects(id){map.replaceChildren();populateObjects(id);
 for(const item of OBJECTS[id]){
   const hit=document.createElementNS(NS,'rect');hit.setAttribute('class','object-hit');
   for (const [key,val] of Object.entries({x:item.rect[0],y:item.rect[1],width:item.rect[2],height:item.rect[3],rx:8}))hit.setAttribute(key,String(val));
   hit.setAttribute('tabindex','0');hit.setAttribute('role','button');hit.setAttribute('aria-label','Explore '+item.label);
   hit.addEventListener('pointerenter',()=>showObjectTooltip(hit,item));
   hit.addEventListener('pointerleave',hideObjectTooltip);
   hit.addEventListener('focus',()=>showObjectTooltip(hit,item));
   hit.addEventListener('blur',hideObjectTooltip);
   const run=e=>{e.stopPropagation();hideObjectTooltip();openArtifact(item.id,id,hit);};
   hit.addEventListener('click',run);
   hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run(e);}});
   map.appendChild(hit);
 }
}
objectButton.addEventListener('click',()=>{const open=objectMenu.hidden;objectMenu.hidden=!open;objectButton.setAttribute('aria-expanded',String(open));hideObjectTooltip();});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#object-discovery')){objectMenu.hidden=true;objectButton.setAttribute('aria-expanded','false');}});
function roomHover(ev,id){const tip=$('#room-tip');if(!id||room){tip.hidden=true;return;}tip.hidden=false;tip.querySelector('.tip-name').textContent=ROOMS[id].name;const [x,y]=ROOMS[id].anchor,pt=house.createSVGPoint();pt.x=x;pt.y=y;const pixel=pt.matrixTransform(house.getScreenCTM());const b=$('#stage').getBoundingClientRect();tip.style.left=(pixel.x-b.left)+'px';tip.style.top=(pixel.y-b.top)+'px';}
for(const el of document.querySelectorAll('.room-hit')){el.addEventListener('pointerenter',()=>roomHover(null,el.dataset.room));el.addEventListener('pointerleave',()=>roomHover(null,null));el.addEventListener('focus',()=>roomHover(null,el.dataset.room));el.addEventListener('blur',()=>roomHover(null,null));el.addEventListener('click',()=>enter(el.dataset.room));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();enter(el.dataset.room);}});}
document.querySelectorAll('[data-mobile-room]').forEach(button=>button.addEventListener('click',()=>enter(button.dataset.mobileRoom)));
$('#brand-home').addEventListener('click',()=>{if(room)leave();else window.scrollTo({top:0,behavior:'smooth'});});
document.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',async()=>{if(btn.dataset.nav==='home'){await leave();return;}await enter(btn.dataset.nav);}));
$('#circle-trigger').addEventListener('click',()=>{const menu=$('#circle-menu');menu.hidden=!menu.hidden;$('#circle-trigger').setAttribute('aria-expanded',String(!menu.hidden));});
document.addEventListener('click',e=>{if(!e.target.closest('#circle-menu')&&!e.target.closest('#circle-trigger')){$('#circle-menu').hidden=true;$('#circle-trigger').setAttribute('aria-expanded','false');}});
let resizeTimer=0;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{++navToken;writeCamera(target(room));if(room){detail.style.opacity='1';detail.style.pointerEvents='auto';}},140);});
const toggle=(items,chosen)=>items.map(x=>`<button type="button" role="tab" aria-selected="${chosen===x[0]}" data-filter="${x[0]}">${x[1]}</button>`).join('');
const display=(cls,inner,mark='A PERSONAL OBJECT')=>`<div class="art-display ${cls}">${inner}<span class="display-label">${mark}</span></div>`;
const headings={books:'The bookshelf',movies:'The movie wall',vinyl:'The record collection',daily:"Today's little moment",notes:'Letters left behind',update:'Life lately',gallery:'The photo wall',tv:'Movie night'};
const sublines={books:'A glimpse into the stories on the shelf.',movies:'The films that keep coming up in conversation.',vinyl:'Albums worth listening to all the way through.',daily:'One photo, one small moment of an ordinary day.',notes:'Something personal, waiting to be discovered.',update:'The kind of thing you might mention over coffee.',gallery:'Some moments deserve a place on the wall.',tv:'A starting point for your next movie night.'};
function template(left,right){return `<div class="artefact-layout">${left}<div class="content-pane">${right}</div></div>`;}
const title=(name,copy,extra='')=>`<span class="overline">${extra||'A SMALL DISCOVERY'}</span><h2>${name}</h2><p class="lead">${copy}</p>`;
function itemsFor(kind,loc){let arr=(data[kind]||[]).filter(x=>x.room===loc);return arr;}
function matches(s,kind){const status=s.status||'favorites';return filter==='all'||status===filter;}
function cropArt(name,heading,selectedText='',extra=''){
 const file='./assets/details/'+name+'.webp';
 return `<div class="object-art-view" style="--object-image:url('${file}')">
 <div class="object-art-photo" role="img" aria-label="Detail from the illustrated room"></div>
 ${extra}<div class="object-art-footer"><span class="object-art-mark">${safe(heading)}</span>${selectedText?`<strong>${safe(selectedText)}</strong>`:''}</div>
 </div>`;
}
function coverType(title,index=0){
 const palette=['ochre','forest','clay','blue','cream'];
 const words=String(title||'Untitled').replace(/\s+[—–]\s+.*$/,'');
 return `<div class="edition-cover edition-cover--${palette[index%palette.length]}"><div class="edition-grain"></div><span class="edition-top">THE HOUSE · PERSONAL COLLECTION</span><span class="edition-sun" aria-hidden="true"></span><strong>${safe(words)}</strong><span class="edition-foot">A LITTLE STORY WORTH KEEPING</span></div>`;
}
function media(kind,id){
 const entries=itemsFor(kind,id);
 const settings=kind==='books'?[['reading','Reading'],['tbr','To read'],['favorites','Favorites']]:kind==='movies'?[['favorites','Favorites'],['watchlist','To watch'],['recent','Recently watched']]:[['all','All records']];
 const allowed=entries.filter(x=>matches(x,kind));
 const pickIndex=Math.min(selected,Math.max(0,allowed.length-1));
 const picked=allowed[pickIndex]||null;
 const intro=kind==='books'?['MAYA’S LITTLE LIBRARY','A shelf of stories','The books she returns to, the ones she’s opening next.']:kind==='movies'?['JAY’S SCREENING ROOM','On the film wall','His favorite stories, and the films he keeps recommending.']:['JAY’S RECORD CORNER','On repeat','Records with a story behind each sleeve.'];
 const rows=allowed.map((x,i)=>`<button type="button" data-select="${i}" aria-pressed="${pickIndex===i}" class="collection-item"><span class="collection-ordinal">${String(i+1).padStart(2,'0')}</span><span class="collection-name">${safe(x.name)}</span><span class="collection-indicator" aria-hidden="true">${pickIndex===i?'●':'↗'}</span></button>`).join('')||'<p class="collection-empty">Nothing here yet. Be the first to add one.</p>';
 const action=`<button class="collection-add" type="button" data-action="compose"><span aria-hidden="true">＋</span> ${kind==='books'?'Add a book':kind==='movies'?'Add a film':'Add a record'}</button><div id="compose-area" class="collection-compose" hidden></div>`;
 const nav=`<div class="collection-nav" role="tablist" aria-label="Collection category">${toggle(settings,filter)}</div>`;
 const stage=kind==='vinyl'?`<div class="turntable-stage"><div class="record-sleeve">${coverType(picked?.name||'One more record',pickIndex)}</div><button id="vinyl-disc" class="record-disc ${vinylPlaying?'is-playing':''}" aria-label="${vinylPlaying?'Pause':'Spin'} this record" aria-pressed="${vinylPlaying}"><span class="record-label">THE<br>HOUSE</span></button><div class="tonearm" aria-hidden="true"></div><span class="vinyl-prompt">${vinylPlaying?'NOW SPINNING':'PRESS THE RECORD TO SPIN'}</span></div>`:kind==='movies'?`<div class="cinema-wall"><div class="cinema-ambient" role="img" aria-label="Movie posters on the wall in Jay's bedroom"></div><span class="cinema-topline">PRIVATE SCREENING ROOM / JAY</span><div class="cinema-posters">${allowed.map((x,i)=>`<button type="button" data-select="${i}" class="cinema-poster ${i===pickIndex?'is-active':''}" aria-pressed="${i===pickIndex}"><span class="poster-index">FILM ${String(i+1).padStart(2,'0')}</span><strong>${safe(x.name)}</strong><span class="poster-play">${i===pickIndex?'NOW SELECTED':'↗'}</span></button>`).join('')||'<p class="cinema-empty">Add a film to the wall</p>'}</div><span class="cinema-footline">HAND-PICKED BY JAY · ${String(allowed.length).padStart(2,'0')} FILMS</span></div>`:`<div class="library-set"><div class="library-shelf-photo" role="img" aria-label="Maya's real illustrated bookshelf"></div><div class="library-shelf-light"></div><div class="library-stand"><span class="library-stand-title">PULLED FROM THE SHELF</span><div class="library-foreground-book">${coverType(picked?.name||'A new story',pickIndex)}</div><span class="library-stand-page">${allowed.length?String(pickIndex+1).padStart(2,'0')+' / '+String(allowed.length).padStart(2,'0'):'SHELF EMPTY'}</span></div><div class="library-spines" aria-label="Choose a book">${allowed.slice(0,7).map((x,i)=>`<button type="button" data-select="${i}" class="library-spine ${i===pickIndex?'is-selected':''}" aria-label="Select ${safe(x.name)}" aria-pressed="${i===pickIndex}"><span>${safe(x.name)}</span></button>`).join('')}</div></div>`;
 return `<div class="collection-experience collection--${kind}"><section class="collection-stage">${stage}</section><section class="collection-content"><div class="collection-kicker">${intro[0]}</div><h2>${intro[1]}</h2><p class="collection-lead">${intro[2]}</p>${nav}<div class="collection-list">${rows}</div><div class="collection-detail"><span class="collection-detail-kicker">${picked?'PERSONAL NOTE':'A NOTE WILL APPEAR HERE'}</span><p>${picked?safe(picked.description||'A story worth passing along.'):'Add the first thing to this collection.'}</p></div>${action}</section></div>`;
}
function moment(id){
 const photo=data.photos[id]; const owner=id==='lounge'?'Our circle':id==='maya'?'Maya':'Jay';
 const photoMarkup=photo?.src?`<img alt="Today’s photo from ${safe(owner)}" src="${photo.src}">`:`<div class="picture-fallback"><div class="picture-fallback-sun"></div><span>A little part<br>of today</span></div>`;
 return `<div class="daily-experience"><section class="daily-stage"><div class="daily-window" style="--daily-image:url('./assets/details/${id==='lounge'?'lounge-photo':id==='jay'?'jay-photo':'maya-photo'}.webp')"></div><div class="daily-polaroid"><div class="daily-picture">${photoMarkup}</div><span>${safe(photo?.caption||'One moment. No endless feed.')}</span></div></section><section class="daily-information"><span class="daily-date">A WINDOW INTO TODAY</span><h2>Just a little moment.</h2><p>Not another feed. One photograph from ${safe(owner)}, left here for the people who care.</p><div class="daily-line"><span>THE DAILY FRAME</span><span>${safe(photo?.date||'WAITING FOR A PHOTO')}</span></div><button type="button" class="daily-pin" data-action="compose">${photo?'Replace today’s photo':'Pin a photograph'} <span aria-hidden="true">↗</span></button><div id="compose-area" class="daily-compose" hidden></div><small>Saved locally in this prototype.</small></section></div>`;
}
function notes(id){
 const entries=(data.notes||[]).filter(n=>n.room===id).slice().reverse();
 const idx=Math.min(selected,Math.max(0,entries.length-1)); const letter=entries[idx]||null;
 const to=id==='lounge'?'our little circle':id==='maya'?'Maya':'Jay';
 return `<div class="correspondence"><aside class="correspondence-inbox"><div class="mail-kicker">POSTCARDS & LETTERS</div><h2>Letters left behind<span class="mail-count">${entries.length}</span></h2><p>Some things are better left as a note.</p><div class="mail-stack">${entries.map((e,i)=>`<button type="button" class="mail-envelope ${i===idx?'is-selected':''}" data-select="${i}" aria-pressed="${i===idx}"><span class="envelope-fold" aria-hidden="true"></span><span class="mail-envelope-content"><span>FROM ${safe(e.from||'A friend').toUpperCase()}</span><strong>${safe(e.text).slice(0,57)}${String(e.text).length>57?'…':''}</strong></span><span class="envelope-open" aria-hidden="true">↗</span></button>`).join('')||'<div class="mail-blank">No letters yet. Leave the first.</div>'}</div><button type="button" class="mail-compose-btn" data-action="compose"><span>＋</span> Write a letter</button><p class="mail-privacy">Private demo: saved on this device, not delivered.</p></aside><section class="letter-stage"><div class="letter-desk-top"><span>AN OPEN LETTER</span><span>${String(idx+1).padStart(2,'0')} / ${String(entries.length).padStart(2,'0')}</span></div><article class="letter-paper"><span class="letter-paper-pin" aria-hidden="true"></span><span class="letter-paper-date">A LITTLE NOTE, JUST FOR YOU</span><h3>Dear ${safe(to)},</h3><p>${letter?safe(letter.text):'This space is waiting for a note from someone who knows you well.'}</p><div class="letter-signature">${letter?`With love,<br><strong>${safe(letter.from||'A friend')}</strong>`:'Yours, a friend'}</div></article><div id="compose-area" class="letter-compose" hidden></div></section></div>`;
}
function update(id){
 const message=data.updates[id]||'Nothing new yet.';
 const owner=id==='lounge'?'The little circle':id==='maya'?'Maya':'Jay';
 return `<div class="bulletin-experience"><header class="bulletin-head"><span class="bulletin-number">NOTE No. 01 — THE HOUSE</span><h2>Life lately<span class="bulletin-period">.</span></h2><p>An ordinary update from ${safe(owner)}.</p></header><section class="bulletin-board"><div class="bulletin-tape" aria-hidden="true"></div><div class="bulletin-note"><span>PINNED TO THE WALL</span><blockquote>${safe(message)}</blockquote><div class="bulletin-note-signature">— ${safe(owner)}</div></div></section><footer class="bulletin-actions"><span>Little things deserve a place too.</span><button type="button" data-action="compose">Edit this update <span aria-hidden="true">↗</span></button></footer><div id="compose-area" class="bulletin-compose" hidden></div></div>`;
}
const memories=[{name:'The summer trip',description:'We missed the train stop and ended up having the best day.'},{name:'That coffee place',description:'The place we kept returning to, even when it was way too crowded.'},{name:'The rainy afternoon',description:'Three hours talking when we were supposed to go home.'}];
function gallery(){const m=memories[selected]||memories[0];
 return `<div class="gallery-experience"><section class="gallery-board"><span class="gallery-kicker">A WALL FULL OF US</span><div class="gallery-polaroids">${memories.map((x,i)=>`<button type="button" class="gallery-photo ${selected===i?'is-selected':''}" data-select="${i}" aria-label="View ${safe(x.name)}" aria-pressed="${selected===i}"><span class="gallery-photo-art" style="--gallery-position:${i===0?'left':i===1?'center':'right'}"></span><span>${safe(x.name)}</span></button>`).join('')}</div><div class="gallery-caption">A COLLECTION OF ORDINARY DAYS</div></section><section class="gallery-story"><span>MEMORY ${String(selected+1).padStart(2,'0')} / ${String(memories.length).padStart(2,'0')}</span><h2>${safe(m.name)}</h2><p>${safe(m.description)}</p><button type="button" class="gallery-action" data-action="go-daily">Pin today’s photograph <span>↗</span></button></section></div>`;
}
function tv(){const first=(data.movies||[]).find(x=>x.room==='jay');
 return `<div class="screening-experience"><section class="screening-stage"><span class="screening-corner">THE HOUSE PRESENTS</span><div class="screening-sun"></div><span class="screening-now">NOW SHOWING</span><h2>Movie<br>night<span>.</span></h2><span class="screening-foot">A SHARED WATCHLIST · NO TICKETS REQUIRED</span></section><section class="screening-details"><span class="collection-kicker">THE SHARED LOUNGE</span><h2>What's on tonight?</h2><p>${safe(first?.name||'A movie night with friends')}</p><blockquote>${safe(first?.description||'Something worth watching together.')}</blockquote><button type="button" class="screening-action" data-action="go-movies">Browse Jay’s film wall <span>↗</span></button></section></div>`;
}
function artifactContent(){if(!active)return '';const {kind,place}=active;return ['books','movies','vinyl'].includes(kind)?media(kind,place):kind==='daily'?moment(place):kind==='notes'?notes(place):kind==='update'?update(place):kind==='gallery'?gallery():kind==='tv'?tv():'';}
function renderArtifact(){body.innerHTML=artifactContent();modal.className='artifact artifact--'+(active?.kind||'unknown')+(modal.classList.contains('is-open')?' is-open':'');modal.dataset.scene=active?.kind||'';const heading=headings[active.kind]||'A little discovery';$('#artifact-kicker').textContent=active.place==='lounge'?'THE LOUNGE':ROOMS[active.place]?.name||'A ROOM';$('#artifact-index').textContent=heading;}
let closeTimer=null,dialogSequence=0;
function openArtifact(kind,place,origin){
 if(!active)lastFocus=document.activeElement;
 ++dialogSequence;clearTimeout(closeTimer);
 active={kind,place};filter=kind==='books'?'reading':kind==='movies'?'favorites':'all';selected=0;vinylPlaying=false;pendingPhoto=null;
 renderArtifact();hideObjectTooltip();objectMenu.hidden=true;
 const source=origin?.getBoundingClientRect?.();
 if(source){const cx=source.left+source.width/2,cy=source.top+source.height/2;
   modal.style.setProperty('--open-x',Math.max(8,Math.min(92,cx/window.innerWidth*100))+'%');
   modal.style.setProperty('--open-y',Math.max(8,Math.min(92,cy/window.innerHeight*100))+'%');
 }else{modal.style.setProperty('--open-x','50%');modal.style.setProperty('--open-y','55%');}
 modal.hidden=false;backdrop.hidden=false;document.body.style.overflow='hidden';
 requestAnimationFrame(()=>{modal.classList.add('is-open');backdrop.classList.add('is-open');$('#artifact-close').focus({preventScroll:true});});
}
function closeArtifact(){if(!active)return;active=null;
 const serial=++dialogSequence;modal.classList.remove('is-open');backdrop.classList.remove('is-open');document.body.style.overflow='';
 closeTimer=setTimeout(()=>{if(serial!==dialogSequence)return;modal.hidden=true;backdrop.hidden=true;lastFocus?.focus?.({preventScroll:true});},reduce.matches?0:400);
}
$('#artifact-close').addEventListener('click',closeArtifact);backdrop.addEventListener('click',closeArtifact);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(active)closeArtifact();else if(room)leave();else $('#circle-menu').hidden=true;return;}if(e.key==='Tab'&&active){const tabbable=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])')].filter(x=>!x.closest('[hidden]'));if(!tabbable.length)return;const first=tabbable[0],last=tabbable[tabbable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
function composition(){if(!active)return '';const k=active.kind;if(['books','movies','vinyl'].includes(k)){const label=k==='books'?'Book title':k==='movies'?'Film title':'Artist — album';const options=k==='books'?'<option value="reading">Reading</option><option value="tbr">To read</option><option value="favorites">Favorite</option>':k==='movies'?'<option value="favorites">Favorite</option><option value="watchlist">Must watch</option><option value="recent">Recently watched</option>':'<option value="favorites">On the shelf</option>';return `<form class="form-area" id="compose-form"><label class="form-label" for="compose-name">${label}</label><input class="field" id="compose-name" name="title" required maxlength="100" placeholder="${label}"/><label class="form-label" for="compose-note">Your note</label><textarea id="compose-note" class="field textarea" name="note" maxlength="220" placeholder="Why does it belong here?"></textarea><label class="form-label" for="compose-status">Shelf</label><select class="field" id="compose-status" name="status">${options}</select><button class="primary-action" type="submit">Place in the room <span>↗</span></button></form>`;}
if(k==='daily')return `<form class="form-area" id="compose-form"><label class="form-label" for="photo-file">Today's photo</label><input type="file" class="field" id="photo-file" accept="image/*" required/><label class="form-label" for="photo-caption">A few words</label><input class="field" id="photo-caption" maxlength="140" placeholder="Something about today"/><button class="primary-action" type="submit">Pin the photograph ↗</button></form>`;
if(k==='notes')return `<form class="form-area" id="compose-form"><label class="form-label" for="note-from">From</label><input class="field" id="note-from" maxlength="35" value="You" required/><label class="form-label" for="note-message">Your letter</label><textarea class="field textarea" id="note-message" maxlength="350" required placeholder="Something you wanted to say…"></textarea><button class="primary-action" type="submit">Leave the letter ↗</button></form>`;
if(k==='update')return `<form class="form-area" id="compose-form"><label class="form-label" for="update-message">Life lately</label><textarea class="field textarea" id="update-message" maxlength="300" required placeholder="What happened this week?">${safe(data.updates[active.place]||'')}</textarea><button class="primary-action" type="submit">Pin this update ↗</button></form>`;return '';}
function playSettle(){const stage=body.firstElementChild;if(!stage||reduce.matches)return;stage.classList.remove('is-changing');void stage.offsetWidth;stage.classList.add('is-changing');}
body.addEventListener('click',e=>{const action=e.target.closest('[data-action]');if(action){const a=action.dataset.action;if(a==='compose'){const box=$('#compose-area');box.hidden=!box.hidden;if(!box.hidden){box.innerHTML=composition();box.querySelector('input,textarea')?.focus();}}else if(a==='go-movies')openArtifact('movies','jay');else if(a==='go-daily')openArtifact('daily','lounge');return;}
const filt=e.target.closest('[data-filter]');if(filt){filter=filt.dataset.filter;selected=0;renderArtifact();playSettle();return;}
const pick=e.target.closest('[data-pick],[data-select]');if(pick){selected=Number(pick.dataset.pick??pick.dataset.select)||0;renderArtifact();playSettle();return;}
if(e.target.closest('#vinyl-disc')){vinylPlaying=!vinylPlaying;$('#vinyl-disc').classList.toggle('is-playing',vinylPlaying);$('#vinyl-disc').setAttribute('aria-pressed',String(vinylPlaying));const prompt=body.querySelector('.vinyl-prompt');if(prompt)prompt.textContent=vinylPlaying?'NOW SPINNING':'PRESS THE RECORD TO SPIN';return;}
});
body.addEventListener('submit',async e=>{if(e.target.id!=='compose-form'||!active)return;e.preventDefault();const {kind,place}=active;let message='Saved to this room';
if(['books','movies','vinyl'].includes(kind)){const f=e.target;const name=f.elements.title.value.trim();if(!name)return;data[kind].push({name,description:f.elements.note.value.trim(),status:f.elements.status.value,room:place,id:Date.now().toString()});filter=f.elements.status.value;selected=0;message='Added to the collection';}
if(kind==='notes'){const name=$('#note-from').value.trim(),text=$('#note-message').value.trim();if(!text)return;data.notes.push({from:name||'You',text,room:place,date:'Just now'});message='Letter left on the desk';}
if(kind==='update'){data.updates[place]=$('#update-message').value.trim();message='Latest update pinned';}
if(kind==='daily'){const file=$('#photo-file').files?.[0];if(!file||!file.type.startsWith('image/'))return;try{const uri=URL.createObjectURL(file),img=new Image();img.src=uri;await img.decode();const scale=Math.min(1,700/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);data.photos[place]={src:canvas.toDataURL('image/jpeg',.68),date:today(),caption:$('#photo-caption').value.trim()||'Today, in one photo.'};URL.revokeObjectURL(uri);message='Today’s photo pinned';}catch{toast('This photo could not be read.');return;}}
store();renderArtifact();toast(message);});
function toast(text){const el=$('#toast');el.textContent=text;el.hidden=false;clearTimeout(messageTimeout);messageTimeout=setTimeout(()=>el.hidden=true,2600);}
renderNavigation();
})();
