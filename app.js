(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const scene = $('#scene');
  const actorsLayer = $('#character-overlays');
  const objectsLayer = $('#room-objects');
  const ambientLayer = $('#ambient-actors');
  const drawer = $('#drawer');
  const content = $('#drawer-content');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const detailScene = $('#detail-scene');
  const detailImage = $('#detail-image');
  const detailHotspots = $('#detail-hotspots');
  const ROOM_IMAGES = {maya:'./assets/rooms/maya.webp',jay:'./assets/rooms/jay.webp',lounge:'./assets/rooms/lounge.webp'};
  const DETAIL_HOTSPOTS = {
    maya:[
      {id:'books',name:'Book wall',x:785,y:495},
      {id:'daily',name:'Daily photo',x:1417,y:584},
      {id:'notes',name:'Visitor notes',x:1440,y:418},
      {id:'update',name:'Life lately',x:1279,y:622}
    ],
    jay:[
      {id:'movies',name:'Favorite movies',x:570,y:366},
      {id:'vinyl',name:'Vinyl collection',x:520,y:600},
      {id:'daily',name:'Daily photo',x:1463,y:687},
      {id:'notes',name:'Visitor notes',x:1411,y:498},
      {id:'update',name:'Life lately',x:1290,y:703}
    ],
    lounge:[
      {id:'gallery',name:'Memory wall',x:740,y:330},
      {id:'tv',name:'Watch together',x:172,y:468},
      {id:'daily',name:'Daily photo',x:640,y:455},
      {id:'notes',name:'Visitor notes',x:624,y:668},
      {id:'lounge',name:"Who's here?",x:905,y:546},
      {id:'update',name:'Life updates',x:1305,y:421}
    ]
  };
  Object.values(ROOM_IMAGES).forEach(src=>{const preload=new Image();preload.src=src;});
  const NS = 'http://www.w3.org/2000/svg';
  const ORIGINAL = { x:0, y:0, w:1672, h:941 };
  const PEOPLE = {
    maya: { name:'Maya', subtitle:'Reading everything, all at once.', color:'#6d916f', x:727, y:309 },
    jay:  { name:'Jay', subtitle:'Always has a new record.', color:'#c77768', x:1284, y:310 },
    you:  { name:'You', subtitle:'Here for the little moments.', color:'#9882b7', x:805, y:655 }
  };
  const ROOMS = {
    maya: {name:"Maya's room",kicker:'01 / THE LITTLE LIBRARY',description:'A bookshelf, a few favorites, a little window into her week.',cx:519,cy:262,w:715,actor:'maya',walk:{lo:645,hi:765,y:320},objects:[
      {id:'books',name:'Books',x:551,y:262},{id:'update',name:'Life update',x:741,y:282},{id:'notes',name:'Letters',x:724,y:360},{id:'daily',name:'Daily photo',x:761,y:302}]},
    jay: {name:"Jay's room",kicker:'02 / SOUNDTRACKS & STORIES',description:'Films, records and whatever Jay has been obsessing over.',cx:1154,cy:262,w:735,actor:'jay',walk:{lo:1185,hi:1280,y:326},objects:[
      {id:'vinyl',name:'Vinyl',x:1010,y:315},{id:'movies',name:'Movies',x:1082,y:223},{id:'update',name:'Life update',x:1420,y:302},{id:'daily',name:'Daily photo',x:1428,y:280},{id:'notes',name:'Notes',x:872,y:314}]},
    lounge: {name:'The shared lounge',kicker:'03 / THE PLACE WE SHARE',description:'A room shaped by the stories we have together.',cx:831,cy:616,w:1110,actor:'you',walk:{lo:775,hi:1015,y:688},objects:[
      {id:'gallery',name:'Photo wall',x:744,y:527},{id:'tv',name:'Watch together',x:425,y:569},{id:'daily',name:"Today's photo",x:796,y:544},{id:'notes',name:'Visitor notes',x:684,y:679},{id:'lounge',name:"Who's here?",x:860,y:523},{id:'update',name:'Life updates',x:930,y:490}]}
  };
  const SEED = {
    presence: {maya:true,jay:false,you:true},
    books: [{id:'b1',room:'maya',name:'The Creative Act',description:'A reminder to make things just because.',icon:'✳'},{id:'b2',room:'maya',name:'Crying in H Mart',description:'This one stayed with me for days.',icon:'✿'},{id:'b3',room:'maya',name:'Tomorrow, and Tomorrow, and Tomorrow',description:'For our late-night conversations.',icon:'✦'}],
    movies: [{id:'m1',room:'jay',name:'Before Sunrise',description:'Could watch these two talk forever.',icon:'☼'},{id:'m2',room:'jay',name:'Perfect Days',description:'A film about noticing the small things.',icon:'✴'},{id:'m3',room:'jay',name:'The Grand Budapest Hotel',description:'Everything about the colors.',icon:'◆'}],
    vinyl: [{id:'v1',room:'jay',name:'Blonde — Frank Ocean',description:'My default rainy-day soundtrack.',icon:'◉'},{id:'v2',room:'jay',name:'Currents — Tame Impala',description:'Still sounds like a different planet.',icon:'◈'},{id:'v3',room:'jay',name:'In Rainbows — Radiohead',description:'No skips.',icon:'◎'}],
    notes:[{id:'n1',room:'maya',from:'Jay',text:'Saw a copy of your favorite book today and thought of you.',date:'Yesterday'}],
    updates:{maya:'Trying to finish two books before the month ends. The weather has me staying in.',jay:'Found a record shop I could spend three hours in. Currently playing everything on repeat.',lounge:'Three friends. Two cities. So many unfinished conversations.'},
    photos:{},
    loungeMembers:{maya:true,jay:false}
  };
  function load(){try{const r=JSON.parse(localStorage.getItem('the-house-demo-v4')||'null');if(r&&r.version===4)return {...structuredClone(SEED),...r.data};}catch{}return structuredClone(SEED);}
  let data=load();
  const persist=()=>{try{localStorage.setItem('the-house-demo-v4',JSON.stringify({version:4,data}));}catch{toast('Storage is full. Try a smaller photo.');}};
  let currentRoom=null, panel=null, view={...ORIGINAL}, animationSerial=0, paused=false;
  let avatarState={};let clock=0,lastFrame=0;
  Object.entries(PEOPLE).forEach(([id,p])=>{avatarState[id]={x:p.x,y:p.y,targetX:p.x,frame:0,moving:false};});
  const buttons=[...document.querySelectorAll('[data-goto]')];
  const escape=(s)=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const makeId=()=>String(Date.now())+'-'+Math.random().toString(36).slice(2,6);
  const fmtToday=()=>new Date().toLocaleDateString('en-CA');
  const add=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));parent.appendChild(e);return e;};
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function targetView(id){if(!id)return {...ORIGINAL};const r=ROOMS[id];const rect=scene.getBoundingClientRect();const ratio=Math.max(.7,rect.width/Math.max(1,rect.height));let w=r.w,h=w/ratio;const maxH=1100;if(h>maxH){h=maxH;w=h*ratio;}return {x:r.cx-w/2,y:r.cy-h/2,w,h};}
  function cameraTo(room){const target=targetView(room),from={...view},token=++animationSerial,start=performance.now(),duration=reduce.matches?0:900;function tick(now){if(token!==animationSerial)return;const t=duration?Math.min(1,(now-start)/duration):1;const a=ease(t);view={x:lerp(from.x,target.x,a),y:lerp(from.y,target.y,a),w:lerp(from.w,target.w,a),h:lerp(from.h,target.h,a)};scene.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);if(t<1)requestAnimationFrame(tick);}requestAnimationFrame(tick);}
  const cls=(el,cl,on)=>el.classList.toggle(cl,Boolean(on));
  function drawActors(){actorsLayer.replaceChildren();ambientLayer.replaceChildren();return;const ids=currentRoom==='lounge'?['you',...Object.keys(data.loungeMembers).filter(id=>data.loungeMembers[id])]:currentRoom?[ROOMS[currentRoom].actor]:['maya','jay','you'];ids.forEach(id=>{
    const p=PEOPLE[id],s=avatarState[id],g=add('g',{'class':'character-button','role':'button','tabindex':'0','aria-label':`${p.name}, ${data.presence[id]?'online':'offline'}`},actorsLayer);
    const pos=add('g',{'transform':`translate(${s.x-38} ${s.y-110})`},g);g.dataset.person=id;
    add('ellipse',{cx:38,cy:104,rx:24,ry:6,fill:'#332d2922'},pos);
    const viewport=add('svg',{x:0,y:0,width:76,height:108,viewBox:'0 0 76 108',style:'overflow:hidden;pointer-events:none'},pos);
    add('image',{href:`./assets/sprites/${id}.svg`,x:-76*s.frame,y:0,width:608,height:108},viewport);
    add('rect',{x:13,y:110,width:54,height:21,rx:10,fill:'#fffdf8',stroke:'#d7d5cd','stroke-width':1},pos);
    const text=add('text',{x:40,y:124,'text-anchor':'middle',class:'avatar-name'},pos);text.textContent=p.name;
    add('circle',{cx:65,cy:111,r:7,fill:data.presence[id]?'#75ac7e':'#a6a6a2',class:'presence-pip'},pos);
    g.addEventListener('click',e=>{e.stopPropagation();openPanel('person',id);});
    g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPanel('person',id);}});
  });}
  function updateActorPositions(){const els=[...actorsLayer.querySelectorAll('[data-person]')];for(const g of els){const s=avatarState[g.dataset.person],pos=g.firstElementChild;pos.setAttribute('transform',`translate(${s.x-38} ${s.y-110})`);const image=pos.querySelector('image');if(image)image.setAttribute('x',String(-76*s.frame));const pip=pos.querySelector('.presence-pip');pip?.setAttribute('fill',data.presence[g.dataset.person]?'#75ac7e':'#a6a6a2');}}
  function animate(now){const dt=Math.min((now-lastFrame)/1000,.05)||0;lastFrame=now;clock+=dt;let changed=false;
    for(const [id,s] of Object.entries(avatarState)){
      if(Math.abs(s.targetX-s.x)>1){const d=s.targetX-s.x;s.x+=Math.sign(d)*Math.min(Math.abs(d),dt*125);s.moving=true;changed=true;}
      else{s.x=s.targetX;s.moving=false;}
      const frame=s.moving?4+(Math.floor(clock*9)%4):Math.floor(clock*2.8)%4;
      if(s.frame!==frame){s.frame=frame;changed=true;}
    }if(changed)updateActorPositions();requestAnimationFrame(animate);
  }
  function drawHotspots(){objectsLayer.replaceChildren();objectsLayer.hidden=true;return;if(!currentRoom){objectsLayer.hidden=true;return;}objectsLayer.hidden=false;for(const item of ROOMS[currentRoom].objects){
    const g=add('g',{role:'button',tabindex:'0','aria-label':`Explore ${item.name}`},objectsLayer);
    add('circle',{cx:item.x,cy:item.y,r:30,class:'marker-glow'},g);
    add('circle',{cx:item.x,cy:item.y,r:15,class:'marker-circle'},g);
    const t=add('text',{x:item.x,y:item.y-28,'text-anchor':'middle',class:'marker-label'},g);t.textContent=item.name;
    const click=e=>{e.stopPropagation();openPanel(item.id,currentRoom);};g.addEventListener('click',click);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();click(e);}});
  }}
  let detailSerial=0,detailTimer=null;
  function showDetail(id){
    const serial=++detailSerial;
    clearTimeout(detailTimer);
    detailScene.classList.remove('is-visible');
    detailScene.hidden=false;
    detailImage.setAttribute('href',ROOM_IMAGES[id]);
    detailScene.setAttribute('aria-label',ROOMS[id].name+', interactive close-up');
    detailHotspots.replaceChildren();
    for(const spot of DETAIL_HOTSPOTS[id]){
      const g=add('g',{class:'detail-hotspot',role:'button',tabindex:'0','aria-label':'Explore '+spot.name},detailHotspots);
      add('circle',{cx:spot.x,cy:spot.y,r:61,class:'detail-tap-target'},g);
      add('circle',{cx:spot.x,cy:spot.y,r:11,class:'detail-dot'},g);
      const label=add('text',{x:spot.x,y:spot.y-27,'text-anchor':'middle',class:'detail-label'},g);
      label.textContent=spot.name;
      const select=e=>{e.stopPropagation();openPanel(spot.id,id)};
      g.addEventListener('click',select);
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(e)}});
    }
    detailTimer=setTimeout(()=>{if(serial!==detailSerial||currentRoom!==id)return;detailScene.classList.add('is-visible')},reduce.matches?0:390);
  }
  function hideDetail(){
    ++detailSerial;clearTimeout(detailTimer);
    detailScene.classList.remove('is-visible');
    detailTimer=setTimeout(()=>{if(!currentRoom)detailScene.hidden=true},reduce.matches?0:460);
  }
  function enter(id){if(!ROOMS[id])return;currentRoom=id;if(id==='lounge'){const pos={you:[840,692],maya:[710,692],jay:[985,692]};for(const [key,[x,y]] of Object.entries(pos)){avatarState[key].x=x;avatarState[key].y=y;avatarState[key].targetX=x;}}else{const key=ROOMS[id].actor;avatarState[key].x=PEOPLE[key].x;avatarState[key].y=PEOPLE[key].y;avatarState[key].targetX=PEOPLE[key].x;}closePanel();const r=ROOMS[id];$('#scene-kicker').textContent=r.kicker;$('#scene-title').textContent=r.name;$('#scene-subtitle').textContent=r.description;$('#return-home').hidden=false;$('#room-targets').hidden=true;$('#scene-overlay').hidden=true;$('#scene-caption').hidden=false;buttons.forEach(b=>b.setAttribute('aria-current',b.dataset.goto===id?'true':'false'));$('#footer-label').textContent='INSIDE / '+r.name.toUpperCase();drawActors();drawHotspots();cameraTo(id);showDetail(id);}
  function home(){currentRoom=null;for(const [key,p] of Object.entries(PEOPLE)){avatarState[key].x=p.x;avatarState[key].y=p.y;avatarState[key].targetX=p.x;}closePanel();$('#scene-kicker').textContent='COME ON IN';$('#scene-title').textContent='Different rooms. One little world.';$('#scene-subtitle').textContent="Step into a friend's space, leave a note, or see what everyone is up to.";$('#return-home').hidden=true;$('#room-targets').hidden=false;$('#scene-overlay').hidden=false;$('#scene-caption').hidden=true;buttons.forEach(b=>b.removeAttribute('aria-current'));$('#footer-label').textContent='HOUSE OVERVIEW · 01 / 01';drawActors();drawHotspots();hideDetail();cameraTo(null);}
  let toastTimer;
  function toast(message){const el=$('#toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,2800);}
  const title=(h,p='')=>`<h2>${escape(h)}</h2>${p?`<p class="section-info">${escape(p)}</p>`:''}`;
  const cap=(txt)=>`<p class="small-note">${escape(txt)}</p>`;
  function shelf(kind,room){const maps={books:['Book wall','The stories we keep on the shelf.','A book title','What makes this one special?','📚'],movies:['Movie list','Films worth telling your friends about.','Movie title','Why should someone watch it?','🎬'],vinyl:['Vinyl collection','Records with stories attached.','Artist — album','Why is this one on repeat?','🎵']};const [heading,subtitle,place,why,emoji]=maps[kind];const items=(data[kind]||[]).filter(x=>x.room===room);return `${title(heading,subtitle)}<div class="card-stack">${items.map(x=>`<div class="object-card"><span class="mini-cover">${escape(x.icon||emoji)}</span><div><strong>${escape(x.name)}</strong><p>${escape(x.description)}</p></div></div>`).join('')||'<div class="simple-empty">Nothing on the shelf yet.</div>'}</div><button class="primary-btn" data-action="add-toggle">+ Add something to the ${escape(kind==='vinyl'?'record':'collection')}</button><form class="add-form" id="shelf-form" hidden><p class="add-heading">ADD AN ITEM</p><label class="input-label" for="shelf-name">TITLE</label><input class="form-input" id="shelf-name" name="name" maxlength="100" required placeholder="${escape(place)}"><label class="input-label" for="shelf-desc">YOUR TAKE</label><textarea class="form-textarea" id="shelf-desc" name="description" maxlength="230" placeholder="${escape(why)}"></textarea><button class="primary-btn" type="submit">Save to shelf ↗</button></form>${cap('Prototype: edits are saved in your browser, not shared with other accounts.')}`;}
  function notes(room){const notes=data.notes.filter(n=>n.room===room).slice().reverse();return `${title(room==='lounge'?'Notes to our group':'Notes to '+(PEOPLE[room]?.name||'the room'),'A small message that waits until someone finds it.')}<div class="card-stack">${notes.map(n=>`<div class="paper"><b>Dear ${escape(room==='lounge'?'friends':PEOPLE[room]?.name||'friend')},</b><p>${escape(n.text)}</p><small>— ${escape(n.from)} · ${escape(n.date)}</small></div>`).join('')||'<div class="simple-empty">No notes yet. Leave the first one.</div>'}</div><form id="note-form"><label class="input-label" for="note-text">LEAVE A LITTLE NOTE</label><textarea name="text" id="note-text" required maxlength="360" class="form-textarea" placeholder="I saw this and thought of you..."></textarea><button class="primary-btn" type="submit">✉ Leave a note</button></form>${cap('Only saved on this device in the demo. Letters are not actually delivered.')}`;}
  function updatePanel(room){const name=room==='lounge'?'Everyone':PEOPLE[room].name;return `${title('Life lately','The little updates that rarely make it into a full conversation.')}<div class="update-box"><b>${escape(name.toUpperCase())} · LATEST</b><p>${escape(data.updates[room]||'No updates yet.')}</p></div><form id="update-form"><label class="input-label" for="update-text">ADD A NEW UPDATE</label><textarea id="update-text" name="text" class="form-textarea" maxlength="260" required placeholder="Something small from this week..."></textarea><button class="primary-btn" type="submit">Post update ↗</button></form>${cap('Demo updates can be edited locally. Real friend publishing requires accounts and a backend.')}`;}
  const PHOTO_PLACEHOLDERS={maya:['📖','A slow Sunday, a good book, nowhere to be.'],jay:['🎧','On the hunt for another record store.'],lounge:['📷','Our small collection of ordinary moments.']};
  function daily(room){const p=data.photos[room],fallback=PHOTO_PLACEHOLDERS[room]||PHOTO_PLACEHOLDERS.lounge;return `${title('A moment a day','One picture from today. Not a feed to keep up with.')}<div class="photo-card"><span class="eyebrow">${escape(p?.date||'A LITTLE SNAPSHOT')}</span>${p?.src?`<img alt="Daily shared snapshot" src="${p.src}" />`:`<div class="photo-placeholder">${escape(fallback[0])}</div>`}<p>${escape(p?.caption||fallback[1])}</p></div><label class="photo-upload" for="daily-file">📷 ${p?.date===fmtToday()?'Replace today’s photo':'Choose a photo for today'}<input type="file" name="photo" id="daily-file" accept="image/*" /></label><form id="daily-form" hidden><label class="input-label" for="daily-caption">CAPTION</label><input class="form-input" maxlength="130" id="daily-caption" placeholder="A little bit of today..."><button type="submit" class="primary-btn">Pin to the room ↗</button></form>${cap('One photo per room each day. The demo stores a compressed image in this browser only.')}`;}
  function gallery(){return `${title('The photo wall','A few snapshots we keep coming back to.')}<div class="gallery-thumbs"><button data-action="gallery-photo" data-id="summer" aria-label="Summer trip photo">🏖️</button><button data-action="gallery-photo" data-id="coffee" aria-label="Our coffee photo">☕</button><button data-action="gallery-photo" data-id="rain" aria-label="Rainy afternoon photo">🌧️</button></div><div class="update-box" id="gallery-story"><b>THE SUMMER TRIP</b><p>That train ride where we missed our stop and somehow had the best day.</p></div><button class="primary-btn" data-action="open-daily">+ Add a new memory photo</button>`;}
  function tv(){return `${title('What should we watch?','Your little lounge watchlist, pulled from what friends love.')}<div class="object-card"><span class="mini-cover">🌇</span><div><strong>Before Sunrise</strong><p>Jay can't stop recommending it.</p></div></div><div class="object-card"><span class="mini-cover">🎬</span><div><strong>Friday movie night?</strong><p>Start a conversation, not another endless poll.</p></div></div><button class="primary-btn" data-action="open-movies">See Jay's movie wall ↗</button>`;}
  function lounge(){const active=['you',...Object.keys(data.loungeMembers).filter(k=>data.loungeMembers[k])];return `${title('Who is here?','Watch your shared room change as friends arrive.')}<div class="segmented">${['maya','jay'].map(id=>`<button data-action="toggle-lounge" data-id="${id}" aria-pressed="${Boolean(data.loungeMembers[id])}">${data.loungeMembers[id]?'✓ ': '+ '}${escape(PEOPLE[id].name)}</button>`).join('')}</div><div class="update-box"><b>${active.length} FRIEND${active.length===1?'':'S'} IN THE LOUNGE</b><p>${active.length===1?'The room is quiet. Invite a friend.':active.length===2?'A shared film and a couple of good memories appear.':'A group photo and the running jokes from your last trip return.'}</p></div>${cap('This is simulated participation: there are no real-time connected users yet.')}`;}
  function person(id){const p=PEOPLE[id];return `${title(p.name,p.subtitle)}<div class="person-line"><img class="person-id" src="./assets/sprites/${id}.svg" alt="Illustrated character for ${escape(p.name)}"/><div><strong>${escape(p.name)}</strong><p>${data.presence[id]?'● Online (demo)':'○ Offline (demo)'}</p></div></div><div class="status-row"><span class="input-label">PREVIEW PRESENCE</span><button class="ghost-btn" data-action="toggle-presence" data-id="${id}">${data.presence[id]?'Set offline':'Set online'}</button></div><div class="chip-row"><button class="chip" data-action="profile-action" data-id="${id}" data-kind="update">Latest update</button><button class="chip" data-action="profile-action" data-id="${id}" data-kind="notes">Leave note</button>${id==='maya'?'<button class="chip" data-action="profile-action" data-id="maya" data-kind="books">Book wall</button>':id==='jay'?'<button class="chip" data-action="profile-action" data-id="jay" data-kind="vinyl">Records</button>':''}</div>${cap('Presence is manually simulated, not inferred from actual activity.')}`;}
  function help(){return `${title('A little guide','This is a playable prototype, not a connected social network.')}<div class="card-stack"><div class="object-card">🏠 &nbsp; Click any of the three rooms to zoom in.</div><div class="object-card">✳ &nbsp; Tap glowing objects to explore books, films and stories.</div><div class="object-card">🚶 &nbsp; Click an open floor area to guide a character along its floor zone.</div><div class="object-card">✉ &nbsp; Post a note, upload today's photo or update a list locally.</div><div class="object-card">● &nbsp; Preview online/offline and lounge arrival states.</div></div>${cap('Your changes persist only in this browser. To make it multi-user, we need authentication, permissions, image storage and realtime presence.')}`;}
  function openPanel(kind,room=currentRoom){panel={kind,room};$('#drawer-kicker').textContent=kind==='person'?'YOUR FRIENDS':kind==='help'?'HOW TO PLAY':room==='lounge'?'THE SHARED SPACE':'A LITTLE DISCOVERY';drawer.hidden=false;$('#drawer-backdrop').hidden=false;renderPanel();}
  function renderPanel(){if(!panel)return;const {kind,room}=panel;content.innerHTML=kind==='person'?person(room):kind==='help'?help():['books','movies','vinyl'].includes(kind)?shelf(kind,room):kind==='notes'?notes(room):kind==='update'?updatePanel(room):kind==='daily'?daily(room):kind==='gallery'?gallery():kind==='tv'?tv():kind==='lounge'?lounge():help();}
  function closePanel(){drawer.hidden=true;$('#drawer-backdrop').hidden=true;panel=null;}
  function refreshRoom(){drawActors();drawHotspots();if(panel)renderPanel();}
  content.addEventListener('click',e=>{
    const btn=e.target.closest('[data-action]');if(!btn)return;const act=btn.dataset.action;
    if(act==='add-toggle'){const form=$('#shelf-form');form.hidden=!form.hidden;if(!form.hidden)$('#shelf-name')?.focus();}
    else if(act==='toggle-presence'){const id=btn.dataset.id;data.presence[id]=!data.presence[id];persist();refreshRoom();toast(`${PEOPLE[id].name} set ${data.presence[id]?'online':'offline'} (demo)`);}
    else if(act==='toggle-lounge'){const id=btn.dataset.id;data.loungeMembers[id]=!data.loungeMembers[id];data.presence[id]=data.loungeMembers[id];persist();refreshRoom();toast(`${PEOPLE[id].name} ${data.loungeMembers[id]?'joined':'left'} the lounge (demo)`);}
    else if(act==='profile-action')openPanel(btn.dataset.kind,btn.dataset.id);
    else if(act==='open-daily')openPanel('daily','lounge');
    else if(act==='open-movies')openPanel('movies','jay');
    else if(act==='gallery-photo'){const s={summer:['THE SUMMER TRIP','That train ride where we missed our stop and somehow had the best day.'],coffee:['THE COFFEE SPOT','The place we kept going to even when it was too crowded.'],rain:['THE RAINY AFTERNOON','We spent hours talking instead of going home.']}[btn.dataset.id];$('#gallery-story').innerHTML=`<b>${s[0]}</b><p>${s[1]}</p>`;}
  });
  content.addEventListener('submit',e=>{
    e.preventDefault();const id=e.target.id,room=panel?.room;if(!room)return;
    if(id==='shelf-form'){const name=$('#shelf-name').value.trim(),description=$('#shelf-desc').value.trim(),kind=panel.kind;if(!name)return;data[kind].push({id:makeId(),room,name,description,icon:kind==='books'?'✳':kind==='movies'?'◈':'◎'});persist();renderPanel();toast('Added to the collection');}
    if(id==='note-form'){const text=$('#note-text').value.trim();if(!text)return;data.notes.push({id:makeId(),room,text,from:'You',date:'Just now'});persist();renderPanel();toast('Letter left on the desk');}
    if(id==='update-form'){const text=$('#update-text').value.trim();if(!text)return;data.updates[room]=text;persist();renderPanel();toast('Latest update saved');}
    if(id==='daily-form'){if(!pendingPhoto)return;data.photos[room]={src:pendingPhoto,date:fmtToday(),caption:$('#daily-caption').value.trim()||'A little moment from today.'};pendingPhoto=null;persist();renderPanel();toast('Today’s photo pinned');}
  });
  let pendingPhoto=null;
  content.addEventListener('change',async e=>{
    if(e.target.id!=='daily-file')return;const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){toast('Please choose an image.');return;}
    try{const url=URL.createObjectURL(file),img=new Image();img.src=url;await img.decode();const max=720;const scale=Math.min(1,max/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);pendingPhoto=canvas.toDataURL('image/jpeg',.74);URL.revokeObjectURL(url);$('#daily-form').hidden=false;$('#daily-caption').focus();toast('Photo ready to pin');}catch{toast('Could not read that photo.');}
  });
  $('#return-home').addEventListener('click',home);
  $('#show-help').addEventListener('click',()=>openPanel('help','lounge'));
  $('#drawer-close').addEventListener('click',closePanel);
  $('#drawer-backdrop').addEventListener('click',closePanel);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(panel)closePanel();else if(currentRoom)home();}});
  document.querySelectorAll('.room-hit').forEach(el=>{el.addEventListener('click',()=>enter(el.dataset.room));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();enter(el.dataset.room);}});});
  buttons.forEach(b=>b.addEventListener('click',()=>{if(currentRoom===b.dataset.goto)home();else enter(b.dataset.goto);}));
  scene.addEventListener('click',e=>{return;if(!currentRoom||panel||e.target.closest('g[role=button]'))return;const pt=scene.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const mat=scene.getScreenCTM();if(!mat)return;const local=pt.matrixTransform(mat.inverse());const r=ROOMS[currentRoom],a=avatarState[r.actor],walk=r.walk;
    // Keep movement constrained to a believable strip of visible floor, away from large furniture.
    if(Math.abs(local.y-walk.y)>165)return;
    a.targetX=Math.max(walk.lo,Math.min(walk.hi,local.x));
  });
  let lastRatio=scene.clientWidth/Math.max(1,scene.clientHeight);
  window.addEventListener('resize',()=>{const ratio=scene.clientWidth/Math.max(1,scene.clientHeight);if(Math.abs(ratio-lastRatio)>.08){lastRatio=ratio;cameraTo(currentRoom);}});
  drawActors();drawHotspots();requestAnimationFrame(animate);
})();
