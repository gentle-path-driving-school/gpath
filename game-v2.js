// ═══════════════════════════════════════════════
//  GENTLE PATH MINI GAME  —  v4.3  (brand refresh)
// ═══════════════════════════════════════════════
(function() {
  const canvas = document.getElementById('gpCanvas');
  if (!canvas) return;
  const announcementPanel = document.getElementById('gpAnnouncement');
  const announcementTitle = document.getElementById('gpAnnouncementTitle');
  const announcementDetail = document.getElementById('gpAnnouncementDetail');
  const landscapeMedia = window.matchMedia('(orientation: landscape) and (max-width: 950px)');
  let landscapeMode = landscapeMedia.matches;

  canvas.width = landscapeMode ? 640 : 380;
  canvas.height = landscapeMode ? 360 : 540;

  const ctx = canvas.getContext('2d');
  let W = canvas.width, H = canvas.height;
  let LANE_W = W/3;
  let LANES = [LANE_W*0.5, LANE_W*1.5, LANE_W*2.5];
  const BASE_HR = 4, BONUS_HR = 8;

  // Gentle Path website brand palette.
  const COLORS = {
    green: '#546D61',
    coral: '#CD6A5B',
    gold: '#D2BE70',
    light: '#EDEDED',
    charcoal: '#383838',
    charcoalDeep: '#292929',
    white: '#FFFFFF',
    black: '#181818'
  };

  // ═══════════════════════════════════════════════════════════
  // EDIT POPUP AND END-SCREEN MESSAGES HERE
  // Change only the words between quotation marks, then commit the file.
  // ═══════════════════════════════════════════════════════════
  const GAME_MESSAGES = {
    start: {
      title: 'Become a Gentle Path Driving Star!',
      line1: 'Collect the L and P plates along your journey.',
      line2: "Don't forget to log your driving hours!",
      button: "Let's Go →"
    },
    stages: {
      lPlate: {title: 'L PLATE 🟨', detail: 'Learning begins. Log those hours.'},
      logbook: {title: '📓 LOGBOOK', detail: 'Hours ticking faster now!'},
      p1: {title: '🔴 P1 PLATES!', detail: '75 hours logged. Provisional driver!'},
      p2: {title: '🟢 P2 PLATES!', detail: '120 hours. Almost there!'},
      fullLicence: {title: '🏁 FULL LICENCE!', detail: 'You are a Gentle Path Driving Star!'}
    },
    popups: {
      slippery: {title: '💦 SLIPPERY!', detail: 'Forced lane slide — hang on!'},
      reversed: {title: '📱 CONTROLS REVERSED!', detail: 'Left is right. Right is left. Eyes on the road!'},
      speedCamera: {title: '📸 SPEED CAMERA!', detail: '$264 fine 💸 — slowing down...'},
      cone: {title: '🚧 CONE!', detail: 'Watch the road!'},
      nightDriving: {title: '🌙 NIGHT DRIVING', detail: 'Visibility reduced — 15 night hours required!'},
      controlsNormal: '✅ Controls back to normal!',
      phoneWarning: '📱 Watch out — controls will swap!',
      closeCall: '😅 Close call! +speed boost'
    },
    finish: {
      title: 'Licence Earned!',
      detail: 'Now for the real thing.',
      bookButton: 'Book a Real Lesson →',
      endlessButton: '🏁 Endless Mode',
      replayButton: 'Play again'
    },
    gameOver: {
      title: 'Game Over',
      detail: 'driven in Endless Mode',
      bookButton: 'Book a Real Lesson →',
      retryButton: 'Try again'
    }
  };

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
  function playWin()     { try{const ac=getAudio();[523,659,784,1047].forEach((f,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.value=f;const t=ac.currentTime+i*0.13;g.gain.setValueAtTime(0.15,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.35);o.start(t);o.stop(t+0.35);});}catch(e){} }

  // ══ STAGE DATA ═════════════════════════════════════════
  const STAGES = [
    {id:'lplate', color:COLORS.gold,  annText:GAME_MESSAGES.stages.lPlate.title,      annSub:GAME_MESSAGES.stages.lPlate.detail,      hoursNeeded:0  },
    {id:'logbook',color:COLORS.light, annText:GAME_MESSAGES.stages.logbook.title,     annSub:GAME_MESSAGES.stages.logbook.detail,     hoursNeeded:18 },
    {id:'p1',     color:COLORS.coral, annText:GAME_MESSAGES.stages.p1.title,          annSub:GAME_MESSAGES.stages.p1.detail,          hoursNeeded:75 },
    {id:'p2',     color:COLORS.green, annText:GAME_MESSAGES.stages.p2.title,          annSub:GAME_MESSAGES.stages.p2.detail,          hoursNeeded:120},
    {id:'full',   color:COLORS.gold,  annText:GAME_MESSAGES.stages.fullLicence.title, annSub:GAME_MESSAGES.stages.fullLicence.detail, hoursNeeded:150},
  ];

  // ══ STATE ══════════════════════════════════════════════
  let gamePhase; // 'start' | 'playing' | 'win' | 'endless' | 'gameover'
  let frameId = null;

  // Player
  let lane, playerX, targetX, playerVX, moveCool, speed, roadOffset, lastTime;

  // Instructor
  let celineOnBoard;

  // Progression
  let mainStage, collectible, hours, hoursActive, logbookBonus;
  let nightShown;

  // Effects
  let obstacles, obsCool, particles, exhaustTrail, confetti;
  let shakeAmt, nightAlpha, hourFlash=0;
  let phoneReversed, phoneTimer, pudSlide, pudSlideLane, pudTimer;
  let camSlow, closeCooldown;

  // Win / Endless
  let winPhase, winY, winPanelA;
  let kmDriven, endlessLives, endlessHitCool;

  // UI
  let ann  = {text:'', subtext:'', color:COLORS.gold, timer:0, max:160};
  let toastQueue = [];
  let keys = {}, spawnTimer = null;
  let viewportResizeTimer = null;

  function laneIndexForEntity(entity, oldLaneWidth) {
    if (Number.isInteger(entity?.lane)) return Math.max(0, Math.min(2, entity.lane));
    if (!Number.isFinite(entity?.x) || !oldLaneWidth) return 1;
    return Math.max(0, Math.min(2, Math.round(entity.x / oldLaneWidth - 0.5)));
  }

  function reflowRoadEntity(entity, oldLaneWidth, verticalScale) {
    if (!entity) return;
    const entityLane = laneIndexForEntity(entity, oldLaneWidth);
    entity.x = LANES[entityLane];
    if (Number.isFinite(entity.y)) entity.y *= verticalScale;
  }

  function resizeCanvasForViewport() {
    const nextLandscapeMode = landscapeMedia.matches;
    const nextWidth = nextLandscapeMode ? 640 : 380;
    const nextHeight = nextLandscapeMode ? 360 : 540;
    if (nextWidth === W && nextHeight === H) return;

    const oldWidth = W;
    const oldHeight = H;
    const oldLaneWidth = LANE_W;
    const horizontalScale = nextWidth / oldWidth;
    const verticalScale = nextHeight / oldHeight;

    landscapeMode = nextLandscapeMode;
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    W = nextWidth;
    H = nextHeight;
    LANE_W = W / 3;
    LANES = [LANE_W * 0.5, LANE_W * 1.5, LANE_W * 2.5];

    if (Number.isInteger(lane)) {
      lane = Math.max(0, Math.min(2, lane));
      playerX = LANES[lane];
      targetX = LANES[lane];
      playerVX = 0;
    }

    reflowRoadEntity(collectible, oldLaneWidth, verticalScale);
    if (Array.isArray(obstacles)) obstacles.forEach(item => reflowRoadEntity(item, oldLaneWidth, verticalScale));

    if (Array.isArray(particles)) particles.forEach(item => {
      item.x *= horizontalScale;
      item.y *= verticalScale;
    });
    if (Array.isArray(exhaustTrail)) exhaustTrail.forEach(item => {
      item.x *= horizontalScale;
      item.y *= verticalScale;
    });
    if (Array.isArray(confetti)) confetti.forEach(item => {
      item.x *= horizontalScale;
      item.y *= verticalScale;
    });
    if (Number.isFinite(winY)) winY *= verticalScale;

    lastTime = 0;
    syncAnnouncementPanel();
  }

  function scheduleCanvasResize() {
    clearTimeout(viewportResizeTimer);
    viewportResizeTimer = setTimeout(resizeCanvasForViewport, 120);
  }

  window.addEventListener('resize', scheduleCanvasResize, {passive:true});
  if (landscapeMedia.addEventListener) landscapeMedia.addEventListener('change', scheduleCanvasResize);
  else if (landscapeMedia.addListener) landscapeMedia.addListener(scheduleCanvasResize);

  function syncAnnouncementPanel() {
    if (!announcementPanel || !announcementTitle || !announcementDetail) return;
    const isVisible = Boolean(ann && ann.timer > 0);

    if (isVisible) {
      announcementPanel.style.setProperty('--status-color', ann.color);
      announcementTitle.textContent = ann.text;
      announcementDetail.textContent = ann.subtext;
      announcementDetail.hidden = !ann.subtext;
    }

    announcementPanel.classList.toggle('is-visible', isVisible);
    announcementPanel.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
  }

  function showAnn(text, subtext, color, dur) {
    ann = {text, subtext:subtext||'', color:color||COLORS.gold, timer:dur||160, max:dur||160};
    syncAnnouncementPanel();
  }
  function showToast(msg, dur) { toastQueue.push({msg, timer:dur||70}); if(toastQueue.length>3) toastQueue.shift(); }

  function reset() {
    gamePhase = 'playing';
    lane=1; playerX=LANES[1]; targetX=LANES[1]; playerVX=0;
    moveCool=0; speed=2.8; roadOffset=0; lastTime=0;
    celineOnBoard=true;
    mainStage=0; collectible=null;
    hours=0; hoursActive=true; logbookBonus=false; nightShown=false;
    obstacles=[]; obsCool=2.67;
    particles=[]; exhaustTrail=[]; confetti=[];
    shakeAmt=0; nightAlpha=0; hourFlash=0;
    phoneReversed=false; phoneTimer=0;
    pudSlide=false; pudSlideLane=1; pudTimer=0;
    camSlow=0; closeCooldown=0;
    winPhase=0; winY=0; winPanelA=0;
    kmDriven=0; endlessLives=3; endlessHitCool=0;
    ann={text:'',subtext:'',color:COLORS.gold,timer:0,max:160};
    syncAnnouncementPanel();
    toastQueue=[];
    clearTimeout(spawnTimer);
  }

  // ══ ROAD ═══════════════════════════════════════════════
  function drawRoad() {
    ctx.fillStyle=COLORS.charcoal; ctx.fillRect(0,0,W,H);
    // Calm, solid brand-colour shoulders replace the animated red/white lights.
    ctx.fillStyle=COLORS.green;
    ctx.fillRect(0,0,16,H); ctx.fillRect(W-16,0,16,H);
    ctx.fillStyle=COLORS.gold;
    ctx.fillRect(16,0,3,H); ctx.fillRect(W-19,0,3,H);
    ctx.save();
    ctx.strokeStyle='rgba(237,237,237,0.28)'; ctx.lineWidth=3;
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
    let pc=mainStage>=4?COLORS.green:mainStage>=3?COLORS.coral:COLORS.gold;
    let pt=mainStage>=3?'P':'L';
    ctx.fillStyle=pc;
    ctx.beginPath(); ctx.roundRect(-10,h/2-13,20,10,[2]); ctx.fill();
    ctx.fillStyle=pt==='L'?COLORS.black:COLORS.white;
    ctx.font='bold 8px Urbanist,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
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
    ctx.fillStyle=COLORS.light; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,[4]); ctx.fill();
    ctx.fillStyle=COLORS.green; ctx.beginPath(); ctx.roundRect(-w/2+3,-h/2+10,w-6,h*0.4,[3]); ctx.fill();
    ctx.fillStyle='rgba(237,237,237,0.62)'; ctx.fillRect(-w/2+5,-h/2+12,w-10,12);
    ctx.fillStyle=COLORS.gold;
    ctx.beginPath(); ctx.arc(-w/2+8,-h/2+4,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w/2-8,-h/2+4,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=COLORS.coral; ctx.fillRect(-w/2+3,h/2-6,6,4); ctx.fillRect(w/2-9,h/2-6,6,4);
    drawPlate(h); drawInstructor(w,h); ctx.restore();
  }

  function drawUte(x,y) {
    ctx.save(); ctx.translate(x,y);
    const w=42,h=66;
    ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0,h/2+5,w/2+6,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=COLORS.green; ctx.beginPath(); ctx.roundRect(-w/2+1,4,w-2,h/2-2,[2,2,5,5]); ctx.fill();
    ctx.fillStyle=COLORS.charcoalDeep; ctx.fillRect(-w/2+4,7,w-8,h/2-8);
    ctx.fillStyle=COLORS.gold; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h/2+10,[5,5,3,3]); ctx.fill();
    ctx.fillStyle=COLORS.coral; ctx.beginPath(); ctx.roundRect(-w/2+3,-h/2+3,w-6,h*0.28,[4]); ctx.fill();
    ctx.fillStyle='rgba(237,237,237,0.62)'; ctx.fillRect(-w/2+6,-h/2+5,w-12,14);
    [[-w/2+8,-h/2+5],[w/2-8,-h/2+5]].forEach(([hx,hy])=>{
      ctx.fillStyle=COLORS.light; ctx.beginPath(); ctx.arc(hx,hy,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=COLORS.gold; ctx.beginPath(); ctx.arc(hx,hy,3.5,0,Math.PI*2); ctx.fill();
    });
    ctx.fillStyle=COLORS.charcoal; ctx.fillRect(-w/2-1,-h/2-2,w+2,5);
    [[-w/2-1,-h/2+18],[w/2-5,-h/2+18],[-w/2-1,h/2-16],[w/2-5,h/2-16]].forEach(([wx,wy])=>{
      ctx.fillStyle=COLORS.black; ctx.beginPath(); ctx.ellipse(wx+5,wy,8,10,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=COLORS.charcoal; ctx.lineWidth=2; ctx.stroke();
    });
    drawPlate(h); drawInstructor(w,h); ctx.restore();
  }

  function drawSportyHatch(x,y) {
    ctx.save(); ctx.translate(x,y);
    const w=36,h=60;
    ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0,h/2+4,w/2+5,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=COLORS.coral; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,[4]); ctx.fill();
    ctx.fillStyle=COLORS.charcoal;
    ctx.beginPath(); ctx.moveTo(-w/2+4,-h/2+8); ctx.lineTo(w/2-4,-h/2+8); ctx.lineTo(w/2-5,-h/2+30); ctx.lineTo(-w/2+5,-h/2+30); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(237,237,237,0.68)';
    ctx.beginPath(); ctx.moveTo(-w/2+6,-h/2+9); ctx.lineTo(w/2-6,-h/2+9); ctx.lineTo(w/2-7,-h/2+29); ctx.lineTo(-w/2+7,-h/2+29); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(-w/2,h/2-22,w,4);
    ctx.fillStyle=COLORS.green; ctx.fillRect(-w/2-2,h/2-10,w+4,4);
    ctx.fillStyle=COLORS.gold;
    ctx.beginPath(); ctx.moveTo(-w/2+2,-h/2+2); ctx.lineTo(-w/2+13,-h/2+2); ctx.lineTo(-w/2+11,-h/2+7); ctx.lineTo(-w/2+2,-h/2+7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w/2-2,-h/2+2); ctx.lineTo(w/2-13,-h/2+2); ctx.lineTo(w/2-11,-h/2+7); ctx.lineTo(w/2-2,-h/2+7); ctx.closePath(); ctx.fill();
    ctx.fillStyle=COLORS.light; ctx.fillRect(-w/2+2,h/2-6,8,3); ctx.fillRect(w/2-10,h/2-6,8,3);
    drawPlate(h); drawInstructor(w,h); ctx.restore();
  }

  function drawSedan(x,y) {
    ctx.save(); ctx.translate(x,y);
    const w=38,h=62;
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0,h/2+4,w/2+5,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=COLORS.green; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,[6]); ctx.fill();
    ctx.fillStyle=COLORS.charcoal; ctx.beginPath(); ctx.roundRect(-w/2+4,-h/2+12,w-8,h*0.36,[8]); ctx.fill();
    ctx.fillStyle='rgba(237,237,237,0.68)'; ctx.beginPath(); ctx.roundRect(-w/2+6,-h/2+14,w-12,13,[4]); ctx.fill();
    ctx.fillStyle=COLORS.light; ctx.fillRect(-w/2+3,-h/2+2,8,3); ctx.fillRect(w/2-11,-h/2+2,8,3);
    ctx.fillStyle=COLORS.gold;
    ctx.beginPath(); ctx.arc(-w/2+10,-h/2+5,2.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w/2-10,-h/2+5,2.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=COLORS.coral; ctx.fillRect(-w/2+3,h/2-6,8,3); ctx.fillRect(w/2-11,h/2-6,8,3);
    drawPlate(h); drawInstructor(w,h); ctx.restore();
  }

  function drawF1(x,y) {
    ctx.save(); ctx.translate(x,y);
    const w=34,h=70;
    ctx.fillStyle='rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(0,h/2+3,w/2+12,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=COLORS.green;
    ctx.beginPath(); ctx.roundRect(-w/2-11,-h/2+26,13,22,[3]); ctx.fill();
    ctx.beginPath(); ctx.roundRect(w/2-2,-h/2+26,13,22,[3]); ctx.fill();
    ctx.fillStyle=COLORS.charcoalDeep;
    ctx.beginPath(); ctx.roundRect(-w/2-10,-h/2-2,w+20,8,[2]); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-w/2-8,h/2-7,w+16,6,[2]); ctx.fill();
    ctx.fillStyle=COLORS.gold;
    ctx.beginPath(); ctx.moveTo(-7,-h/2-10); ctx.lineTo(7,-h/2-10); ctx.lineTo(11,-h/2+4); ctx.lineTo(-11,-h/2+4); ctx.closePath(); ctx.fill();
    ctx.fillStyle=COLORS.coral; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,[5]); ctx.fill();
    ctx.fillStyle=COLORS.charcoal; ctx.beginPath(); ctx.ellipse(0,-h/2+26,10,14,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=COLORS.gold; ctx.beginPath(); ctx.arc(0,-h/2+18,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(-6,-h/2+16,12,4);
    [[-w/2-9,-h/2+14],[w/2+2,-h/2+14],[-w/2-9,h/2-14],[w/2+2,h/2-14]].forEach(([wx,wy])=>{
      ctx.fillStyle=COLORS.black; ctx.beginPath(); ctx.ellipse(wx+4,wy,6,8,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=COLORS.charcoal; ctx.lineWidth=1.5; ctx.stroke();
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

  // ══ MAIN COLLECTIBLE ════════════════════════════════════
  function canSpawn() {
    return mainStage<STAGES.length && hours>=STAGES[mainStage].hoursNeeded;
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
      case 0: ctx.fillStyle=COLORS.black; ctx.font='bold 17px Urbanist,sans-serif'; ctx.fillText('L',0,1); break;
      case 1: ctx.font='18px sans-serif'; ctx.fillText('📓',0,1); break;
      case 2: case 3: ctx.fillStyle=COLORS.white; ctx.font='bold 17px Urbanist,sans-serif'; ctx.fillText('P',0,1); break;
      default: ctx.font='18px sans-serif'; ctx.fillText('🏁',0,1); break;
    }
    ctx.restore();
  }

  // ══ OBSTACLES ═══════════════════════════════════════════
  const OBS_TYPES=['cone','puddle','camera','cone','puddle','camera','cone','puddle','camera','cone','puddle','phone'];
  function spawnObstacle() {
    const blocked=collectible?collectible.lane:-1;
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
        ctx.fillStyle=COLORS.coral;
        ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(12,12); ctx.lineTo(-12,12); ctx.closePath(); ctx.fill();
        ctx.fillStyle=COLORS.light; ctx.fillRect(-8,-2,16,4); ctx.fillStyle=COLORS.charcoal; ctx.fillRect(-13,12,26,6);
        break;
      case 'puddle':
        ctx.fillStyle='rgba(84,109,97,0.68)';
        ctx.beginPath(); ctx.ellipse(0,0,25,12,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(210,190,112,0.62)'; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle='rgba(237,237,237,0.28)';
        ctx.beginPath(); ctx.ellipse(-5,-2,9,4,0.3,0,Math.PI*2); ctx.fill();
        break;
      case 'phone':
        ctx.fillStyle=COLORS.black; ctx.beginPath(); ctx.roundRect(-8,-14,16,28,[3]); ctx.fill();
        ctx.fillStyle=COLORS.green; ctx.beginPath(); ctx.roundRect(-6,-12,12,22,[2]); ctx.fill();
        ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('📱',0,-1);
        ctx.fillStyle=COLORS.coral; ctx.beginPath(); ctx.arc(6,-12,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=COLORS.white; ctx.font='bold 6px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('!',6,-12);
        break;
      case 'camera':
        ctx.fillStyle=COLORS.green; ctx.beginPath(); ctx.roundRect(-14,-10,28,20,[3]); ctx.fill();
        ctx.fillStyle=COLORS.black; ctx.beginPath(); ctx.arc(0,0,7,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=COLORS.gold; ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=COLORS.coral;ctx.font='9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚡',14,-8);
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
        showAnn(GAME_MESSAGES.popups.slippery.title,GAME_MESSAGES.popups.slippery.detail,COLORS.green,110);
        shakeAmt=3; playSlide(); break;
      case 'phone':
        phoneReversed=true; phoneTimer=4.0;
        showAnn(GAME_MESSAGES.popups.reversed.title,GAME_MESSAGES.popups.reversed.detail,COLORS.coral,130);
        shakeAmt=4; playReverse(); break;
      case 'camera':
        camSlow=2.83;
        showAnn(GAME_MESSAGES.popups.speedCamera.title,GAME_MESSAGES.popups.speedCamera.detail,COLORS.gold,140);
        shakeAmt=5; playFlash(); break;
      default:
        showAnn(GAME_MESSAGES.popups.cone.title,GAME_MESSAGES.popups.cone.detail,COLORS.coral,90);
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
      ctx.fillStyle=COLORS.light;
      ctx.beginPath(); ctx.arc(e.x,e.y,Math.max(0,e.size),0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  // ══ CONFETTI ═════════════════════════════════════════════
  const CC=[COLORS.gold,COLORS.green,COLORS.coral,COLORS.light,COLORS.white];
  function spawnConfetti(){confetti=[];for(let i=0;i<70;i++)confetti.push({x:Math.random()*W,y:Math.random()*H-H,vx:(Math.random()-.5)*2.2,vy:Math.random()*2+1.2,r:Math.random()*Math.PI*2,vr:(Math.random()-.5)*0.08,size:Math.random()*9+4,color:CC[Math.floor(Math.random()*CC.length)]});}
  function updateConfetti(){confetti.forEach(c=>{c.x+=c.vx;c.y+=c.vy;c.r+=c.vr;if(c.y>H+10){c.y=-10;c.x=Math.random()*W;}});}

  // ══ HUD ══════════════════════════════════════════════════
  function drawHUD() {
    const tot=STAGES.length, ox=W/2-tot*14;
    for(let i=0;i<tot;i++){
      ctx.beginPath(); ctx.arc(ox+i*28,24,9,0,Math.PI*2);
      ctx.fillStyle=i<mainStage?COLORS.gold:(i===mainStage?COLORS.coral:'rgba(237,237,237,0.18)');
      ctx.fill();
      if(i<mainStage){ctx.fillStyle=COLORS.charcoal;ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✓',ox+i*28,24);}
    }
    // Hours bar — always show when hoursActive
    if(hoursActive){
      const goalStage=STAGES.slice(mainStage).find(s=>s.hoursNeeded>0);
      const goal=goalStage?goalStage.hoursNeeded:150;
      const pct=Math.min(1,hours/goal);
      const bx=W/2-78,by=40,bw=156,bh=9;
      ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,[4]); ctx.fill();
      ctx.fillStyle=hourFlash>0?COLORS.coral:COLORS.gold;
      ctx.beginPath(); ctx.roundRect(bx,by,bw*pct,bh,[4]); ctx.fill();

      ctx.fillStyle='rgba(237,237,237,0.82)'; ctx.font='bold 10px Urbanist,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(`${Math.floor(hours)} / ${goal} hrs`,W/2,by+bh/2);
    }
    // Phone reversed badge
    if(phoneReversed){
      ctx.fillStyle=COLORS.coral; ctx.beginPath(); ctx.roundRect(W-78,8,70,24,[12]); ctx.fill();
      ctx.fillStyle=COLORS.white; ctx.font='bold 10px Urbanist,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('⇄ REVERSED',W-43,20);
    }
    // Endless
    if(gamePhase==='endless'){
      ctx.fillStyle=COLORS.gold; ctx.font='bold 17px Urbanist,sans-serif'; ctx.textAlign='left'; ctx.textBaseline='middle';
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
      ctx.fillStyle='rgba(56,56,56,0.97)'; ctx.beginPath(); ctx.roundRect(W/2-158,H-96-yOff,316,58,[14]); ctx.fill();
      ctx.fillStyle=COLORS.light; ctx.font='bold 16px Urbanist,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      wrapText(ctx,t.msg,W/2,H-74-yOff,290,20);
      ctx.restore();
      t.timer-=dt*60;
    });
  }

  // ══ ANNOUNCEMENT ═════════════════════════════════════════
  function drawAnnouncement(dt) {
    if(!ann||ann.timer<=0){
      syncAnnouncementPanel();
      return;
    }
    ann.timer=Math.max(0,ann.timer-dt*60);
    syncAnnouncementPanel();
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
    ctx.fillStyle='rgba(56,56,56,0.96)'; ctx.fillRect(0,0,W,H);
    ctx.font='44px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🚗',W/2,H/2-112);
    ctx.fillStyle=COLORS.gold; ctx.font='bold 24px "Space Grotesk",sans-serif';
    wrapText(ctx,GAME_MESSAGES.start.title,W/2,H/2-76,W-56,27);
    ctx.fillStyle='rgba(237,237,237,0.84)'; ctx.font='13px Urbanist,sans-serif';
    ctx.fillText(GAME_MESSAGES.start.line1,W/2,H/2-16);
    ctx.fillText(GAME_MESSAGES.start.line2,W/2,H/2+3);
    ctx.fillStyle=COLORS.coral; ctx.beginPath(); ctx.roundRect(W/2-84,H/2+30,168,48,[24]); ctx.fill();
    ctx.fillStyle=COLORS.white; ctx.font='bold 18px Urbanist,sans-serif'; ctx.fillText(GAME_MESSAGES.start.button,W/2,H/2+54);
  }

  function drawWin(dt) {
    updateConfetti();
    confetti.forEach(c=>{ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.r);ctx.fillStyle=c.color;ctx.globalAlpha=0.85;ctx.fillRect(-c.size/2,-c.size*0.3,c.size,c.size*0.6);ctx.restore();});
    if(winPhase===0){
      winY-=660*(H/540)*dt; updateExhaust(playerX,winY); drawF1(playerX,winY);
      if(winY<-90){winPhase=1;exhaustTrail=[];}
    } else {
      winPanelA=Math.min(1,winPanelA+dt*2.4);
      ctx.save(); ctx.globalAlpha=winPanelA;
      ctx.fillStyle='rgba(56,56,56,0.97)'; ctx.beginPath(); ctx.roundRect(W/2-158,H/2-140,316,286,[18]); ctx.fill();
      ctx.strokeStyle=COLORS.gold; ctx.lineWidth=2; ctx.stroke();
      ctx.font='34px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🏆',W/2,H/2-104);
      ctx.fillStyle=COLORS.gold; ctx.font='bold 25px "Space Grotesk",sans-serif'; ctx.fillText(GAME_MESSAGES.finish.title,W/2,H/2-68);
      ctx.fillStyle='rgba(237,237,237,0.82)'; ctx.font='14px Urbanist,sans-serif'; ctx.fillText(GAME_MESSAGES.finish.detail,W/2,H/2-44);
      ctx.fillStyle=COLORS.coral; ctx.beginPath(); ctx.roundRect(W/2-112,H/2-28,224,46,[23]); ctx.fill();
      ctx.fillStyle=COLORS.white; ctx.font='bold 15px Urbanist,sans-serif'; ctx.fillText(GAME_MESSAGES.finish.bookButton,W/2,H/2-5);
      ctx.fillStyle='rgba(210,190,112,0.18)'; ctx.beginPath(); ctx.roundRect(W/2-102,H/2+30,204,42,[21]); ctx.fill();
      ctx.strokeStyle='rgba(210,190,112,0.65)'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle=COLORS.gold; ctx.font='bold 14px Urbanist,sans-serif'; ctx.fillText(GAME_MESSAGES.finish.endlessButton,W/2,H/2+51);
      ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.roundRect(W/2-62,H/2+86,124,34,[17]); ctx.fill();
      ctx.fillStyle='rgba(237,237,237,0.6)'; ctx.font='13px Urbanist,sans-serif'; ctx.fillText(GAME_MESSAGES.finish.replayButton,W/2,H/2+103);
      ctx.restore();
    }
  }

  function drawGameOver() {
    ctx.fillStyle='rgba(56,56,56,0.97)'; ctx.fillRect(0,0,W,H);
    ctx.font='38px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('💥',W/2,H/2-90);
    ctx.fillStyle=COLORS.coral; ctx.font='bold 25px "Space Grotesk",sans-serif'; ctx.fillText(GAME_MESSAGES.gameOver.title,W/2,H/2-54);
    ctx.fillStyle=COLORS.gold; ctx.font='bold 34px Urbanist,sans-serif'; ctx.fillText(`${Math.floor(kmDriven)} km`,W/2,H/2-12);
    ctx.fillStyle='rgba(237,237,237,0.76)'; ctx.font='14px Urbanist,sans-serif'; ctx.fillText(GAME_MESSAGES.gameOver.detail,W/2,H/2+16);
    ctx.fillStyle=COLORS.coral; ctx.beginPath(); ctx.roundRect(W/2-112,H/2+36,224,46,[23]); ctx.fill();
    ctx.fillStyle=COLORS.white; ctx.font='bold 15px Urbanist,sans-serif'; ctx.fillText(GAME_MESSAGES.gameOver.bookButton,W/2,H/2+59);
    ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.roundRect(W/2-62,H/2+96,124,34,[17]); ctx.fill();
    ctx.fillStyle='rgba(237,237,237,0.6)'; ctx.font='13px Urbanist,sans-serif'; ctx.fillText(GAME_MESSAGES.gameOver.retryButton,W/2,H/2+113);
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
      showAnn(GAME_MESSAGES.popups.nightDriving.title,GAME_MESSAGES.popups.nightDriving.detail,COLORS.green,170);
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
    const verticalTravelScale=(H-64)/476;
    roadOffset+=effSpd*dt*60;
    if(camSlow>0) camSlow-=dt;
    if(hourFlash>0) hourFlash=Math.max(0,hourFlash-dt*2);

    // ── TIMERS ──
    if(phoneTimer>0){phoneTimer-=dt;if(phoneTimer<=0){phoneReversed=false;showToast(GAME_MESSAGES.popups.controlsNormal,60);}}
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

    // ── MAIN COLLECTIBLES ──
    if(!collectible&&mainStage<STAGES.length&&canSpawn()) spawnCollectible();
    if(collectible){
      collectible.y+=(effSpd+2)*dt*60*verticalTravelScale;
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
    if(obsCool<=0&&(isPlaying||isEndless)){
      spawnObstacle(); obsCool=coolBase+Math.random()*0.92;
    }
    obstacles.forEach(o=>o.y+=(effSpd+0.8)*dt*60*verticalTravelScale);
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
          if(o.type==='phone'){showToast(GAME_MESSAGES.popups.phoneWarning,80);}
          else{showToast(GAME_MESSAGES.popups.closeCall,55);speed=Math.min(speed+0.5,isEndless?9:6);}
          closeCooldown=1.5; break;
        }
      }
    }

    // ── DRAW ──
    updateDrawParticles();
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
