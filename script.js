// ===== 로비 / 화면 전환 =====
const lobby = document.getElementById('lobby');
const gameWrap = document.getElementById('gameWrap');
const moneyElem = document.getElementById('money');
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('exitBtn').addEventListener('click', backToLobby);

let gameRunning = false;
let loopId = null; // requestAnimationFrame 루프 ID 저장용

function startGame() {
  lobby.style.display = 'none';
  gameWrap.style.display = 'block';
  initGame(); // 항상 새로 시작해서 선택된 박쥐 반영
}

function backToLobby() {
  gameWrap.style.display = 'none';
  lobby.style.display = 'flex';
  lobby.style.flexDirection = 'column';
  lobby.style.justifyContent = 'center';
  lobby.style.alignItems = 'center';
  lobby.style.textAlign = 'center';
  lobby.style.height = '100vh';
  lobby.style.margin = '0 auto';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  gameRunning = false;
  if (loopId) {
    cancelAnimationFrame(loopId);
    loopId = null;
  }
}

// ===== 박쥐 도감 & 뽑기 =====
const bats = [
  "박쥐1", "박쥐2", "박쥐3", "박쥐4", "박쥐5",
  "박쥐6", "박쥐7", "박쥐8", "박쥐9", "박쥐10"
];

// ===== 기본 데이터 설정 =====
if (!localStorage.getItem('bats'))
  localStorage.setItem('bats', JSON.stringify(["박쥐1"])); // 기본 박쥐 등록
if (!localStorage.getItem('selectedBat'))
  localStorage.setItem('selectedBat', "박쥐1");
if (!localStorage.getItem('money'))
  localStorage.setItem('money', 0); // 초기 금액 0원

let money = parseInt(localStorage.getItem('money'));
moneyElem.innerText = money;
const collectedBats = new Set(JSON.parse(localStorage.getItem('bats')));
let selectedBat = localStorage.getItem('selectedBat');
const batListElem = document.getElementById('batList');

// ===== 도감 표시 =====
function refreshBatList() {
  batListElem.innerHTML = '';
  bats.forEach(b => {
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.src = `박쥐_도감/${b}.png`;
    const label = document.createElement('span');
    label.textContent = b;

    const owned = collectedBats.has(b);
    if (owned) {
      li.classList.add('unlocked');
      li.addEventListener('click', () => {
        selectedBat = b;
        localStorage.setItem('selectedBat', b);
        refreshBatList();
      });
      if (b === selectedBat) li.classList.add('selected');
    } else {
      li.classList.add('locked');
    }
    li.appendChild(img);
    li.appendChild(label);
    batListElem.appendChild(li);
  });
}
refreshBatList();

// ===== 뽑기 =====
document.getElementById('drawBtn').addEventListener('click', () => {
  let money = parseInt(moneyElem.innerText);
  if (money < 1000) return alert("💸 코인이 부족합니다! 1000원이 필요합니다!");
  money -= 1000;
  moneyElem.innerText = money;
  localStorage.setItem('money', money);

  const availableBats = bats.filter(b => !collectedBats.has(b) && b !== "박쥐10"); // 레전더리 제외
  if (availableBats.length === 0) return alert("모든 박쥐를 이미 수집했습니다!");

  const randomBat = availableBats[Math.floor(Math.random() * availableBats.length)];
  collectedBats.add(randomBat);
  localStorage.setItem('bats', JSON.stringify([...collectedBats]));
  refreshBatList();

  const effect = document.getElementById('drawEffect');
  const batImgElem = document.getElementById('drawBatImg');
  const textElem = effect.querySelector('.effect-text');
  batImgElem.src = `박쥐_도감/${randomBat}.png`;
  textElem.textContent = `🎉 ${randomBat} 획득!`;

  effect.classList.remove('legendary');
  effect.style.display = 'flex';
  setTimeout(() => effect.style.display = 'none', 2500);
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

  if (loopId) {
    cancelAnimationFrame(loopId);
    loopId = null;
  }

  const currentBat = localStorage.getItem('selectedBat') || "박쥐1";
  const batIndex = bats.indexOf(currentBat) + 1;
  const batImg = new Image();
  batImg.src = `박쥐_인게임_모션/bat${batIndex}_fly_2x4.png`;

  let frame = 0, score = 0, best = 0;
  const gravity = 0.6, flapPower = -10;

  const bat = {
    x: 160, y: H/2,
    w: 64, h: 48,
    vy: 0, angle: 0,
    alive: true,
    flap() { if (this.alive) this.vy = flapPower; },
    animFrame: 0, frameDelay: 0
  };

  const totalFrames = 8, framesPerRow = 4, framesPerCol = 2;
  const obstacles = [], coins = [];
  const pipeWidth = 90, gapSize = 180;
  const spawnInterval = 110, coinSpawnInterval = 200, coinRadius = 15;

  function spawnPipe() {
    const margin = 60;
    const gapY = margin + Math.random() * (H - margin*2 - gapSize);
    obstacles.push({ x: W+40, gapY, gapH: gapSize, w: pipeWidth, passed: false });
  }

  // ===== 코인 자연스러운 배치 =====
  function spawnCoin() {
    const baseY = H / 2;
    const offset = (Math.random() - 0.5) * 180; // 중심 기준 위아래 90px 흔들림
    const y = Math.min(Math.max(60, baseY + offset), H - 60);
    coins.push({ x: W+40, y, r: coinRadius, collected:false });
  }

  function reset() {
    frame = 0;
    score = 0;
    bat.y = H/2;
    bat.vy = 0;
    bat.alive = true;
    bat.animFrame = 0;
    bat.frameDelay = 0;
    obstacles.length = 0;
    coins.length = 0;
    document.getElementById('score').textContent = 'Score: 0';
  }

  function die() { bat.alive = false; bat.vy = -6; }

  function update() {
    if (!bat.alive) return;

    frame++;
    if (frame % spawnInterval === 0) spawnPipe();
    if (frame % coinSpawnInterval === 0) spawnCoin();

    bat.vy += gravity;
    bat.y += bat.vy;
    bat.angle = Math.max(-0.6, Math.min(1.0, bat.vy/15));
    bat.frameDelay++;
    if (bat.frameDelay % 5 === 0) bat.animFrame = (bat.animFrame + 1) % totalFrames;

    // 장애물 업데이트 및 점수 계산
    for (const p of obstacles) {
      p.x -= 3;
      if (!p.passed && p.x + p.w < bat.x) {
        p.passed = true;
        score++;
        document.getElementById('score').textContent = 'Score: ' + score;
        if(score > best){
          best = score;
          document.getElementById('best').textContent = 'Best: ' + best;
        }

        // 🌟 30점 이상 시 박쥐10 자동 해금
        if(score >= 30 && !collectedBats.has("박쥐10")){
          collectedBats.add("박쥐10");
          localStorage.setItem('bats', JSON.stringify([...collectedBats]));
          refreshBatList();

          const effect = document.getElementById('drawEffect');
          const batImgElem = document.getElementById('drawBatImg');
          const textElem = effect.querySelector('.effect-text');
          batImgElem.src = `박쥐_도감/박쥐10.png`;
          textElem.textContent = `🌟 전설의 박쥐10 해금!`;
          effect.classList.add('legendary');
          effect.style.display = 'flex';
          setTimeout(() => effect.style.display = 'none', 3000);
        }
      }
    }
    while (obstacles.length && obstacles[0].x + obstacles[0].w < -100) obstacles.shift();

    // 코인 수집
    for (const c of coins) {
      c.x -= 3;
      const dx = Math.abs(bat.x - c.x);
      const dy = Math.abs(bat.y - c.y);
      if (!c.collected && dx < bat.w/2 + c.r && dy < bat.h/2 + c.r) {
        c.collected = true;
        let money = parseInt(moneyElem.innerText) + 100;
        moneyElem.innerText = money;
        localStorage.setItem('money', money);
      }
    }
    while (coins.length && coins[0].x < -50) coins.shift();

    // 충돌 체크
    if(bat.y + bat.h/2 >= H || bat.y - bat.h/2 <= 0) die();
    for (const p of obstacles) {
      const inX = bat.x + bat.w/2 > p.x && bat.x - bat.w/2 < p.x + p.w;
      if (inX && (bat.y - bat.h/2 < p.gapY || bat.y + bat.h/2 > p.gapY + p.gapH)) die();
    }
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#e9f2ff';
    ctx.fillRect(0, 0, W, H);

    for (const p of obstacles) {
      ctx.fillStyle = '#bcd3ff';
      ctx.fillRect(p.x, 0, p.w, p.gapY);
      ctx.fillRect(p.x, p.gapY + p.gapH, p.w, H - (p.gapY + p.gapH));
    }

    for (const c of coins) {
      if (c.collected) continue;
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(bat.x, bat.y);
    ctx.rotate(bat.angle);
    if (batImg.complete) {
      const fw = batImg.width / framesPerRow;
      const fh = batImg.height / framesPerCol;
      const col = bat.animFrame % framesPerRow;
      const row = Math.floor(bat.animFrame / framesPerRow);
      ctx.drawImage(batImg, fw * col, fh * row, fw, fh, -bat.w/2, -bat.h/2, bat.w, bat.h);
    }
    ctx.restore();

    if (!bat.alive) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#111';
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over — Click or press Space', W / 2, H / 2);
    }
  }

  function handleKey(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (bat.alive) bat.flap();
      else reset();
    }
  }
  function handleClick() {
    if (bat.alive) bat.flap();
    else reset();
  }

  window.removeEventListener('keydown', handleKey);
  canvas.removeEventListener('pointerdown', handleClick);
  window.addEventListener('keydown', handleKey);
  canvas.addEventListener('pointerdown', handleClick);

  function loop() {
    update();
    draw();
    loopId = requestAnimationFrame(loop);
  }

  spawnPipe();
  loop();
  gameRunning = true;
}
