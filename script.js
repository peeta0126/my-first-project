// ===== 로비 / 화면 전환 =====
const lobby = document.getElementById('lobby');
const gameWrap = document.getElementById('gameWrap');
const moneyElem = document.getElementById('money');
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('exitBtn').addEventListener('click', backToLobby);

let gameRunning = false;
let rafId = null; 

function startGame() {
  // ← 추가: 로비에서 가장 최근 선택값을 다시 읽어옴
  const latest = localStorage.getItem('selectedBat');
  if (latest) selectedBat = latest;

  lobby.style.display = 'none';
  gameWrap.style.display = 'block';
  if (!gameRunning) initGame();
}


function backToLobby() {
  gameWrap.style.display = 'none';
  lobby.style.display = 'block';

  // ← 추가: 게임 루프 멈추고 재시작 가능 상태로
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  gameRunning = false;
}


// ===== 박쥐 도감 & 뽑기 =====
const bats = [
  { name: "박쥐 1", staticImg: "박쥐1.png", flyImg: "bat1_fly_2x4.png" },
  { name: "박쥐 2", staticImg: "박쥐2.png", flyImg: "bat2_fly_2x4.png" },
  { name: "박쥐 3", staticImg: "박쥐3.png", flyImg: "bat3_fly_2x4.png" },
  { name: "박쥐 4", staticImg: "박쥐4.png", flyImg: "bat4_fly_2x4.png" },
  { name: "박쥐 5", staticImg: "박쥐5.png", flyImg: "bat5_fly_2x4.png" },
  { name: "박쥐 6", staticImg: "박쥐6.png", flyImg: "bat6_fly_2x4.png" },
  { name: "박쥐 7", staticImg: "박쥐7.png", flyImg: "bat7_fly_2x4.png" },
  { name: "박쥐 8", staticImg: "박쥐8.png", flyImg: "bat8_fly_2x4.png" },
  { name: "박쥐 9", staticImg: "박쥐9.png", flyImg: "bat9_fly_2x4.png" }

];

// 처음 시작 시 localStorage 초기화
if (!localStorage.getItem('bats')) localStorage.setItem('bats', JSON.stringify([]));
if (!localStorage.getItem('selectedBat')) localStorage.setItem('selectedBat', '박쥐 1');

const collectedBats = new Set(JSON.parse(localStorage.getItem('bats')));
let selectedBat = localStorage.getItem('selectedBat');
const batListElem = document.getElementById('batList');

// ===== 도감 표시 =====
function refreshBatList() {
  batListElem.innerHTML = '';
  bats.forEach(bat => {
    const li = document.createElement('li');
    const img = document.createElement('img');
    const collected = collectedBats.has(bat.name);

    img.src = bat.staticImg;
    img.alt = bat.name;
    img.style.width = '80px';
    img.style.height = '80px';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '10px';
    img.style.filter = collected ? 'none' : 'brightness(0)';
    img.style.cursor = collected ? 'pointer' : 'not-allowed';
    img.style.transition = '0.2s';
    img.style.border = (bat.name === selectedBat) ? '3px solid #00bfff' : '3px solid transparent';

    if (collected) {
      img.addEventListener('click', () => {
        selectedBat = bat.name;
        localStorage.setItem('selectedBat', selectedBat);
        refreshBatList();
      });
    }

    li.appendChild(img);
    const name = document.createElement('div');
    name.textContent = bat.name;
    name.style.fontSize = '14px';
    name.style.marginTop = '4px';
    li.appendChild(name);
    batListElem.appendChild(li);
  });
}
refreshBatList();

// ===== 뽑기 버튼 =====
document.getElementById('drawBtn').addEventListener('click', () => {
  let money = parseInt(moneyElem.innerText);
  if (money < 100) { alert("코인이 부족합니다!"); return; }
  money -= 100;
  moneyElem.innerText = money;

  const availableBats = bats.filter(b => !collectedBats.has(b.name));
  if (availableBats.length === 0) { alert("모든 박쥐를 이미 수집했습니다!"); return; }

  const randomBat = availableBats[Math.floor(Math.random() * availableBats.length)];
  collectedBats.add(randomBat.name);
  localStorage.setItem('bats', JSON.stringify([...collectedBats]));
  refreshBatList();
  alert(`${randomBat.name}을(를) 획득했습니다!`);
});

// ===== 도감 모달 =====
const modal = document.getElementById('encyclopediaModal');
document.getElementById('encyclopediaBtn').addEventListener('click', () => modal.style.display='flex');
document.getElementById('closeModal').addEventListener('click', () => modal.style.display='none');
window.addEventListener('click', e => { if(e.target===modal) modal.style.display='none'; });

// ===== Bat Avoider Game =====
function initGame() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // 선택된 박쥐 찾기
  const chosen = bats.find(b => b.name === selectedBat) || bats[0];
  const batImg = new Image();
  batImg.src = chosen.flyImg; // 2행4열 스프라이트 시트

  let frame = 0, score = 0, best = 0;
  const gravity = 0.6, flapPower = -10;

  const bat = { 
    x: 160, y: H/2, w: 64, h: 48, vy: 0, angle: 0, alive: true,
    flap() { if (!this.alive) return; this.vy = flapPower; },
    animFrame: 0, frameDelay: 0
  };

  const totalFrames = 8, framesPerRow = 4, framesPerCol = 2;
  const obstacles = [], coins = [];
  const pipeWidth = 90, gapSize = 180;
  const spawnInterval = 100, coinSpawnInterval = 180, coinRadius = 15;

  function spawnPipe() {
    const margin = 60;
    const gapY = margin + Math.random() * (H - margin*2 - gapSize);
    obstacles.push({ x: W+40, gapY, gapH: gapSize, w: pipeWidth, passed: false });
  }

  function spawnCoin() {
    if (obstacles.length > 0) {
      const lastPipe = obstacles[obstacles.length - 1];
      const safeY = lastPipe.gapY + lastPipe.gapH / 2 + (Math.random() * 60 - 30);
      coins.push({ x: lastPipe.x + pipeWidth + 100, y: safeY, r: coinRadius, collected:false });
    } else {
      const y = H / 2;
      coins.push({ x: W + 40, y, r: coinRadius, collected:false });
    }
  }

  function reset() {
    frame = 0; score = 0; bat.y = H/2; bat.vy = 0; bat.alive = true;
    bat.animFrame = 0; bat.frameDelay = 0;
    obstacles.length = 0; coins.length = 0;
    document.getElementById('score').textContent = 'Score: 0';
  }

  function die() { bat.alive = false; bat.vy = -6; }

  function update() {
    if (!bat.alive) return;

    frame++;
    if (frame % spawnInterval === 0) spawnPipe();
    if (frame % coinSpawnInterval === 0) spawnCoin();

    bat.vy += gravity; bat.y += bat.vy;
    bat.angle = Math.max(-0.6, Math.min(1.0, bat.vy/15));

    bat.frameDelay++;
    if (bat.frameDelay % 5 === 0) bat.animFrame = (bat.animFrame + 1) % totalFrames;

    for (const p of obstacles) {
      p.x -= 4.5;
      if (!p.passed && p.x + p.w < bat.x) {
        p.passed = true; 
        score++;
        document.getElementById('score').textContent = 'Score: ' + score;
        if(score > best){ best = score; document.getElementById('best').textContent = 'Best: ' + best; }
      }
    }
    while (obstacles.length && obstacles[0].x + obstacles[0].w < -100) obstacles.shift();

    for (const c of coins) {
      c.x -= 4.5;
      const dx = Math.abs(bat.x - c.x);
      const dy = Math.abs(bat.y - c.y);
      if (!c.collected && dx < bat.w/2 + c.r && dy < bat.h/2 + c.r) {
        c.collected = true;
        let money = parseInt(moneyElem.innerText);
        money += 100;
        moneyElem.innerText = money;
      }
    }
    while (coins.length && coins[0].x < -50) coins.shift();

    if(bat.y + bat.h/2 >= H || bat.y - bat.h/2 <= 0) die();
    for (const p of obstacles) {
      const inX = bat.x + bat.w/2 > p.x && bat.x - bat.w/2 < p.x + p.w;
      if (inX && (bat.y - bat.h/2 < p.gapY || bat.y + bat.h/2 > p.gapY + p.gapH)) die();
    }
  }

  function drawRoundedRect(x,y,w,h,r){
    ctx.beginPath(); ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath(); ctx.fill();
  }

  function draw() {
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#e9f2ff'; ctx.fillRect(0,0,W,H);

    for (const p of obstacles) {
      ctx.fillStyle = '#bcd3ff';
      drawRoundedRect(p.x,0,p.w,p.gapY,10);
      drawRoundedRect(p.x,p.gapY+p.gapH,p.w,H-(p.gapY+p.gapH),10);
    }

    for (const c of coins) {
      if(c.collected) continue;
      ctx.fillStyle='#ffcc00';
      ctx.beginPath();
      ctx.arc(c.x,c.y,c.r,0,Math.PI*2);
      ctx.fill();
    }

    // 박쥐 스프라이트 애니메이션
    ctx.save(); ctx.translate(bat.x,bat.y); ctx.rotate(bat.angle);
    if(batImg.complete && batImg.width > 0){
      const fw = batImg.width / 4;
      const fh = batImg.height / 2;
      const col = bat.animFrame % 4;
      const row = Math.floor(bat.animFrame / 4);
      ctx.drawImage(batImg, fw*col, fh*row, fw, fh, -bat.w/2, -bat.h/2, bat.w, bat.h);
    }
    ctx.restore();

    if(!bat.alive){
      ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#111'; ctx.font='36px sans-serif'; ctx.textAlign='center';
      ctx.fillText('Game Over — Click or press Space to restart', W/2,H/2);
    }
  }

function loop() {
  update();
  draw();
  rafId = requestAnimationFrame(loop); // ← 추가: id 보관
}


  window.addEventListener('keydown', e=>{
    if(e.code==='Space'){ e.preventDefault(); if(bat.alive) bat.flap(); else reset(); }
  });
  canvas.addEventListener('pointerdown', ()=>{ if(bat.alive) bat.flap(); else reset(); });

  spawnPipe();
  loop();
  gameRunning = true;
}
