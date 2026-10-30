// ═══════════════════════════════════════════════
//  GENTLE PATH MINI GAME  —  v4
// ═══════════════════════════════════════════════
(function() {
  const canvas = document.getElementById('gpCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const LANE_W = W/3;
  const LANES = [LANE_W*0.5, LANE_W*1.5, LANE_W*2.5];
  const BASE_HR = 4, BONUS_HR = 8;

  // Use the embedding Squarespace site's current domain so this continues to
  // work after the custom domain is connected. The fallback supports testing
  // the game directly from GitHub Pages.
  const bookingUrl = (() => {
    try {
      if (document.referrer) {
        const referrer = new URL(document.referrer);
        if (referrer.protocol === 'https:' || referrer.protocol === 'http:') {
          return new URL('/contact', referrer.origin).href;
        }
      }
    } catch (error) {}
    return 'https://hexahedron-khaki-r73g.squarespace.com/contact';
  })();

  function openBooking() {
    window.open(bookingUrl, '_blank', 'noopener,noreferrer');
  }

  // ══ AUDIO ══════════════════════════════════════════════
  let audioCtx=null;
  function initAudio(){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();}catch(e){}}
  function getAudio(){return audioCtx;}
  function playTone(f,f2,type,vol,dur){try{const ac=getAudio();if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.type=type||'sine';o.connect(g);g.connect(ac.destination);o.frequency.setValueAtTime(f,ac.currentTime);if(f2)o.frequency.exponentialRampToValueAtTime(f2,ac.currentTime+dur*0.6);g.gain.setValueAtTime(vol||0.15,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);o.start();o.stop(ac.currentTime+dur);}catch(e){}}
  function playDing()    { playTone(880,1100,'sine',0.18,0.32); }
  function playBuzz()    { playTone(220,110,'sawtooth',0.14,0.22); }
  function playSlide()   { playTone(440,280,'sine',0.12,0.4); }
  function playReverse() { playTone(330,330,'square',0.08,0.15); }
  function playFlash()   { playTone(1200,800,'sine',0.2,0.18); }
  function playCeline()  { try{const ac=getAudio();[523,659,784].forEach((f,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.value=f;const t=ac.currentTime+i*0.1;g.gain.setValueAtTime(0.14,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.3);o.start(t);o.stop(t+0.3);});}catch(e){} }
  function playWin()     { try{const ac=getAudio();[523,659,784,1047].forEach((f,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.value=f;const t=ac.currentTime+i*0.13;g.gain.setValueAtTime(0.15,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.35);o.start(t);o.stop(t+0.35);});}catch(e){} }

  // ══ STAGE DATA (post-Céline progression) ═════════════
  const STAGES = [
    {id:'lplate', color:'#F5C400', annText:'L PLATE 🟨',      annSub:'Learning begins. Log those hours.',    hoursNeeded:0  },
    {id:'logbook',color:'#7FBCD2', annText:'📓 LOGBOOK',       annSub:'Hours ticking faster now!',            hoursNeeded:18 },
    {id:'p1',     color:'#CC2222', annText:'🔴 P1 PLATES!',    annSub:'75 hours logged. Provisional driver!', hoursNeeded:75 },
    {id:'p2',     color:'#2E8B3E', annText:'🟢 P2 PLATES!',    annSub:'1 year. Almost there!',            hoursNeeded:120},
    {id:'full',   color:'#7B6FB5', annText:'🏁 FULL LICENCE!', annSub:'You absolute legend.',                hoursNeeded:150},
  ];

  // ══ STATE ══════════════════════════════════════════════
  let gamePhase; // 'start' | 'playing' | 'win' | 'endless' | 'gameover'
  let frameId = null;

  // Player
  let lane, playerX, targetX, playerVX, moveCool, speed, roadOffset, lastTime;

  // Instructor
  let celineOnBoard, celineToken, celineTokenTimer;

  // Progression
  let mainStage, collectible, hours, hoursActive, logbookBonus;
  let nightShown;

  // Effects
  let obstacles, obsCool, particles, exhaustTrail, confetti;
  let shakeAmt, nightAlpha;
  let phoneReversed, phoneTimer, pudSlide, pudSlideLane, pudTimer;
  let camSlow, closeCooldown;

  // Win / Endless
  let winPhase, winY, winPanelA;
  let kmDriven, endlessLives, endlessHitCool;

  // UI
  let ann  = {text:'', subtext:'', color:'#F5C400', timer:0, max:160};
  let toastQueue = [];
  let keys = {}, spawnTimer = null;

  function showAnn(text, subtext, color, dur) {
    ann = {text, subtext:subtext||'', color:color||'#F5C400', timer:dur||160, max:dur||160};
  }
  function showToast(msg, dur) { toastQueue.push({msg, timer:dur||70}); if(toastQueue.length>3) toastQueue.shift(); }

  function reset() {
    gamePhase = 'playing';
    lane=1; playerX=LANES[1]; targetX=LANES[1]; playerVX=0;
    moveCool=0; speed=2.8; roadOffset=0; lastTime=0;
    celineOnBoard=false; celineToken=null; celineTokenTimer=0;
    mainStage=0; collectible=null;
    hours=0; hoursActive=false; logbookBonus=false; nightShown=false;
    obstacles=[]; obsCool=2.67;
    particles=[]; exhaustTrail=[]; confetti=[];
    shakeAmt=0; nightAlpha=0;
    phoneReversed=false; phoneTimer=0;
    pudSlide=false; pudSlideLane=1; pudTimer=0;
    camSlow=0; closeCooldown=0;
    winPhase=0; winY=0; winPanelA=0;
    kmDriven=0; endlessLives=3; endlessHitCool=0;
    ann={text:'',subtext:'',color:'#F5C400',timer:0,max:160};
    toastQueue=[];
    clearTimeout(spawnTimer);
  }

  // ══ ROAD ═══════════════════════════════════════════════
  function drawRoad() {
    ctx.fillStyle='#26352e'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#1b2621';
    ctx.fillRect(0,0,18,H); ctx.fillRect(W-18,0,18,H);
    for(let y=(roadOffset%40)-40;y<H+40;y+=40){
      ctx.fillStyle=(Math.floor((y+roadOffset)/40)%2===0)?'#CC2222':'#fff';
      ctx.fillRect(0,y,18,20); ctx.fillRect(W-18,y,18,20);
    }
    ctx.save();
    ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=3;
    ctx.setLineDash([36,28]); ctx.lineDashOffset=-(roadOffset%64);
    for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(LANE_W*i,0);ctx.lineTo(LANE_W*i,H);ctx.stroke();}
    ctx.restore();
  }

  // ══ NIGHT OVERLAY ══════════════════════════════════════
  function drawNight() {
    if(nightAlpha<=0) return;
    const dg=ctx.createRadialGradient(playerX,H-100,45,playerX,H-100,H*0.75);
    dg.addColorStop(0,'transparent'); dg.addColorStop(1,`rgba(0,0,15,${nightAlpha*0.9})`);
    ctx.fillStyle=dg; ctx.fillRect(0,0,W,H);
    const bg=ctx.createRadialGradient(playerX,H-120,6,playerX,H-120,230);
    bg.addColorStop(0,`rgba(255,255,200,${nightAlpha*0.22})`);
    bg.addColorStop(0.5,`rgba(255,255,180,${nightAlpha*0.07})`);
    bg.addColorStop(1,'transparent');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  }

  // ══ VEHICLES ═══════════════════════════════════════════
  function vehicleType() {
    if(gamePhase==='endless'||mainStage>=5) return 'f1';
    if(mainStage>=4) return 'sedan';
    if(mainStage>=3) return 'sportyhatch';
    if(mainStage>=2) return 'ute';
    return 'hatchback';
  }

  function drawPlate(h) {
    if(mainStage<1) return;
    let pc=mainStage>=4?'#2E8B3E':mainStage>=3?'#CC2222':'#F5C400';
    let pt=mainStage>=3?'P':'L';
    ctx.fillStyle=pc;
    ctx.beginPath(); ctx.roundRect(-10,h/2-13,20,10,[2]); ctx.fill();
    ctx.fillStyle=pt==='L'?'#000':'#fff';
    ctx.font='bold 8px Nunito,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(pt,0,h/2-8);
  }

  function drawInstructor(w,h) {
    if(!celineOnBoard) return;
    ctx.font='10px sans-serif'; ctx.textBaseline='middle';
    ctx.fillText('👩‍⚕️', w/2-10, -h/2+9);
  }

  function drawHatchback(x,y) {
    ctx.save(); ctx.translate(x,y);
    const w=36,h=58;
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0,h/2+4,w/2+4,6,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#E8E4C8'; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,[4]); ctx.fill();
    ctx.fillStyle='#C4C0A8'; ctx.beginPath(); ctx.roundRect(-w/2+3,-h/2+10,w-6,h*0.4,[3]); ctx.fill();
    ctx.fillStyle='rgba(160,215,245,0.65)'; ctx.fillRect(-w/2+5,-h/2+12,w-10,12);
    ctx.fillStyle='#FFE566';
    ctx.beginPath(); ctx.arc(-w/2+8,-h/2+4,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w/2-8,-h/2+4,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#FF5555'; ctx.fillRect(-w/2+3,h/2-6,6,4); ctx.fillRect(w/2-9,h/2-6,6,4);
    drawPlate(h); drawInstructor(w,h); ctx.restore();
  }

  function drawUte(x,y) {
    ctx.save(); ctx.translate(x,y);
    const w=42,h=66;
    ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0,h/2+5,w/2+6,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#8A7E64'; ctx.beginPath(); ctx.roundRect(-w/2+1,4,w-2,h/2-2,[2,2,5,5]); ctx.fill();
    ctx.fillStyle='#7A6E54'; ctx.fillRect(-w/2+4,7,w-8,h/2-8);
    ctx.fillStyle='#C8B87C'; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h/2+10,[5,5,3,3]); ctx.fill();
    ctx.fillStyle='#B0A06C'; ctx.beginPath(); ctx.roundRect(-w/2+3,-h/2+3,w-6,h*0.28,[4]); ctx.fill();
    ctx.fillStyle='rgba(160,215,245,0.65)'; ctx.fillRect(-w/2+6,-h/2+5,w-12,14);
    [[-w/2+8,-h/2+5],[w/2-8,-h/2+5]].forEach(([hx,hy])=>{
      ctx.fillStyle='#999'; ctx.beginPath(); ctx.arc(hx,hy,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#FFE566'; ctx.beginPath(); ctx.arc(hx,hy,3.5,0,Math.PI*2); ctx.fill();
    });
    ctx.fillStyle='#888870'; ctx.fillRect(-w/2-1,-h/2-2,w+2,5);
    [[-w/2-1,-h/2+18],[w/2-5,-h/2+18],[-w/2-1,h/2-16],[w/2-5,h/2-16]].forEach(([wx,wy])=>{
      ctx.fillStyle='#1A1A1A'; ctx.beginPath(); ctx.ellipse(wx+5,wy,8,10,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#555'; ctx.lineWidth=2; ctx.stroke();
    });
    drawPlate(h); drawInstructor(w,h); ctx.restore();
  }

  function drawSportyHatch(x,y) {
    ctx.save(); ctx.translate(x,y);
    const w=36,h=60;
    ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0,h/2+4,w/2+5,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#CC2222'; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,[4]); ctx.fill();
    ctx.fillStyle='#991111';
    ctx.beginPath(); ctx.moveTo(-w/2+4,-h/2+8); ctx.lineTo(w/2-4,-h/2+8); ctx.lineTo(w/2-5,-h/2+30); ctx.lineTo(-w/2+5,-h/2+30); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(160,215,245,0.7)';
    ctx.beginPath(); ctx.moveTo(-w/2+6,-h/2+9); ctx.lineTo(w/2-6,-h/2+9); ctx.lineTo(w/2-7,-h/2+29); ctx.lineTo(-w/2+7,-h/2+29); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(-w/2,h/2-22,w,4);
    ctx.fillStyle='#770000'; ctx.fillRect(-w/2-2,h/2-10,w+4,4);
    ctx.fillStyle='#FFE566';
    ctx.beginPath(); ctx.moveTo(-w/2+2,-h/2+2); ctx.lineTo(-w/2+13,-h/2+2); ctx.lineTo(-w/2+11,-h/2+7); ctx.lineTo(-w/2+2,-h/2+7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w/2-2,-h/2+2); ctx.lineTo(w/2-13,-h/2+2); ctx.lineTo(w/2-11,-h/2+7); ctx.lineTo(w/2-2,-h/2+7); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#FF2222'; ctx.fillRect(-w/2+2,h/2-6,8,3); ctx.fillRect(w/2-10,h/2-6,8,3);
    drawPlate(h); drawInstructor(w,h); ctx.restore();
  }

  function drawSedan(x,y) {
    ctx.save(); ctx.translate(x,y);
    const w=38,h=62;
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0,h/2+4,w/2+5,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2A5FA8'; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,[6]); ctx.fill();
    ctx.fillStyle='#1E4A8A'; ctx.beginPath(); ctx.roundRect(-w/2+4,-h/2+12,w-8,h*0.36,[8]); ctx.fill();
    ctx.fillStyle='rgba(160,215,245,0.7)'; ctx.beginPath(); ctx.roundRect(-w/2+6,-h/2+14,w-12,13,[4]); ctx.fill();
    ctx.fillStyle='#FFFFFF'; ctx.fillRect(-w/2+3,-h/2+2,8,3); ctx.fillRect(w/2-11,-h/2+2,8,3);
    ctx.fillStyle='#88CCFF';
    ctx.beginPath(); ctx.arc(-w/2+10,-h/2+5,2.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w/2-10,-h/2+5,2.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#FF2222'; ctx.fillRect(-w/2+3,h/2-6,8,3); ctx.fillRect(w/2-11,h/2-6,8,3);
    drawPlate(h); drawInstructor(w,h); ctx.restore();
  }

  function drawF1(x,y) {
    ctx.save(); ctx.translate(x,y);
    const w=34,h=70;
    ctx.fillStyle='rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(0,h/2+3,w/2+12,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#6458A0';
    ctx.beginPath(); ctx.roundRect(-w/2-11,-h/2+26,13,22,[3]); ctx.fill();
    ctx.beginPath(); ctx.roundRect(w/2-2,-h/2+26,13,22,[3]); ctx.fill();
    ctx.fillStyle='#5A518A';
    ctx.beginPath(); ctx.roundRect(-w/2-10,-h/2-2,w+20,8,[2]); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-w/2-8,h/2-7,w+16,6,[2]); ctx.fill();
    ctx.fillStyle='#9B8FD5';
    ctx.beginPath(); ctx.moveTo(-7,-h/2-10); ctx.lineTo(7,-h/2-10); ctx.lineTo(11,-h/2+4); ctx.lineTo(-11,-h/2+4); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#7B6FB5'; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,[5]); ctx.fill();
    ctx.fillStyle='#2A1845'; ctx.beginPath(); ctx.ellipse(0,-h/2+26,10,14,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#F5C400'; ctx.beginPath(); ctx.arc(0,-h/2+18,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(-6,-h/2+16,12,4);
    [[-w/2-9,-h/2+14],[w/2+2,-h/2+14],[-w/2-9,h/2-14],[w/2+2,h/2-14]].forEach(([wx,wy])=>{
      ctx.fillStyle='#1A1A1A'; ctx.beginPath(); ctx.ellipse(wx+4,wy,6,8,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#444'; ctx.lineWidth=1.5; ctx.stroke();
    });
    ctx.restore();
  }

  function drawVehicle(x,y) {
    switch(vehicleType()){
      case 'hatchback':   drawHatchback(x,y);   break;
      case 'ute':         drawUte(x,y);          break;
      case 'sportyhatch': drawSportyHatch(x,y);  break;
      case 'sedan':       drawSedan(x,y);        break;
      default:            drawF1(x,y);           break;
    }
  }

  // ══ CÉLINE TOKEN ═════════════════════════════════════════
  function drawCelineToken(tok) {
    ctx.save(); ctx.translate(tok.x,tok.y);
    const pulse=0.65+Math.sin(Date.now()/280)*0.35;
    const g=ctx.createRadialGradient(0,0,4,0,0,36);
    g.addColorStop(0,`rgba(184,178,216,${0.55*pulse})`); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fillRect(-38,-38,76,76);
    ctx.fillStyle='#B8B2D8'; ctx.beginPath(); ctx.arc(0,0,23,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=2.5; ctx.stroke();
    ctx.font='15px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('👩‍⚕️',0,-3);
    ctx.fillStyle='white'; ctx.font='bold 7.5px Nunito,sans-serif'; ctx.fillText('Céline',0,12);
    ctx.restore();
  }

  // ══ MAIN COLLECTIBLE ════════════════════════════════════
  function canSpawn() {
    return celineOnBoard && mainStage<STAGES.length && hours>=STAGES[mainStage].hoursNeeded;
  }
  function spawnCollectible() {
    clearTimeout(spawnTimer);
    if(!canSpawn()){ return; }
    const l=Math.floor(Math.random()*3);
    collectible={x:LANES[l],y:-36,lane:l,stage:mainStage,color:STAGES[mainStage].color};
  }
  function drawCollectible(c) {
    ctx.save(); ctx.translate(c.x,c.y);
    const g=ctx.createRadialGradient(0,0,4,0,0,30); g.addColorStop(0,c.color+'66'); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fillRect(-32,-32,64,64);
    ctx.fillStyle=c.color; ctx.beginPath(); ctx.arc(0,0,23,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=2.5; ctx.stroke();
    ctx.textAlign='center'; ctx.textBaseline='middle';
    switch(c.stage){
      case 0: ctx.fillStyle='#000'; ctx.font='bold 17px Nunito,sans-serif'; ctx.fillText('L',0,1); break;
      case 1: ctx.font='18px sans-serif'; ctx.fillText('📓',0,1); break;
      case 2: case 3: ctx.fillStyle='white'; ctx.font='bold 17px Nunito,sans-serif'; ctx.fillText('P',0,1); break;
      default: ctx.font='18px sans-serif'; ctx.fillText('🏁',0,1); break;
    }
    ctx.restore();
  }

  // ══ OBSTACLES ═══════════════════════════════════════════
  const OBS_TYPES=['cone','puddle','camera','cone','puddle','camera','cone','puddle','camera','cone','puddle','phone'];
  function spawnObstacle() {
    const blocked=celineToken?celineToken.lane:(collectible?collectible.lane:-1);
    // Find lanes occupied by obstacles near the top (within 120px) to avoid unavoidable rows
    const nearTop=obstacles.filter(o=>o.y>-140&&o.y<60).map(o=>Math.round(o.x/LANE_W-0.5));
    const openLanes=[0,1,2].filter(ln=>ln!==blocked&&!nearTop.includes(ln));
    let l;
    if(openLanes.length>0){l=openLanes[Math.floor(Math.random()*openLanes.length)];}
    else{let t=0;do{l=Math.floor(Math.random()*3);t++;}while(l===blocked&&t<8);}
    obstacles.push({x:LANES[l],y:-20,type:OBS_TYPES[Math.floor(Math.random()*OBS_TYPES.length)]});
  }
  function drawObstacle(o) {
    ctx.save(); ctx.translate(o.x,o.y);
    switch(o.type){
      case 'cone':
        ctx.fillStyle='#FF6B00';
        ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(12,12); ctx.lineTo(-12,12); ctx.closePath(); ctx.fill();
        ctx.fillStyle='white'; ctx.fillRect(-8,-2,16,4); ctx.fillStyle='#444'; ctx.fillRect(-13,12,26,6);
        break;
      case 'puddle':
        ctx.fillStyle='rgba(80,140,200,0.55)';
        ctx.beginPath(); ctx.ellipse(0,0,25,12,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(150,200,255,0.4)'; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle='rgba(200,230,255,0.3)';
        ctx.beginPath(); ctx.ellipse(-5,-2,9,4,0.3,0,Math.PI*2); ctx.fill();
        break;
      case 'phone':
        ctx.fillStyle='#1A1A1A'; ctx.beginPath(); ctx.roundRect(-8,-14,16,28,[3]); ctx.fill();
        ctx.fillStyle='#3366FF'; ctx.beginPath(); ctx.roundRect(-6,-12,12,22,[2]); ctx.fill();
        ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('📱',0,-1);
        ctx.fillStyle='#FF3333'; ctx.beginPath(); ctx.arc(6,-12,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='white'; ctx.font='bold 6px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('!',6,-12);
        break;
      case 'camera':
        ctx.fillStyle='#555'; ctx.beginPath(); ctx.roundRect(-14,-10,28,20,[3]); ctx.fill();
        ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(0,0,7,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#88CCFF'; ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
        if(Math.floor(Date.now()/600)%2===0){ctx.fillStyle='#FFD700';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚡',14,-8);}
        break;
    }
    ctx.restore();
  }
  function applyObstacle(type) {
    switch(type){
      case 'puddle':
        const dir=lane===0?1:(lane===2?-1:(Math.random()<0.5?-1:1));
        const nl=Math.max(0,Math.min(2,lane+dir));
        pudSlide=true; pudSlideLane=nl; pudTimer=0.70;
        showAnn('💦 SLIPPERY!','Forced lane slide, hang on!','#7FBCD2',110);
        shakeAmt=3; playSlide(); break;
      case 'phone':
        phoneReversed=true; phoneTimer=4.0;
        showAnn('📱 CONTROLS REVERSED!','Left is right. Right is left. Eyes on the road!','#FF6666',130);
        shakeAmt=4; playReverse(); break;
      case 'camera':
        camSlow=2.83;
        showAnn('📸 SPEED CAMERA!','You got a fine 💸 slow down...','#FFD700',140);
        shakeAmt=5; playFlash(); break;
      default:
        showAnn('🚧 CONE!','Watch the road!','#FF8833',90);
        shakeAmt=5; playBuzz(); break;
    }
  }

  // ══ PARTICLES ════════════════════════════════════════════
  function spawnParticles(x,y,color) {
    for(let i=0;i<20;i++){
      const a=Math.random()*Math.PI*2,s=Math.random()*4+1.5;
      particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,decay:Math.random()*0.04+0.025,size:Math.random()*5+2,color});
    }
  }
  function updateDrawParticles() {
    particles=particles.filter(p=>p.life>0);
    particles.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.12; p.life-=p.decay;
      ctx.save(); ctx.globalAlpha=Math.max(0,p.life);
      ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0,p.size*p.life),0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  // ══ EXHAUST ══════════════════════════════════════════════
  function updateExhaust(x,y) {
    exhaustTrail.push({x:x+(Math.random()-0.5)*8,y:y+38,life:1,size:Math.random()*7+3});
    exhaustTrail=exhaustTrail.filter(e=>e.life>0);
    exhaustTrail.forEach(e=>{
      e.y+=2; e.life-=0.06; e.size*=0.97;
      ctx.save(); ctx.globalAlpha=Math.max(0,e.life)*0.35;
      ctx.fillStyle='#AAA0CC';
      ctx.beginPath(); ctx.arc(e.x,e.y,Math.max(0,e.size),0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  // ══ CONFETTI ═════════════════════════════════════════════
  const CC=['#F5C400','#7B6FB5','#2E8B3E','#CC2222','#B8B2D8','#fff'];
  function spawnConfetti(){confetti=[];for(let i=0;i<70;i++)confetti.push({x:Math.random()*W,y:Math.random()*H-H,vx:(Math.random()-.5)*2.2,vy:Math.random()*2+1.2,r:Math.random()*Math.PI*2,vr:(Math.random()-.5)*0.08,size:Math.random()*9+4,color:CC[Math.floor(Math.random()*CC.length)]});}
  function updateConfetti(){confetti.forEach(c=>{c.x+=c.vx;c.y+=c.vy;c.r+=c.vr;if(c.y>H+10){c.y=-10;c.x=Math.random()*W;}});}

  // ══ HUD ══════════════════════════════════════════════════
  function drawHUD() {
    const tot=STAGES.length, ox=W/2-tot*14;
    for(let i=0;i<tot;i++){
      ctx.beginPath(); ctx.arc(ox+i*28,24,9,0,Math.PI*2);
      ctx.fillStyle=i<mainStage?'#F5C400':(i===mainStage&&celineOnBoard?'#B8B2D8':'rgba(255,255,255,0.13)');
      ctx.fill();
      if(i<mainStage){ctx.fillStyle='#1E1530';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✓',ox+i*28,24);}
    }
    // Hours bar — always show when hoursActive
    if(hoursActive){
      const goalStage=STAGES.slice(mainStage).find(s=>s.hoursNeeded>0);
      const goal=goalStage?goalStage.hoursNeeded:150;
      const pct=Math.min(1,hours/goal);
      const bx=W/2-78,by=40,bw=156,bh=9;
      ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,[4]); ctx.fill();
      ctx.fillStyle='#F5C400';
      ctx.beginPath(); ctx.roundRect(bx,by,bw*pct,bh,[4]); ctx.fill();

      ctx.fillStyle='rgba(255,255,255,0.65)'; ctx.font='bold 10px Nunito,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(`${Math.floor(hours)} / ${goal} hrs`,W/2,by+bh/2);
    }
    // Phone reversed badge
    if(phoneReversed){
      ctx.fillStyle='rgba(220,40,40,0.92)'; ctx.beginPath(); ctx.roundRect(W-78,8,70,24,[12]); ctx.fill();
      ctx.fillStyle='white'; ctx.font='bold 10px Nunito,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('⇄ REVERSED',W-43,20);
    }
    // Endless
    if(gamePhase==='endless'){
      ctx.fillStyle='#F5C400'; ctx.font='bold 17px Nunito,sans-serif'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(`${Math.floor(kmDriven)} km`,8,20);
      ctx.textAlign='right'; ctx.font='13px sans-serif';
      let h=''; for(let i=0;i<3;i++)h+=(i<endlessLives)?'❤️':'🖤';
      ctx.fillText(h,W-6,20);
    }
  }

  // ══ TOAST QUEUE ══════════════════════════════════════════
  function drawToast(dt) {
    toastQueue=toastQueue.filter(t=>t.timer>0);
    toastQueue.forEach((t,i)=>{
      const a=Math.min(1,t.timer/20);
      const yOff=(toastQueue.length-1-i)*62;
      ctx.save(); ctx.globalAlpha=a;
      ctx.fillStyle='rgba(38,53,46,0.96)'; ctx.beginPath(); ctx.roundRect(W/2-158,H-96-yOff,316,58,[14]); ctx.fill();
      ctx.fillStyle='white'; ctx.font='bold 16px Nunito,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      wrapText(ctx,t.msg,W/2,H-74-yOff,290,20);
      ctx.restore();
      t.timer-=dt*60;
    });
  }

  // ══ ANNOUNCEMENT ═════════════════════════════════════════
  function drawAnnouncement(dt) {
    if(!ann||ann.timer<=0) return;
    const fadeIn=Math.min(1,(ann.max-ann.timer)/12);
    const fadeOut=Math.min(1,ann.timer/18);
    const alpha=Math.min(fadeIn,fadeOut);
    ctx.save(); ctx.globalAlpha=Math.max(0,alpha);
    const pw=316,ph=ann.subtext?94:68,cy=64+ph/2;
    ctx.fillStyle='rgba(38,53,46,0.93)'; ctx.beginPath(); ctx.roundRect(W/2-pw/2,cy-ph/2,pw,ph,[16]); ctx.fill();
    ctx.strokeStyle=ann.color; ctx.lineWidth=2.5; ctx.beginPath(); ctx.roundRect(W/2-pw/2,cy-ph/2,pw,ph,[16]); ctx.stroke();
    ctx.fillStyle=ann.color; ctx.beginPath(); ctx.roundRect(W/2-pw/2,cy-ph/2,pw,5,[16,16,0,0]); ctx.fill();
    ctx.fillStyle=ann.color; ctx.font='bold 20px Nunito,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    wrapText(ctx,ann.text,W/2,ann.subtext?cy-16:cy,290,26);
    if(ann.subtext){
      ctx.fillStyle='rgba(250,246,238,0.85)'; ctx.font='13px Nunito,sans-serif';
      wrapText(ctx,ann.subtext,W/2,cy+16,280,18);
    }
    ctx.restore(); ann.timer-=dt*60;
  }


  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let lineY = y;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line.trim(), x, lineY);
        line = words[i] + ' ';
        lineY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, lineY);
    return lineY;
  }

  // ══ SCREENS ══════════════════════════════════════════════
  function drawStart() {
    ctx.fillStyle='rgba(38,53,46,0.94)'; ctx.fillRect(0,0,W,H);
    ctx.font='44px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🚗',W/2,H/2-144);
    ctx.fillStyle='#d1bd6d'; ctx.font='bold 26px Cormorant Garamond,serif';
    ctx.fillText('Your Driving Journey',W/2,H/2-100);
    ctx.fillStyle='rgba(250,246,238,0.72)'; ctx.font='14px Nunito,sans-serif';
    const copyBottom=wrapText(ctx,'Pick up Celine, earn your L and P plates and become a Gentle Path Driving Star!',W/2,H/2-64,316,20);
    ctx.font='13px Nunito,sans-serif';
    wrapText(ctx,'Use keyboard arrows < and > to drive, or tap left / right on mobile',W/2,copyBottom+26,316,18);
    ctx.fillStyle='#d1bd6d'; ctx.beginPath(); ctx.roundRect(W/2-84,H/2+30,168,48,[24]); ctx.fill();
    ctx.fillStyle='#26352e'; ctx.font='bold 18px Nunito,sans-serif'; ctx.fillText('Let’s go',W/2,H/2+54);
  }

  function drawWin(dt) {
    updateConfetti();
    confetti.forEach(c=>{ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.r);ctx.fillStyle=c.color;ctx.globalAlpha=0.85;ctx.fillRect(-c.size/2,-c.size*0.3,c.size,c.size*0.6);ctx.restore();});
    if(winPhase===0){
      winY-=660*dt; updateExhaust(playerX,winY); drawF1(playerX,winY);
      if(winY<-90){winPhase=1;exhaustTrail=[];}
    } else {
      winPanelA=Math.min(1,winPanelA+dt*2.4);
      ctx.save(); ctx.globalAlpha=winPanelA;
      ctx.fillStyle='rgba(38,53,46,0.94)'; ctx.beginPath(); ctx.roundRect(W/2-158,H/2-140,316,286,[18]); ctx.fill();
      ctx.strokeStyle='#7B6FB5'; ctx.lineWidth=2; ctx.stroke();
      ctx.font='34px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🏆',W/2,H/2-104);
      ctx.fillStyle='#F5C400'; ctx.font='bold 25px Cormorant Garamond,serif'; ctx.fillText('Licence Earned!',W/2,H/2-68);
      ctx.fillStyle='rgba(250,246,238,0.65)'; ctx.font='14px Nunito,sans-serif'; ctx.fillText('Now for the real thing.',W/2,H/2-44);
      ctx.fillStyle='#7B6FB5'; ctx.beginPath(); ctx.roundRect(W/2-112,H/2-28,224,46,[23]); ctx.fill();
      ctx.fillStyle='white'; ctx.font='bold 15px Nunito,sans-serif'; ctx.fillText('Book a Real Lesson →',W/2,H/2-5);
      ctx.fillStyle='rgba(245,196,0,0.18)'; ctx.beginPath(); ctx.roundRect(W/2-102,H/2+30,204,42,[21]); ctx.fill();
      ctx.strokeStyle='rgba(245,196,0,0.5)'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle='#F5C400'; ctx.font='bold 14px Nunito,sans-serif'; ctx.fillText('🏁  Endless Mode',W/2,H/2+51);
      ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.roundRect(W/2-62,H/2+86,124,34,[17]); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='13px Nunito,sans-serif'; ctx.fillText('Play again',W/2,H/2+103);
      ctx.restore();
    }
  }

  function drawGameOver() {
    ctx.fillStyle='rgba(38,53,46,0.96)'; ctx.fillRect(0,0,W,H);
    ctx.font='38px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('💥',W/2,H/2-90);
    ctx.fillStyle='#CC2222'; ctx.font='bold 25px Cormorant Garamond,serif'; ctx.fillText('Game Over',W/2,H/2-54);
    ctx.fillStyle='#F5C400'; ctx.font='bold 34px Nunito,sans-serif'; ctx.fillText(`${Math.floor(kmDriven)} km`,W/2,H/2-12);
    ctx.fillStyle='rgba(250,246,238,0.6)'; ctx.font='14px Nunito,sans-serif'; ctx.fillText('driven in Endless Mode',W/2,H/2+16);
    ctx.fillStyle='#7B6FB5'; ctx.beginPath(); ctx.roundRect(W/2-112,H/2+36,224,46,[23]); ctx.fill();
    ctx.fillStyle='white'; ctx.font='bold 15px Nunito,sans-serif'; ctx.fillText('Book a Real Lesson →',W/2,H/2+59);
    ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.roundRect(W/2-62,H/2+96,124,34,[17]); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='13px Nunito,sans-serif'; ctx.fillText('Try again',W/2,H/2+113);
  }

  // ══ MAIN LOOP ═════════════════════════════════════════════
  function loop(timestamp) {
    const dt=lastTime?Math.min((timestamp-lastTime)/1000,0.1):0.016;
    lastTime=timestamp;

    const isPlaying=gamePhase==='playing';
    const isEndless=gamePhase==='endless';

    // Hours
    if(hoursActive&&isPlaying){
      const rate=logbookBonus?BONUS_HR:BASE_HR;
      hours+=rate*dt;
    }

    // Night
    if(isPlaying&&mainStage>=3) nightAlpha=Math.min(0.82,nightAlpha+0.004);
    else nightAlpha=Math.max(0,nightAlpha-0.005);

    // Night announcement (once)
    if(isPlaying&&mainStage>=3&&!nightShown&&nightAlpha>0.1){
      nightShown=true;
      showAnn('🌙 NIGHT DRIVING','Visibility reduced. 15 night hours required!','#7B6FB5',170);
    }

    // Endless km
    if(isEndless) kmDriven+=speed*dt*0.055;

    // Shake
    let sx=0,sy=0;
    if(shakeAmt>0){sx=(Math.random()-.5)*shakeAmt*2;sy=(Math.random()-.5)*shakeAmt*2;shakeAmt=Math.max(0,shakeAmt-0.7);}
    ctx.save(); ctx.translate(sx,sy);
    ctx.clearRect(-10,-10,W+20,H+20);
    drawRoad();

    if(gamePhase==='start')    {drawVehicle(LANES[1],H-100);drawStart();drawAnnouncement(dt);ctx.restore();frameId=requestAnimationFrame(loop);return;}
    if(gamePhase==='win')      {drawWin(dt);drawAnnouncement(dt);ctx.restore();frameId=requestAnimationFrame(loop);return;}
    if(gamePhase==='gameover') {drawGameOver();ctx.restore();frameId=requestAnimationFrame(loop);return;}

    // ── SPEED ──
    speed=isEndless?Math.min(9,3.5+kmDriven*0.012):Math.min(5.8,2.8+mainStage*0.38);
    const effSpd=camSlow>0?speed*0.35:speed;
    roadOffset+=effSpd*dt*60;
    if(camSlow>0) camSlow-=dt;

    // ── TIMERS ──
    if(phoneTimer>0){phoneTimer-=dt;if(phoneTimer<=0){phoneReversed=false;showToast('✅ Controls back to normal!',60);}}
    if(pudSlide){pudTimer-=dt;lane=pudSlideLane;targetX=LANES[lane];if(pudTimer<=0)pudSlide=false;}

    // ── MOVEMENT (spring system for smoothness) ──
    if(moveCool>0) moveCool--;
    if(!pudSlide){
      const gl=keys.ArrowLeft||keys.a||keys.A;
      const gr=keys.ArrowRight||keys.d||keys.D;
      const ml=phoneReversed?gr:gl;
      const mr=phoneReversed?gl:gr;
      if(ml&&lane>0&&moveCool<=0){lane--;targetX=LANES[lane];moveCool=13;playerVX=0;}
      if(mr&&lane<2&&moveCool<=0){lane++;targetX=LANES[lane];moveCool=13;playerVX=0;}
    }
    playerX+=(targetX-playerX)*0.2;

    // ── CÉLINE PICKUP ──
    if(!celineOnBoard){
      if(celineTokenTimer>0) celineTokenTimer-=dt;
      else if(!celineToken){
        const l=Math.random()<0.5?0:2;
        celineToken={x:LANES[l],y:-36,lane:l,spd:effSpd+3.8};
      }
    }
    if(celineToken){
      celineToken.y+=celineToken.spd*dt*60;
      if(Math.abs(celineToken.x-playerX)<30&&Math.abs(celineToken.y-(H-100))<42){
        celineOnBoard=true; celineToken=null; hoursActive=true;
        spawnParticles(playerX,H-100,'#B8B2D8');
        playCeline();
        showAnn('👩‍⚕️ CÉLINE ON BOARD!','Hi, welcome to Gentle Path. Let\'s make progress.','#B8B2D8',180);
        spawnCollectible();
      } else if(celineToken.y>H+40){
        celineToken=null; celineTokenTimer=4.17;
      }
    }

    // ── MAIN COLLECTIBLES ──
    if(celineOnBoard&&!collectible&&mainStage<STAGES.length&&canSpawn()) spawnCollectible();
    if(collectible){
      collectible.y+=(effSpd+2)*dt*60;
      if(Math.abs(collectible.x-playerX)<30&&Math.abs(collectible.y-(H-100))<42){
        const s=STAGES[mainStage];
        showAnn(s.annText,s.annSub,s.color,170);
        spawnParticles(playerX,H-100,s.color); playDing();
        if(mainStage===1) logbookBonus=true;
        mainStage++; collectible=null;
        if(mainStage>=STAGES.length){
          winPhase=0; winY=H-100; gamePhase='win'; spawnConfetti(); playWin();
        } else {
          spawnCollectible();
        }
      } else if(collectible.y>H+40){
        collectible.y=-36; collectible.x=LANES[Math.floor(Math.random()*3)];
      }
    }

    // ── OBSTACLES ──
    const coolBase=isEndless?Math.max(0.30,0.92-kmDriven*0.005):Math.max(0.7,2.5-mainStage*0.23);
    obsCool-=dt;
    if(obsCool<=0&&(celineOnBoard||isEndless)){
      spawnObstacle(); obsCool=coolBase+Math.random()*0.92;
    }
    obstacles.forEach(o=>o.y+=(effSpd+0.8)*dt*60);
    obstacles=obstacles.filter(o=>o.y<H+30);
    if(endlessHitCool>0) endlessHitCool-=dt;
    for(let i=obstacles.length-1;i>=0;i--){
      const o=obstacles[i];
      const hw=o.type==='puddle'?32:o.type==='phone'?14:22;
      const hh=o.type==='puddle'?14:o.type==='phone'?28:24;
      if(Math.abs(o.x-playerX)<hw&&Math.abs(o.y-(H-100))<hh){
        if(isEndless){if(endlessHitCool<=0){endlessLives--;endlessHitCool=1.33;applyObstacle(o.type);if(endlessLives<=0)gamePhase='gameover';}}
        else applyObstacle(o.type);
        obstacles.splice(i,1);
      }
    }

    // Close call
    if(closeCooldown>0) closeCooldown-=dt;
    if(closeCooldown<=0){
      for(const o of obstacles){
        if(Math.abs(o.x-playerX)<44&&Math.abs(o.x-playerX)>26&&Math.abs(o.y-(H-100))<36){
          if(o.type==='phone'){showToast('📱 Watch out, controls will swap!',80);}
          else{showToast('😅 Close call! +speed boost',55);speed=Math.min(speed+0.5,isEndless?9:6);}
          closeCooldown=1.5; break;
        }
      }
    }

    // ── DRAW ──
    updateDrawParticles();
    if(celineToken) drawCelineToken(celineToken);
    if(collectible) drawCollectible(collectible);
    obstacles.forEach(drawObstacle);
    drawVehicle(playerX,H-100);
    drawNight();
    drawHUD();
    drawToast(dt);
    drawAnnouncement(dt);

    ctx.restore();
    frameId=requestAnimationFrame(loop);
  }

  // ══ INPUT ════════════════════════════════════════════════
  document.addEventListener('keydown',e=>{keys[e.key]=true;if(['ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();});
  document.addEventListener('keyup',e=>keys[e.key]=false);

  let touchStartX=null;
  canvas.addEventListener('touchstart',e=>{
    e.preventDefault(); touchStartX=e.touches[0].clientX;
    const r=canvas.getBoundingClientRect();
    handleTap((e.touches[0].clientX-r.left)*(W/r.width),(e.touches[0].clientY-r.top)*(H/r.height));
  },{passive:false});
  canvas.addEventListener('touchmove',e=>{
    e.preventDefault();
    const active=gamePhase==='playing'||gamePhase==='endless';
    if(!active||touchStartX===null||pudSlide) return;
    const dx=e.touches[0].clientX-touchStartX;
    const ml=phoneReversed?dx>20:dx<-20;
    const mr=phoneReversed?dx<-20:dx>20;
    if(ml&&lane>0&&moveCool<=0){lane--;targetX=LANES[lane];moveCool=13;playerVX=0;touchStartX=e.touches[0].clientX;}
    if(mr&&lane<2&&moveCool<=0){lane++;targetX=LANES[lane];moveCool=13;playerVX=0;touchStartX=e.touches[0].clientX;}
  },{passive:false});
  canvas.addEventListener('touchend',e=>{e.preventDefault();touchStartX=null;},{passive:false});
  canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();handleTap((e.clientX-r.left)*(W/r.width),(e.clientY-r.top)*(H/r.height));});

  function handleTap(tx,ty){
    if(gamePhase==='start'){
      if(tx>W/2-84&&tx<W/2+84&&ty>H/2+30&&ty<H/2+78){
        initAudio();
        reset();
      }
      return;
    }
    if(gamePhase==='win'){
      if(winPhase===1){
        if(tx>W/2-112&&tx<W/2+112&&ty>H/2-28&&ty<H/2+18) openBooking();
        if(tx>W/2-102&&tx<W/2+102&&ty>H/2+30&&ty<H/2+72){gamePhase='endless';kmDriven=0;endlessLives=3;endlessHitCool=0;obstacles=[];confetti=[];speed=3.5;obsCool=1.0;}
        if(tx>W/2-62&&tx<W/2+62&&ty>H/2+86&&ty<H/2+120) gamePhase='start';
      }
      return;
    }
    if(gamePhase==='gameover'){
      if(tx>W/2-112&&tx<W/2+112&&ty>H/2+36&&ty<H/2+82) openBooking();
      if(tx>W/2-62&&tx<W/2+62&&ty>H/2+96&&ty<H/2+130) gamePhase='start';
      return;
    }
    const active=gamePhase==='playing'||gamePhase==='endless';
    if(active&&!pudSlide){
      const ml=phoneReversed?tx>W/2:tx<W/2;
      const mr=phoneReversed?tx<W/2:tx>W/2;
      if(ml&&lane>0&&moveCool<=0){lane--;targetX=LANES[lane];moveCool=13;playerVX=0;}
      if(mr&&lane<2&&moveCool<=0){lane++;targetX=LANES[lane];moveCool=13;playerVX=0;}
    }
  }

  // Pause when off-screen
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting&&frameId){cancelAnimationFrame(frameId);frameId=null;}
      else if(e.isIntersecting&&!frameId){lastTime=0;frameId=requestAnimationFrame(loop);}
    });
  },{threshold:0.1});
  observer.observe(canvas);

  gamePhase='start';
  frameId=requestAnimationFrame(loop);
})();
