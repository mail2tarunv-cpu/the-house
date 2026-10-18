(() => {
  'use strict';
  const scene = document.getElementById('house-scene');
  const roomTargets = document.getElementById('house-room-targets');
  const objectTargets = document.getElementById('object-targets');
  const headline = document.getElementById('headline');
  const subhead = document.getElementById('subhead');
  const eyebrow = document.getElementById('eyebrow');
  const back = document.getElementById('reset-top');
  const corner = document.getElementById('scene-corner');
  const hint = document.getElementById('scene-hint');
  const footer = document.getElementById('footer-status');
  const drawer = document.getElementById('inspect-drawer');
  const NS = 'http://www.w3.org/2000/svg';
  const original = {x:0,y:0,w:1672,h:941};
  const rooms = {
    reader:{title:"Maya's room",eyebrow:'01 / A ROOM OF HER OWN',subtitle:'A little library, a lot of stories.',view:{x:315,y:83,w:690,h:388},objects:[
      {id:'books',name:'The book wall',detail:'Every good book has a story behind why it belongs on her shelf. Soon, you’ll be able to see what Maya is reading and leave a recommendation.',x:554,y:246,label:'Books'},
      {id:'letter',name:'A little letter',detail:'Leave a thoughtful note for Maya. In the next build this desk becomes a place for letters and recommendations.',x:751,y:284,label:'Letter'}]},
    creative:{title:"Jay's room",eyebrow:'02 / A CREATIVE CORNER',subtitle:'Records, movie posters and a little chaos.',view:{x:771,y:93,w:690,h:388},objects:[
      {id:'records',name:'Record collection',detail:'Jay’s favorite albums and the stories attached to them. Imagine tapping a record to discover why it matters to him.',x:977,y:295,label:'Records'},
      {id:'movies',name:'Movie wall',detail:'A place for the films Jay loves and wants to share with you. No long feed to scroll through.',x:1103,y:223,label:'Movies'}]},
    lounge:{title:'The shared lounge',eyebrow:'03 / OUR SHARED STORIES',subtitle:'The things we remember together.',view:{x:315,y:357,w:1090,h:613},objects:[
      {id:'gallery',name:'Our photo wall',detail:'The lounge is where shared memories live. Later, the photos on this wall will change depending on which friends are present.',x:484,y:505,label:'Photos'},
      {id:'tv',name:'The TV corner',detail:'A shared watchlist and the films you keep recommending to each other. One little object, lots of possibilities.',x:467,y:628,label:'TV'}]}
  };
  const btns = [...document.querySelectorAll('[data-room-button]')];
  const resetButtons = [back];
  let active = null;
  let view = {...original};
  let animationToken = 0;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ease=(t)=>1-Math.pow(1-t,4);
  function viewTo(target){
    const start={...view};const nowToken=++animationToken;const startTime=performance.now();const duration=reduce.matches?0:860;
    const draw=(now)=>{if(nowToken!==animationToken)return;const p=duration?Math.min(1,(now-startTime)/duration):1;const t=ease(p);view={x:lerp(start.x,target.x,t),y:lerp(start.y,target.y,t),w:lerp(start.w,target.w,t),h:lerp(start.h,target.h,t)};scene.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);if(p<1)requestAnimationFrame(draw);};
    requestAnimationFrame(draw);
  }
  function addSVG(tag,attrs,parent){const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));parent.appendChild(e);return e;}
  function clearMarkers(){objectTargets.replaceChildren();}
  function markersFor(room){
    clearMarkers();
    for(const item of room.objects){
      const g=addSVG('g',{'class':'marker-wrap','role':'button','tabindex':'0','aria-label':`Explore ${item.name}`},objectTargets);
      addSVG('circle',{cx:item.x,cy:item.y,r:27,'class':'object-target'},g);
      addSVG('circle',{cx:item.x,cy:item.y,r:13,'class':'object-pulse'},g);
      addSVG('circle',{cx:item.x,cy:item.y,r:3,'class':'object-dot'},g);
      const tw=Math.max(60,item.label.length*9+23);
      addSVG('rect',{x:item.x-tw/2,y:item.y-54,width:tw,height:25,rx:10,'class':'object-label'},g);
      const label=addSVG('text',{x:item.x,y:item.y-37,'text-anchor':'middle','class':'label-text'},g);label.textContent=item.label;
      g.addEventListener('click',e=>{e.stopPropagation();inspect(item);});
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(item);}});
    }
  }
  function closeInspector(){drawer.hidden=true;}
  function inspect(item){document.getElementById('inspect-eyebrow').textContent=active==='lounge'?'OUR SHARED SPACE':'A LITTLE SOMETHING';document.getElementById('inspect-title').textContent=item.name;document.getElementById('inspect-description').textContent=item.detail;drawer.hidden=false;}
  function enter(id){if(!rooms[id])return;active=id;const r=rooms[id];closeInspector();headline.textContent=r.title;subhead.textContent=r.subtitle;eyebrow.textContent=r.eyebrow;corner.hidden=true;hint.hidden=false;roomTargets.hidden=true;objectTargets.hidden=false;back.hidden=false;document.body.classList.add('room-selected');btns.forEach(b=>b.setAttribute('aria-current',b.dataset.roomButton===id?'true':'false'));markersFor(r);footer.textContent=`${Object.keys(rooms).indexOf(id)+1} / 03 · ROOM VIEW`;viewTo(r.view);}
  function reset(){active=null;closeInspector();headline.textContent='A little world, just for your people.';subhead.textContent='A story in every room. Pick a door and step inside.';eyebrow.textContent='WELCOME HOME';corner.hidden=false;hint.hidden=true;roomTargets.hidden=false;objectTargets.hidden=true;back.hidden=true;document.body.classList.remove('room-selected');btns.forEach(b=>b.removeAttribute('aria-current'));footer.textContent='01 / 01 · HOUSE OVERVIEW';viewTo(original);}
  document.querySelectorAll('.room-hit').forEach(el=>{el.addEventListener('click',()=>enter(el.dataset.room));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();enter(el.dataset.room)}})});
  btns.forEach(btn=>btn.addEventListener('click',()=>{if(active===btn.dataset.roomButton)reset();else enter(btn.dataset.roomButton);}));
  resetButtons.forEach(btn=>btn.addEventListener('click',reset));
  document.getElementById('inspect-close').addEventListener('click',closeInspector);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!drawer.hidden)closeInspector();else if(active)reset();}});
  // Pointer-events on SVG hotspots remain aligned automatically with the same animated viewBox.
})();
