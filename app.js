(function appStart(){
  "use strict";
  const NS="http://www.w3.org/2000/svg";
  const people={
    you:{name:"You",pronoun:"your",color:"#c0b5ed",tag:"The designer",book:[["The Creative Act","A book I keep revisiting.","🎨","#756ba5"],["Tomorrow, and Tomorrow, and Tomorrow","For people who make things.","🎮","#a56c91"]],movie:[["Before Sunrise","One of my forever favorites.","🌅","#c79a74"],["Perfect Days","The beauty in ordinary things.","☀️","#7d9e96"]],photo:[["A weekend in Brooklyn","The kind of day I want to repeat.","📷","#88adae"]]},
    maya:{name:"Maya",pronoun:"her",color:"#e7afbd",tag:"Currently reading everything",book:[["Normal People","This absolutely destroyed me.","📖","#be8da5"],["Crying in H Mart","I want everyone to read this.","🌸","#8b9d9c"]],movie:[["Before Sunrise","I could watch them talk forever.","🌇","#d1a07f"],["Little Women","A film that feels like home.","🏡","#a8b5a0"]],photo:[["Our summer trip","Remember the horrible train ride?","📸","#c7a5a2"]]},
    jay:{name:"Jay",pronoun:"his",color:"#a5cdbb",tag:"The soundtrack guy",book:[["Kitchen Confidential","Read the first chapter immediately.","🍳","#9d866c"]],movie:[["Interstellar","Still thinking about that soundtrack.","🚀","#667ea9"],["The Grand Budapest Hotel","The colors. The chaos.","🏨","#ba809c"]],photo:[["The night we got lost","Best detour ever.","🗺️","#749f92"]]},
    leo:{name:"Leo",pronoun:"his",color:"#ecc58f",tag:"Always has a recommendation",book:[["Norwegian Wood","I think about this one a lot.","🍃","#a99a77"]],movie:[["Whiplash","Watch it with headphones.","🥁","#b47979"],["The Truman Show","Rewatch this with me.","☁️","#8caab5"]],photo:[["Sunday flea market","We found the weirdest lamp.","🪑","#a78879"]]}
  };
  const specs={
    maya:{x:112,y:145,w:488,h:232,wall:"#967f9e",dark:"#716985",floor:"#caa48f",accent:"#eab6bf",nick:"THE READER",index:0},
    jay:{x:650,y:145,w:488,h:232,wall:"#779b9a",dark:"#546f7c",floor:"#b69a8a",accent:"#a9d5bc",nick:"THE CURATOR",index:1},
    you:{x:112,y:420,w:488,h:232,wall:"#aaa1b4",dark:"#777594",floor:"#d6af91",accent:"#c6b5ef",nick:"YOUR LITTLE SPACE",index:2},
    leo:{x:650,y:420,w:488,h:232,wall:"#c39f87",dark:"#8f7977",floor:"#c5a17f",accent:"#f5cd93",nick:"THE MOVIE GUY",index:3},
    lounge:{x:112,y:691,w:1026,h:238,wall:"#82939f",dark:"#525e7d",floor:"#d2aa91",accent:"#efcaaf",nick:"EVERYONE'S PLACE",index:4}
  };
  const world=document.querySelector("#world"),inspector=document.querySelector("#inspector");
  const title=document.querySelector("#scene-name"),desc=document.querySelector("#scene-desc");
  const back=document.querySelector("#back"),stageNote=document.querySelector("#stage-note"),moveGuide=document.querySelector("#move-guide");
  const dialog=document.querySelector("#letter-dialog");
  let active=null,tab="books",members=new Set(["you"]),view={x:0,y:0,w:1250,h:1010},player={x:0,y:0},previous=0,frame=0,animTime=0,lastTime=0;
  const keys=new Set();
  const svgRect=(x,y,w,h,fill,extra="")=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
  const txt=(x,y,t,size=14,fill="#fff",extra="")=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${t}</text>`;
  const char=(id,x,y,frameIndex=0,extra="")=>`<g transform="translate(${x} ${y})" ${extra}><ellipse cx="24" cy="62" rx="19" ry="5" fill="#302b41" opacity=".23"/><svg class="pixel-character" x="0" y="-2" width="48" height="64" viewBox="${frameIndex*48} 0 48 64" overflow="hidden"><image href="./sprites/${id}.svg" x="0" y="0" width="192" height="64"/></svg></g>`;
  const bookStack=(x,y)=>`<g>${svgRect(x,y,104,102,"#674f68",'rx="5" stroke="#4a3e59" stroke-width="4"')}${[0,1,2].map((s)=>`<g>${svgRect(x+6,y+30+s*31,92,5,"#e0b596")}${[0,1,2,3,4,5,6,7].map((i)=>svgRect(x+9+i*11,y+7+s*31+(i%3)*3,8,23-(i%3)*3,["#e8c09b","#9eb7b3","#dc99a5","#bbaad7","#e6d69b","#8e9dbe","#bba6a0","#a8c1a9"][i],'rx="1"')).join("")}</g>`).join("")}</g>`;
  const cinema=(x,y)=>`<g>${[0,1,2].map((k)=>`<g transform="translate(${x+k*62} ${y})">${svgRect(0,0,53,91,["#b88f9b","#a4a5c2","#d8af8a"][k],'rx="2" stroke="#f9e8ce" stroke-width="4"')}${svgRect(6,6,41,60,["#5b6a96","#677a84","#947781"][k],'rx="2"')}<circle cx="29" cy="27" r="14" fill="#f4d5a3"/><path d="M7 57 L25 31 L47 55 L47 65 L7 65Z" fill="#626c82"/>${txt(26,80,["DAWN","SPACE","US"][k],9,"#fff",'font-weight="700" text-anchor="middle"')}</g>`).join("")}</g>`;
  const gallery=(x,y)=>`<g>${[0,1,2].map((k)=>`<g transform="translate(${x+k*58} ${y+(k===1?9:0)}) rotate(${k===0?-5:k===1?7:-3} 27 33)">${svgRect(0,0,54,67,"#f7eee0",'rx="2"')}${svgRect(5,5,44,44,["#8eb4b2","#d6a5a1","#9fa6cc"][k],'rx="2"')}<path d="M6 40 L23 22 L32 31 L46 18 L49 49 L6 49Z" fill="${["#547e79","#aa768c","#686e9d"][k]}"/><circle cx="37" cy="17" r="7" fill="#ffdda0"/></g>`).join("")}</g>`;
  const plant=(x,y)=>`<g>${svgRect(x+8,y+32,26,29,"#a46f68",'rx="3"')}<path d="M21 39 Q-2 18 12 0 M21 39 Q47 17 34 0 M20 34 Q14 10 -1 13 M20 35 Q49 10 48 19" stroke="#4c816a" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M20 36 L27 8" stroke="#94b78b" stroke-width="5" stroke-linecap="round"/></g>`;
  const rug=(x,y,w=160)=>`<ellipse cx="${x+w/2}" cy="${y}" rx="${w/2}" ry="19" fill="#d9b0ae" opacity=".55"/><ellipse cx="${x+w/2}" cy="${y}" rx="${w/2-11}" ry="12" fill="none" stroke="#f3d4b9" stroke-width="2"/>`;
  const desk=(x,y)=>`<g>${svgRect(x+9,y+30,130,11,"#c3917c",'rx="4"')}${svgRect(x+19,y+39,9,35,"#886b72")}${svgRect(x+118,y+39,9,35,"#886b72")}${svgRect(x+57,y-13,53,44,"#4c526d",'rx="4" stroke="#29364b" stroke-width="4"')}${svgRect(x+63,y-8,42,30,"#9baebd")}${svgRect(x+85,y+30,3,10,"#4a4553")}${svgRect(x+77,y+39,22,4,"#4a4553")}</g>`;
  const couch=(x,y,c)=>`<g>${svgRect(x+3,y+35,181,46,c,'rx="18" stroke="#45485c" stroke-width="4"')}${svgRect(x+14,y+7,159,48,c,'rx="18" stroke="#4a536c" stroke-width="4"')}${svgRect(x+19,y+48,18,25,"#60536d",'rx="4"')}${svgRect(x+150,y+48,18,25,"#60536d",'rx="4"')}${svgRect(x+32,y+34,39,28,"#f1c6ac",'rx="7"')}${svgRect(x+105,y+34,38,28,"#dec1d0",'rx="7"')}</g>`;
  function roomMarkup(id){
    const r=specs[id],x=r.x,y=r.y,w=r.w,h=r.h;
    const isLounge=id==="lounge";
    const backwall=`${svgRect(x,y,w,h-53,r.wall,'rx="5"')}${svgRect(x,y,w,14,r.dark)}<path d="M${x} ${y+h-53} L${x+w} ${y+h-53} L${x+w+29} ${y+h-17} L${x-29} ${y+h-17}Z" fill="${r.floor}" stroke="#554d63" stroke-width="5"/><path d="M${x} ${y} L${x-29} ${y+29} L${x-29} ${y+h-17} L${x} ${y+h-53}Z" fill="${r.dark}" stroke="#51445c" stroke-width="4"/><path d="M${x+w} ${y} L${x+w+29} ${y+29} L${x+w+29} ${y+h-17} L${x+w} ${y+h-53}Z" fill="${r.dark}" stroke="#51445c" stroke-width="4"/><path d="M${x-29} ${y+h-17} L${x+w+29} ${y+h-17} L${x+w+29} ${y+h-2} L${x-29} ${y+h-2}Z" fill="#594f68" stroke="#34364b" stroke-width="3"/>`;
    let decor="";
    if(!isLounge){
      decor+=`${svgRect(x+20,y+32,99,123,"#4f516a",'rx="6"')}${svgRect(x+29,y+40,80,107,"#b8c7cc",'rx="4"')}<path d="M${x+69} ${y+40}V${y+147} M${x+29} ${y+95}H${x+109}" stroke="#68677c" stroke-width="5"/><circle cx="${x+80}" cy="${y+65}" r="20" fill="#fff0c0" opacity=".6"/>`;
      decor+=bookStack(x+141,y+34)+cinema(x+267,y+35)+gallery(x+20,y+110);
      decor+=rug(x+228,y+h-49,171)+desk(x+291,y+106)+plant(x+425,y+113);
      decor+=char(id,x+235,y+119,0,'class="character-bob"');
      decor+=`<rect class="hotspot" data-object="books" data-room="${id}" x="${x+139}" y="${y+28}" width="111" height="115" rx="6"><title>Books</title></rect><rect class="hotspot" data-object="movies" data-room="${id}" x="${x+258}" y="${y+28}" width="193" height="99" rx="6"><title>Movies</title></rect><rect class="hotspot" data-object="gallery" data-room="${id}" x="${x+13}" y="${y+104}" width="190" height="79" rx="6"><title>Gallery</title></rect>`;
    }else{
      const duo=members.has("maya"),trio=members.has("jay");
      decor+=`${svgRect(x+25,y+34,135,89,"#4e536c",'rx="6" stroke="#c8c9d7" stroke-width="4"')}${svgRect(x+34,y+43,117,72,trio?"#a09b9a":duo?"#a990aa":"#668492",'rx="4"')}`;
      decor+=duo?cinema(x+200,y+42):gallery(x+200,y+45);
      decor+=gallery(x+450,y+43);
      decor+=`<g class="room-change">${svgRect(x+704,y+43,165,109,duo?"#79677b":"#677c83",'rx="8" stroke="#d6c2ba" stroke-width="5"')}${txt(x+786,y+76,trio?"OUR TRIP":duo?"SHARED STORY":"THE LOUNGE",16,"#ffe6d0",'text-anchor="middle" font-weight="800"')}${txt(x+786,y+105,trio?"THREE OF US":duo?"TWO OF US":"COME ON IN",12,"#fff4e9",'text-anchor="middle"')}${txt(x+786,y+129,trio?"✦ ✦ ✦":duo?"♥ ♥":"✳",23,"#efc9c4",'text-anchor="middle"')}</g>`;
      decor+=rug(x+285,y+h-42,260)+couch(x+326,y+121,"#87a7a1")+plant(x+921,y+117);
      decor+=char("you",x+256,y+132,0,'class="character-bob"');
      if(duo)decor+=char("maya",x+538,y+130,0,'class="character-bob"');
      if(trio)decor+=char("jay",x+610,y+131,0,'class="character-bob"');
      decor+=`<rect class="hotspot" data-room="lounge" data-object="memory" x="${x+700}" y="${y+38}" width="173" height="117" rx="7"><title>Shared story</title></rect>`;
    }
    const label=`<g pointer-events="none">${svgRect(x+17,y+4,isLounge?155:114,33,"#292c40d9",'rx="12"')}${txt(x+29,y+26,isLounge?"THE LOUNGE":people[id].name.toUpperCase()+"'S ROOM",13,"#fff4ee",'font-weight="800"')}</g>`;
    return `<g class="world-room" data-room="${id}">${backwall}${decor}${label}<rect class="hotspot" data-object="room" data-room="${id}" x="${x}" y="${y+159}" width="${w}" height="${h-159}" rx="6"><title>Enter room</title></rect></g>`;
  }
  function makeWorld(){
    let stars="";
    for(let i=0;i<75;i++){const x=(i*173+49)%1240,y=(i*269+28)%1000;stars+=`<circle cx="${x}" cy="${y}" r="${i%3===0?2:1}" fill="#e9dbd8" opacity=".24"/>`;}
    let city="";
    for(let i=0;i<13;i++){const x=i*102-20,h=100+(i*47)%160;city+=`${svgRect(x,930-h,93,h,"#333c55")}${[0,1,2].map((k)=>svgRect(x+18+k*24,957-h,10,20,"#a89db2",'opacity=".19"')).join("")}`;}
    const outline=`<path d="M85 120 L1163 120 L1193 162 L1193 946 L70 946 L70 162 Z" fill="#64627f" stroke="#34364b" stroke-width="10"/><path d="M70 119 L1193 119 L1164 76 L107 76 Z" fill="#797b9c" stroke="#3e415f" stroke-width="10"/>${svgRect(70,383,1123,31,"#626078",'stroke="#36334d" stroke-width="6"')}${svgRect(70,657,1123,31,"#626078",'stroke="#36334d" stroke-width="6"')}${svgRect(70,936,1123,30,"#55526f",'stroke="#34364a" stroke-width="6"')}`;
    const roof=`${[0,1,2,3,4,5,6].map((i)=>`<g>${svgRect(155+i*143,87,74,16,"#b5a5ba",'rx="4"')}${svgRect(167+i*143,91,50,10,"#fcddae",'rx="3"')}</g>`).join("")}<path d="M96 112L1168 112" stroke="#e2bad1" stroke-width="7"/>`;
    const vines=`${[0,1,2,3,4,5,6,7].map((i)=>{const x=126+i*141;return `<path d="M${x} 119 q-10 24 8 38 q15 12 3 25" stroke="#628b78" stroke-width="5" fill="none"/><circle cx="${x}" cy="147" r="8" fill="#82b08d"/><circle cx="${x+10}" cy="164" r="9" fill="#709681"/>`;}).join("")}`;
    return `<defs><linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#23243c"/><stop offset="1" stop-color="#51516b"/></linearGradient><pattern id="nightDots" width="31" height="31" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1" fill="#ffffff" opacity=".08"/></pattern></defs>${svgRect(0,0,1250,1010,"url(#sky)")}${svgRect(0,0,1250,1010,"url(#nightDots)")}${stars}${city}${outline}${roof}${vines}${roomMarkup("maya")}${roomMarkup("jay")}${roomMarkup("you")}${roomMarkup("leo")}${roomMarkup("lounge")}<g id="active-player"></g>`;
  }
  function htmlEscape(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
  function safeLetters(){
    try{const v=JSON.parse(localStorage.getItem("the-house-letters")||"{}");return v&&typeof v==="object"?v:{}}catch{return {}}
  }
  let letters=safeLetters();
  function writeLetters(){try{localStorage.setItem("the-house-letters",JSON.stringify(letters))}catch{}}
  function renderWorld(){world.innerHTML=makeWorld();renderPlayer();}
  function motionEase(t){return 1-Math.pow(1-t,3);}
  function cameraTo(id){
    const to=id?{x:specs[id].x-56,y:specs[id].y-62,w:specs[id].w+112,h:specs[id].h+122}:{x:0,y:0,w:1250,h:1010};
    const start={...view},begin=performance.now(),duration=window.matchMedia("(prefers-reduced-motion: reduce)").matches?0:850,token=++previous;
    function tick(now){if(token!==previous)return;const p=duration?Math.min((now-begin)/duration,1):1,e=motionEase(p);view={x:start.x+(to.x-start.x)*e,y:start.y+(to.y-start.y)*e,w:start.w+(to.w-start.w)*e,h:start.h+(to.h-start.h)*e};world.setAttribute("viewBox",`${view.x} ${view.y} ${view.w} ${view.h}`);if(p<1)requestAnimationFrame(tick);}requestAnimationFrame(tick);
  }
  function enter(id,newTab){
    if(!specs[id])return;
    active=id;tab=newTab||"books";
    const r=specs[id];player={x:r.x+(id==="lounge"?248:233),y:r.y+119};
    title.textContent=id==="lounge"?"The living room":id==="you"?"Your little corner":`${people[id].name}'s room`;
    desc.textContent=id==="lounge"?"The story changes depending on who's here.":id==="you"?"Your favorite things, all in one place.":`Step inside and discover what ${people[id].name} is into.`;
    back.hidden=false;stageNote.textContent="✳ Tap a shelf, poster or photograph";moveGuide.hidden=false;
    renderWorld();cameraTo(id);renderSidebar();renderPlayer();
  }
  function leave(){
    active=null;title.textContent="The house on Bloom Street";desc.textContent="Four personal rooms. One shared lounge. So many stories.";
    back.hidden=true;moveGuide.hidden=true;stageNote.textContent="✳ Click a room to step inside";
    renderWorld();cameraTo(null);renderSidebar();
  }
  function entryList(id,type){
    const list=people[id][type]||[];
    return `<div class="item-list">${list.map((item,i)=>`<div class="item-entry"><span class="poster" style="background:${item[3]}">${item[2]}</span><div><h3>${htmlEscape(item[0])}</h3><p>${htmlEscape(item[1])}</p></div></div>`).join("")}</div>`;
  }
  function roomPanel(id){
    const p=people[id],isYou=id==="you";
    const tabs=[["books","📚","Book wall"],["movie","🎬","Movie wall"],["photo","📷","Gallery"],["letter","💌","Letters"]];
    let body="";
    if(tab==="books"||tab==="movie"||tab==="photo"){
      const k=tab==="books"?"book":tab==="movie"?"movie":"photo";
      const heading=k==="book"?"On the shelf":k==="movie"?"On the movie wall":"On the gallery wall";
      body=`<div class="inset"><span class="section-label">${heading.toUpperCase()}</span><div style="height:11px"></div>${entryList(id,k)}<div style="height:13px"></div><p class="small">${isYou?"A few things that tell your story.":"The kind of things you'd notice if you dropped by in person."}</p></div>`;
      if(!isYou)body+=`<button class="btn primary block" data-action="write-letter">💌 Leave ${p.name} a note about this</button>`;
    }else{
      const own=Array.isArray(letters[id])?letters[id]:[];
      body=`<div class="inset"><span class="section-label">THE LETTER DESK</span><div style="height:13px"></div>${own.length?own.slice(-3).reverse().map(l=>`<div class="note-paper" style="margin-bottom:12px"><strong>✉ For ${htmlEscape(p.name)}</strong><p>${htmlEscape(l.text)}</p><span class="stamp">SEALED</span></div>`).join(""):`<div class="note-paper"><strong>✉ A note for you</strong><p>Some things deserve a little more thought than a text.</p><span class="stamp">PERSONAL</span></div>`}</div>`;
      if(!isYou)body+=`<button class="btn primary block" data-action="write-letter">✎ Write to ${p.name}</button>`;
    }
    return `<span class="eyebrow">PERSONAL SPACE / ${p.tag.toUpperCase()}</span><div class="row"><span class="avatar-circle" style="background:${p.color}">${p.name[0]}</span><div><h2>${isYou?"Your room":p.name+"'s room"}</h2><p>${p.tag}</p></div></div><div class="divider"></div><span class="section-label">EXPLORE THE ROOM</span><div class="objects">${tabs.map(([key,emoji,label])=>`<button class="object-tile ${tab===key?"active":""}" data-tab="${key}"><span class="big">${emoji}</span><strong>${label}</strong></button>`).join("")}</div>${body}<p class="small">Try the arrow keys / WASD to walk around. Tap the illustrated objects to open their stories.</p><button class="btn ghost block" data-room="lounge">Meet in the shared lounge ↗</button>`;
  }
  function loungePanel(){
    const duo=members.has("maya"),trio=members.has("jay");
    const story=trio?["Our summer trip","A memory the three of you share. That train ride is still legendary.","🏖️"]:duo?["Before Sunrise","You and Maya have this film on your walls. Remember when you talked about it?","🌇"]:["The house is quiet","Choose who joins you to see the shared stories appear.","🛋️"];
    return `<span class="eyebrow">SHARED SPACE / THE LOUNGE</span><h2>The living room</h2><p>Each group of people brings out a different story in the same space.</p><div class="divider"></div><span class="section-label">WHO'S HERE?</span><div class="select-people"><button class="person-check" aria-pressed="true" disabled><span class="avatar-circle" style="background:${people.you.color}">Y</span>You <span class="checkmark">✓</span></button><button class="person-check" aria-pressed="${duo}" data-member="maya"><span class="avatar-circle" style="background:${people.maya.color}">M</span>Maya <span class="checkmark">${duo?"✓":"+"}</span></button><button class="person-check" aria-pressed="${trio}" data-member="jay"><span class="avatar-circle" style="background:${people.jay.color}">J</span>Jay <span class="checkmark">${trio?"✓":"+"}</span></button></div><div class="inset"><span class="section-label">THE SPACE REMEMBERS</span><div style="height:14px"></div><div class="row"><span style="font-size:30px">${story[2]}</span><div><strong style="font-size:14px">${story[0]}</strong><p>${story[1]}</p></div></div></div><div class="inset"><strong style="font-size:13px">✦ What's different?</strong><p>The lounge highlights stories shared by the people present. This demo simulates arrivals so you can test the transformation without live accounts.</p></div><button class="btn ghost block" data-room="maya">Visit Maya's room ↗</button>`;
  }
  function renderSidebar(){
    if(active==="lounge"){inspector.innerHTML=loungePanel();return;}
    if(active){inspector.innerHTML=roomPanel(active);return;}
    inspector.innerHTML=`<span class="eyebrow">COME ON IN</span><h2>Everyone's got a story.</h2><p>Explore your friends' spaces. Discover what they're into, leave them little letters, or step into your group's shared living room.</p><div class="divider"></div><span class="section-label">YOUR HOUSEMATES</span><div class="people">${Object.keys(people).map(id=>`<button class="person-tile" data-room="${id}"><span class="avatar-circle" style="background:${people[id].color}">${people[id].name[0]}</span><span><span class="who">${people[id].name}</span><br><span class="tiny">${people[id].tag}</span></span></button>`).join("")}</div><button class="btn primary block" data-room="lounge">🛋 Explore the group lounge ↗</button><div class="inset"><span class="section-label">THE IDEA</span><div style="height:9px"></div><strong style="font-size:15px">Your room tells your story. The lounge tells your story together.</strong><p style="margin-top:9px">The personal rooms are curated glimpses into each person's life. The shared lounge reveals the connections between them.</p></div><p class="small">Original artwork and sprites · All content is sample data · Interactions work without an account.</p>`;
  }
  function renderPlayer(){
    const target=document.querySelector("#active-player");if(!target)return;
    if(!active){target.innerHTML="";return;}
    target.innerHTML=char(active==="lounge"?"you":active,0,0,frame);
    target.setAttribute("transform",`translate(${player.x} ${player.y})`);
    const fixed=document.querySelector(`[data-room="${active}"] .character-bob`);
    if(fixed)fixed.setAttribute("opacity","0");
  }
  function step(now){
    let dt=Math.min((now-lastTime)/1000,.05);if(!lastTime)dt=0;lastTime=now;
    if(active){
      const r=specs[active];let dx=0,dy=0;
      if(keys.has("arrowleft")||keys.has("a"))dx--;
      if(keys.has("arrowright")||keys.has("d"))dx++;
      if(keys.has("arrowup")||keys.has("w"))dy--;
      if(keys.has("arrowdown")||keys.has("s"))dy++;
      const moving=dx!==0||dy!==0;
      if(moving){const scale=1/Math.max(1,Math.hypot(dx,dy));player.x=Math.min(r.x+r.w-72,Math.max(r.x+28,player.x+dx*dt*135*scale));player.y=Math.min(r.y+r.h-63,Math.max(r.y+87,player.y+dy*dt*92*scale));}
      animTime+=dt;
      const nextFrame=moving?Math.floor(animTime*7)%4:0;
      if(nextFrame!==frame||moving){frame=nextFrame;renderPlayer();}
    }
    requestAnimationFrame(step);
  }
  function openLetter(){
    if(!active||active==="lounge"||active==="you")return;
    document.querySelector("#letter-friend").textContent=people[active].name;
    document.querySelector("#letter-text").value="";
    dialog.showModal();
  }
  document.querySelector("#close-letter").addEventListener("click",()=>dialog.close());
  document.querySelector("#cancel-letter").addEventListener("click",()=>dialog.close());
  document.querySelector("#letter-form").addEventListener("submit",e=>{
    e.preventDefault();
    const v=document.querySelector("#letter-text").value.trim();if(!v||!active||active==="lounge")return;
    if(!Array.isArray(letters[active]))letters[active]=[];
    letters[active].push({text:v,date:Date.now()});writeLetters();dialog.close();tab="letter";renderSidebar();
  });
  document.querySelector("#help").addEventListener("click",()=>alert("Tap a room to zoom in. Tap illustrated books, posters or photos to explore. Use arrow keys or WASD to move your character. In the lounge, invite Maya and Jay to watch the space change. Letters stay in this browser only."));
  back.addEventListener("click",leave);
  world.addEventListener("click",e=>{
    const hit=e.target.closest("[data-object]");
    if(hit){
      const room=hit.getAttribute("data-room"),object=hit.getAttribute("data-object");
      if(room!==active)enter(room,object==="movies"?"movie":object==="gallery"?"photo":object==="books"?"books":"books");
      else if(object==="movies"){tab="movie";renderSidebar();}
      else if(object==="gallery"){tab="photo";renderSidebar();}
      else if(object==="books"){tab="books";renderSidebar();}
      else if(object==="memory"){renderSidebar();}
      return;
    }
    const room=e.target.closest("[data-room]");if(room)enter(room.getAttribute("data-room"));
  });
  inspector.addEventListener("click",e=>{
    const el=e.target.closest("button");if(!el)return;
    if(el.dataset.room){enter(el.dataset.room);return;}
    if(el.dataset.tab){tab=el.dataset.tab;renderSidebar();return;}
    if(el.dataset.action==="write-letter"){openLetter();return;}
    if(el.dataset.member){
      if(members.has(el.dataset.member))members.delete(el.dataset.member);else members.add(el.dataset.member);
      renderWorld();renderSidebar();
    }
  });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&!dialog.open&&active){leave();return;}
    if(dialog.open||/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName||""))return;
    const k=e.key.toLowerCase();
    if(["arrowleft","arrowright","arrowup","arrowdown","w","a","s","d"].includes(k)){if(active)e.preventDefault();keys.add(k);}
  });
  document.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur",()=>keys.clear());
  renderWorld();renderSidebar();requestAnimationFrame(step);
})();