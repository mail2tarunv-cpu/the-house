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
const frames=['./assets/rooms/maya.webp','./assets/rooms/jay.webp','./assets/rooms/lounge.webp'];
frames.forEach(src=>{const im=new Image();im.src=src;im.decoding='async';});
function target(id){if(!id)return {...ORIGINAL};const r=ROOMS[id],b=house.getBoundingClientRect(),ratio=b.width/Math.max(1,b.height),w=r.width;return {x:r.center[0]-w/2,y:r.center[1]-w/ratio/2,w,h:w/ratio};}
const ease=t=>{t=Math.max(0,Math.min(1,t));return 1-Math.pow(1-t,4);};
const fade=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
function animate(from,to,duration,paint){return new Promise(resolve=>{if(reduce.matches||duration===0){paint(1);resolve();return;}const start=performance.now();const tick=now=>{const q=Math.max(0,Math.min(1,(now-start)/duration));paint(q);if(q<1)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});}
function writeCamera(v){camera=v;house.setAttribute('viewBox',`${v.x} ${v.y} ${v.w} ${v.h}`);}
function renderNavigation(){const inside=Boolean(room);$('#room-navigation').hidden=!inside;$('#mobile-rooms').hidden=inside;$('#object-discovery').hidden=!inside;objectMenu.hidden=true;objectsButton.setAttribute('aria-expanded','false');hideObjectTip();$('#intro-hint').hidden=inside;$('#scene-heading').hidden=!inside;
  if(inside){$('#scene-title').textContent=ROOMS[room].name;$('#scene-eyebrow').textContent=ROOMS[room].eyebrow;}
  document.querySelectorAll('[data-nav]').forEach(btn=>btn.setAttribute('aria-current',String(btn.dataset.nav===room)));
  $('#room-tip').hidden=true;$('#room-hits').hidden=inside;
}
async function enter(id){if(!ROOMS[id])return;if(active)closeArtifact();if(room===id)return;
  if(room){await leave(true);}
  const token=++navToken,from={...camera},to=target(id);room=id;renderNavigation();
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
  if(detailImage.complete&&detailImage.naturalWidth){detail.style.opacity='1';detail.style.pointerEvents='auto';}
  else{detailImage.addEventListener('load',()=>{if(token!==navToken)return;detail.animate([{opacity:0},{opacity:1}],{duration:300,fill:'forwards'}).finished.then(()=>{if(token===navToken){detail.style.opacity='1';detail.style.pointerEvents='auto';}}).catch(()=>{});},{once:true});}
}
async function leave(forSwitch=false){if(!room)return;if(active)closeArtifact();const token=++navToken;room=null;renderNavigation();const from={...camera},to={...ORIGINAL},opacity=Number(detail.style.opacity||1);
  detail.style.pointerEvents='none';
  await animate(from,to,reduce.matches?0:850,p=>{if(token!==navToken)return;const move=ease(Math.max(0,(p-.18)/.82));writeCamera({x:mix(from.x,to.x,move),y:mix(from.y,to.y,move),w:mix(from.w,to.w,move),h:mix(from.h,to.h,move)});detail.style.opacity=String(mix(opacity,0,fade(p/.38)));});
  if(token!==navToken)return;detail.hidden=true;detail.style.opacity='0';$('#object-hits').replaceChildren();
}
const objectTip=$('#object-tooltip'), objectMenu=$('#objects-menu'), objectsButton=$('#objects-button');
function hideObjectTip(){objectTip.hidden=true;}
function objectTipAt(item){if(!room||active)return;const svg=$('#object-map'),m=svg.getScreenCTM();if(!m)return;const pt=svg.createSVGPoint();pt.x=item.point[0];pt.y=item.point[1];const p=pt.matrixTransform(m),rect=$('#stage').getBoundingClientRect();objectTip.textContent=item.label+' ↗';objectTip.style.left=Math.max(78,Math.min(rect.width-78,p.x-rect.left))+'px';objectTip.style.top=Math.max(44,Math.min(rect.height-40,p.y-rect.top-22))+'px';objectTip.hidden=false;}
function drawObjects(id){map.replaceChildren();objectMenu.replaceChildren();$('#objects-count').textContent=OBJECTS[id].length;
for(const item of OBJECTS[id]){
 const b=document.createElement('button');b.type='button';b.className='objects-item';b.innerHTML='<span>'+safe(item.label)+'</span><span aria-hidden="true">↗</span>';b.addEventListener('click',()=>{objectMenu.hidden=true;objectsButton.setAttribute('aria-expanded','false');openArtifact(item.id,id);});objectMenu.appendChild(b);
 const hit=document.createElementNS(NS,'rect');for(const [k,v] of Object.entries({x:item.rect[0],y:item.rect[1],width:item.rect[2],height:item.rect[3],rx:8}))hit.setAttribute(k,v);
 hit.setAttribute('class','object-hit');hit.setAttribute('tabindex','0');hit.setAttribute('role','button');hit.setAttribute('aria-label','Explore '+item.label);
 hit.addEventListener('pointerenter',()=>objectTipAt(item));hit.addEventListener('pointerleave',hideObjectTip);
 hit.addEventListener('focus',()=>objectTipAt(item));hit.addEventListener('blur',hideObjectTip);
 const run=e=>{e.stopPropagation();hideObjectTip();openArtifact(item.id,id,hit);};
 hit.addEventListener('click',run);hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run(e);}});
 map.appendChild(hit);
}}
objectsButton.addEventListener('click',()=>{const opening=objectMenu.hidden;objectMenu.hidden=!opening;objectsButton.setAttribute('aria-expanded',String(opening));hideObjectTip();});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#object-discovery')){objectMenu.hidden=true;objectsButton.setAttribute('aria-expanded','false');}});
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
function roomCrop(kind,place,selectedName){
 const configs={books:[54,66],movies:[30,27],vinyl:[25,92]};
 const pos=configs[kind]||[50,50], label=kind==='books'?'MAYA\u2019S BOOKSHELF':kind==='movies'?'JAY\u2019S MOVIE WALL':'JAY\u2019S RECORD COLLECTION';
 const disc=kind==='vinyl'?'<button type="button" id="vinyl-disc" class="live-record '+(vinylPlaying?'is-playing':'')+'" aria-label="Spin or stop the record"></button>':'';
 return '<div class="room-crop" style="background-image:url('+ROOMS[place].img+');background-size:260% auto;background-position:'+pos[0]+'% '+pos[1]+'%">'+disc+'<div class="crop-shade"><span>'+label+'</span><strong>'+safe(selectedName||'A little collection')+'</strong></div></div>';
}
function bookJacket(t,i){const color=['#9c7558','#4a6c5c','#ad7e65','#577083'][i%4];return '<div class="new-book-cover" style="--jacket:'+color+'"><small>PERSONAL LIBRARY</small><span class="new-cover-emblem" aria-hidden="true"></span><strong>'+safe(t)+'</strong><small>THE HOUSE · STORIES WORTH KEEPING</small></div>';}
function media(kind,id){
 const things=itemsFor(kind,id);
 const tabs=kind==='books'?[['reading','Reading'],['tbr','To read'],['favorites','Favorites']]:kind==='movies'?[['favorites','Favorites'],['watchlist','Watchlist'],['recent','Recent']]:[['all','Collection']];
 const rows=things.filter(x=>matches(x,kind)),idx=Math.min(selected,Math.max(0,rows.length-1)),pick=rows[idx];
 const heading=kind==='books'?'Maya’s bookshelf':kind==='movies'?'Jay’s movie wall':'Jay’s records';
 const summary=kind==='books'?'Stories she’s reading, saving and recommending.':kind==='movies'?'Movies that stay in your head long after the credits.':'Records worth playing all the way through.';
 const cover=kind==='vinyl'?'<div class="new-record-set"><div class="new-record-sleeve">'+bookJacket(pick?.name||'A new record',idx)+'</div><button id="vinyl-disc" class="new-disc '+(vinylPlaying?'is-playing':'')+'" aria-label="Spin the record" aria-pressed="'+vinylPlaying+'"><span>THE HOUSE</span></button></div>':kind==='movies'?'<div class="new-movie-feature"><small>JAY’S PRIVATE CINEMA</small><div class="new-movie-poster"><span class="new-poster-sun"></span><small>FEATURE NO. '+String(idx+1).padStart(2,'0')+'</small><strong>'+safe(pick?.name||'A film worth watching')+'</strong><small>PERSONAL SCREENING · THE HOUSE</small></div></div>':'<div class="new-book-stage">'+bookJacket(pick?.name||'A new book',idx)+'<span>SELECTED FROM THE SHELF · '+String(idx+1).padStart(2,'0')+' / '+String(rows.length).padStart(2,'0')+'</span></div>';
 return '<div class="new-collection new-collection--'+kind+'"><section class="new-collection-visual">'+cover+'</section><section class="new-collection-content"><span class="new-overline">'+(kind==='books'?'THE LITTLE LIBRARY':kind==='movies'?'SOUNDTRACKS & STORIES':'THE RECORD CORNER')+'</span><h2>'+heading+'</h2><p>'+summary+'</p><div class="new-category-tabs" role="tablist">'+toggle(tabs,filter)+'</div><div class="new-collection-list">'+(rows.map((x,i)=>'<button class="new-collection-item" data-select="'+i+'" aria-pressed="'+(i===idx)+'"><span>'+String(i+1).padStart(2,'0')+'</span><strong>'+safe(x.name)+'</strong><span>↗</span></button>').join('')||'<p>No items here yet.</p>')+'</div><div class="new-collection-note"><small>PERSONAL NOTE</small><p>'+safe(pick?.description||'A story worth passing along.')+'</p></div><button class="new-collection-add" data-action="compose">＋ '+(kind==='books'?'Add a book':kind==='movies'?'Add a film':'Add a record')+' <span>↗</span></button><div id="compose-area" hidden></div></section></div>';
}
function moment(id){const photo=data.photos[id];const image=photo?.src?`<img alt="Today's photo" src="${photo.src}">`:`<span>${id==='maya'?'The small things':id==='jay'?'What today sounded like':'A day together'}</span>`;
const polaroid=display('photo-tone',`<div class="polaroid"><div class="polaroid-image">${image}</div><div class="polaroid-caption">${safe(photo?.caption||'a little moment from today')}</div></div>`,'A PHOTO FOR TODAY');
return template(polaroid,`${title("Today's photograph",'A tiny window into what today looked like. No endless feed, just one moment.',id==='lounge'?'FROM THE LOUNGE':id==='maya'?"FROM MAYA'S DESK":"FROM JAY'S DESK")}${photo?`<p class="mini-info">Pinned ${safe(photo.date||'recently')}</p>`:'<p class="mini-info">A new photo can live here each day.</p>'}<button class="form-trigger" data-action="compose">${photo?'↗ Replace today’s photo':'+ Pin today’s photo'} </button><div id="compose-area" hidden></div><p class="fine-print">Photos in this prototype are stored on this device only.</p>`);
}
function notes(id){
 const entries=(data.notes||[]).filter(x=>x.room===id).slice().reverse(),idx=Math.min(selected,Math.max(0,entries.length-1)),n=entries[idx],to=id==='lounge'?'everyone':id==='maya'?'Maya':'Jay';
 return '<div class="new-mail"><aside class="new-mail-index"><small>POSTCARDS & LETTERS</small><h2>Letters left behind</h2><p>Some things deserve more than a reaction.</p><div class="new-envelope-stack">'+(entries.map((e,i)=>'<button class="new-envelope" data-select="'+i+'" aria-pressed="'+(i===idx)+'"><small>FROM '+safe(e.from||'A friend').toUpperCase()+'</small><strong>'+safe(e.text).slice(0,62)+'</strong><span>↗</span></button>').join('')||'<p>No letters yet.</p>')+'</div><button class="new-mail-action" data-action="compose">＋ Write a letter</button><small class="new-demo-note">In this prototype, letters stay on this device.</small></aside><section class="new-mail-stage"><div class="new-mail-heading"><span>AN OPEN LETTER</span><span>'+String(idx+1).padStart(2,'0')+' / '+String(entries.length).padStart(2,'0')+'</span></div><article class="new-letter-paper"><small>A LITTLE NOTE, JUST FOR YOU</small><h3>Dear '+safe(to)+',</h3><p>'+safe(n?.text||'A letter will be waiting for you here.')+'</p><span>With love,<br><strong>'+safe(n?.from||'A friend')+'</strong></span></article><div id="compose-area" hidden></div></section></div>';
}
function update(id){
 const message=data.updates[id]||'Nothing new yet.',owner=id==='lounge'?'Our circle':id==='maya'?'Maya':'Jay';
 return '<div class="new-bulletin"><header><small>THE HOUSE · A SMALL UPDATE</small><h2>Life lately.</h2><p>A little window into '+safe(owner)+'’s week.</p></header><div class="new-bulletin-note"><div class="new-bulletin-tape"></div><small>PINNED ON THE WALL</small><blockquote>'+safe(message)+'</blockquote><span>— '+safe(owner)+'</span></div><footer><span>Not everything needs a conversation.</span><button data-action="compose">Write an update ↗</button></footer><div id="compose-area" hidden></div></div>';
}
const memories=[{name:'The summer trip',description:'We missed the train stop and ended up having the best day.'},{name:'That coffee place',description:'The place we kept returning to, even when it was way too crowded.'},{name:'The rainy afternoon',description:'Three hours talking when we were supposed to go home.'}];
function gallery(){const m=memories[selected]||memories[0];const art=display('warm',`<div class="postcards">${memories.map((x,i)=>`<button class="postcard" data-select="${i}" aria-pressed="${selected===i}"><b>${safe(x.name)}</b><span>ONE FOR THE WALL</span></button>`).join('')}</div>`,'MEMORIES TO KEEP');
return template(art,`${title('The photo wall','The stories that only make sense to your group.','THE SHARED LOUNGE')}<p class="selected-note">“${safe(m.description)}”</p><div class="detail-list">${memories.map((x,i)=>`<button class="detail-row" data-select="${i}" aria-pressed="${selected===i}"><strong>${safe(x.name)}</strong><span class="chevron">↗</span></button>`).join('')}</div><button class="form-trigger" data-action="go-daily">+ Add a daily photo <span>↗</span></button>`);
}
function tv(){const first=(data.movies||[]).find(x=>x.room==='jay');return template(display('wood',`<div class="screen-tv"><span>Tonight's idea</span><strong>${safe(first?.name||'Movie night')}</strong></div>`,'THE TV CABINET'),`${title('Movie night','The little ritual of choosing something together.','IN THE LOUNGE')}<p class="selected-note">“${safe(first?.description||'There is always something good to watch.')}”</p><button class="form-trigger" data-action="go-movies">Explore Jay's watchlist <span>↗</span></button><p class="fine-print">This is a shared watchlist concept, not a streaming service.</p>`);}
function artifactContent(){if(!active)return '';const {kind,place}=active;return ['books','movies','vinyl'].includes(kind)?media(kind,place):kind==='daily'?moment(place):kind==='notes'?notes(place):kind==='update'?update(place):kind==='gallery'?gallery():kind==='tv'?tv():'';}
function renderArtifact(){body.innerHTML=artifactContent();
 const view=body.querySelector('.art-display');
 if(view&&active){
  const offsets={daily:{maya:[86,70],jay:[86,75],lounge:[47,52]},notes:{maya:[88,35],jay:[85,44],lounge:[47,65]},update:{maya:[80,63],jay:[84,70],lounge:[70,45]},gallery:{lounge:[48,30]},tv:{lounge:[14,54]}};
  const spot=offsets[active.kind]?.[active.place]||[50,50];
  view.classList.add('illustrated-display');
  view.style.backgroundImage='linear-gradient(#1e2c242a,#1e2c2448),url("'+ROOMS[active.place].img+'")';
  view.style.backgroundSize='cover,260% auto';
  view.style.backgroundPosition='center,'+spot[0]+'% '+spot[1]+'%';
 }
 const heading=headings[active.kind]||'A little discovery';$('#artifact-kicker').textContent=active.place==='lounge'?'THE LOUNGE':ROOMS[active.place]?.name||'A ROOM';$('#artifact-index').textContent=heading;}
let exitTimer=null,dialogSerial=0;
function openArtifact(kind,place,origin){
 if(!active)lastFocus=document.activeElement;
 ++dialogSerial;clearTimeout(exitTimer);active={kind,place};filter=kind==='books'?'reading':kind==='movies'?'favorites':'all';selected=0;vinylPlaying=false;pendingPhoto=null;renderArtifact();
 const anchor=origin?.getBoundingClientRect?.(),cx=anchor?anchor.x+anchor.width/2:innerWidth/2,cy=anchor?anchor.y+anchor.height/2:innerHeight/2;
 modal.style.setProperty('--origin-x',Math.round(cx/innerWidth*100)+'%');modal.style.setProperty('--origin-y',Math.round(cy/innerHeight*100)+'%');
 modal.hidden=false;backdrop.hidden=false;document.body.style.overflow='hidden';objectMenu.hidden=true;hideObjectTip();
 requestAnimationFrame(()=>{modal.classList.add('is-open');backdrop.classList.add('is-open');$('#artifact-close').focus({preventScroll:true});});
}
function closeArtifact(){if(!active)return;active=null;const serial=++dialogSerial;modal.classList.remove('is-open');backdrop.classList.remove('is-open');document.body.style.overflow='';
 exitTimer=setTimeout(()=>{if(serial!==dialogSerial)return;modal.hidden=true;backdrop.hidden=true;lastFocus?.focus?.({preventScroll:true});},reduce.matches?0:280);
}
$('#artifact-close').addEventListener('click',closeArtifact);backdrop.addEventListener('click',closeArtifact);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(active)closeArtifact();else if(room)leave();else $('#circle-menu').hidden=true;return;}if(e.key==='Tab'&&active){const tabbable=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])')].filter(x=>!x.closest('[hidden]'));if(!tabbable.length)return;const first=tabbable[0],last=tabbable[tabbable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
function composition(){if(!active)return '';const k=active.kind;if(['books','movies','vinyl'].includes(k)){const label=k==='books'?'Book title':k==='movies'?'Film title':'Artist — album';const options=k==='books'?'<option value="reading">Reading</option><option value="tbr">To read</option><option value="favorites">Favorite</option>':k==='movies'?'<option value="favorites">Favorite</option><option value="watchlist">Must watch</option><option value="recent">Recently watched</option>':'<option value="favorites">On the shelf</option>';return `<form class="form-area" id="compose-form"><label class="form-label" for="compose-name">${label}</label><input class="field" id="compose-name" name="title" required maxlength="100" placeholder="${label}"/><label class="form-label" for="compose-note">Your note</label><textarea id="compose-note" class="field textarea" name="note" maxlength="220" placeholder="Why does it belong here?"></textarea><label class="form-label" for="compose-status">Shelf</label><select class="field" id="compose-status" name="status">${options}</select><button class="primary-action" type="submit">Place in the room <span>↗</span></button></form>`;}
if(k==='daily')return `<form class="form-area" id="compose-form"><label class="form-label" for="photo-file">Today's photo</label><input type="file" class="field" id="photo-file" accept="image/*" required/><label class="form-label" for="photo-caption">A few words</label><input class="field" id="photo-caption" maxlength="140" placeholder="Something about today"/><button class="primary-action" type="submit">Pin the photograph ↗</button></form>`;
if(k==='notes')return `<form class="form-area" id="compose-form"><label class="form-label" for="note-from">From</label><input class="field" id="note-from" maxlength="35" value="You" required/><label class="form-label" for="note-message">Your letter</label><textarea class="field textarea" id="note-message" maxlength="350" required placeholder="Something you wanted to say…"></textarea><button class="primary-action" type="submit">Leave the letter ↗</button></form>`;
if(k==='update')return `<form class="form-area" id="compose-form"><label class="form-label" for="update-message">Life lately</label><textarea class="field textarea" id="update-message" maxlength="300" required placeholder="What happened this week?">${safe(data.updates[active.place]||'')}</textarea><button class="primary-action" type="submit">Pin this update ↗</button></form>`;return '';}
body.addEventListener('click',e=>{const action=e.target.closest('[data-action]');if(action){const a=action.dataset.action;if(a==='compose'){const box=$('#compose-area');box.hidden=!box.hidden;if(!box.hidden){box.innerHTML=composition();box.querySelector('input,textarea')?.focus();}}else if(a==='go-movies')openArtifact('movies','jay');else if(a==='go-daily')openArtifact('daily','lounge');return;}
const filt=e.target.closest('[data-filter]');if(filt){filter=filt.dataset.filter;selected=0;renderArtifact();return;}
const pick=e.target.closest('[data-pick],[data-select]');if(pick){selected=Number(pick.dataset.pick??pick.dataset.select)||0;renderArtifact();return;}
if(e.target.closest('#vinyl-disc')){vinylPlaying=!vinylPlaying;$('#vinyl-disc').classList.toggle('is-playing',vinylPlaying);return;}
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