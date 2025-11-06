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
  // 게임 숨기기
  gameWrap.style.display = 'none';

  // 로비 복귀
  lobby.style.display = 'flex';
  lobby.style.flexDirection = 'column';
  lobby.style.justifyContent = 'center';
  lobby.style.alignItems = 'center';
  lobby.style.textAlign = 'center';
  lobby.style.height = '100vh';
  lobby.style.margin = '0 auto';

  // 캔버스 초기화 (화면 잔상 방지)
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 루프 및 상태 초기화
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

if (!localStorage.getItem('bats')) localStorage.setItem('bats', JSON.stringify([]));
if (!localStorage.getItem('selectedBat')) localStorage.setItem('selectedBat', "박쥐1");

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
  if (money < 100) return alert("코인이 부족합니다!");
  money -= 100;
  moneyElem.innerText = money;

  const availableBats = bats.filter(b => !collectedBats.has(b));
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

  // 전설 박쥐 특별 효과
  if (randomBat === "박쥐10") {
    effect.classList.add('legendary');
    textElem.textContent = `🌟 전설의 ${randomBat} 획득! 🌟`;
  } else {
    effect.classList.remove('legendary');
  }

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

  // 🔹 기존 루프 중지
  if (loopId) {
    cancelAnimationFrame(loopId);
    loopId = null;
  }

  // 선택된 박쥐 적용
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

  function spawnCoin() {
    const y = 60 + Math.random()*(H-120);
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
      }
    }
    while (obstacles.length && obstacles[0].x + obstacles[0].w < -100) obstacles.shift();

    for (const c of coins) {
      c.x -= 3;
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

  function draw() {
  // 전체 초기화
  ctx.setTransform(1, 0, 0, 1, 0, 0); // 회전/이동 초기화
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#e9f2ff';
  ctx.fillRect(0, 0, W, H);

  // 장애물
  for (const p of obstacles) {
    ctx.fillStyle = '#bcd3ff';
    ctx.fillRect(p.x, 0, p.w, p.gapY);
    ctx.fillRect(p.x, p.gapY + p.gapH, p.w, H - (p.gapY + p.gapH));
  }

  // 코인
  for (const c of coins) {
    if (c.collected) continue;
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 박쥐
  ctx.save(); // 🎯 회전 영향 방지
  ctx.translate(bat.x, bat.y);
  ctx.rotate(bat.angle);
  if (batImg.complete) {
    const frameWidth = batImg.width / framesPerRow;
    const frameHeight = batImg.height / framesPerCol;
    const col = bat.animFrame % framesPerRow;
    const row = Math.floor(bat.animFrame / framesPerRow);
    ctx.drawImage(
      batImg,
      frameWidth * col,
      frameHeight * row,
      frameWidth,
      frameHeight,
      -bat.w / 2,
      -bat.h / 2,
      bat.w,
      bat.h
    );
  }
  ctx.restore(); // 🎯 여기서 상태 복원

  // 게임 오버 시
  if (!bat.alive) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#111';
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over — Click or press Space', W / 2, H / 2);
  }
}


  // ===== 이벤트 중복 방지 =====
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
