const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: '#111111',
  parent: 'game',

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },

  scene: {
    create,
    update
  }
};

new Phaser.Game(config);

let player;
let enemies = [];
let keyItem;
let exitZone;
let walls;
let cursors;

let hasKey = false;
let startTime = 0;
let finished = false;
let caughtCount = 0;

let timerText;
let statusText;
let dailyText;

let currentChallenge;
let currentDailyId;
let finalTime = 0;

const PLAYER_START_X = 140;
const PLAYER_START_Y = 440;


// --------------------------------------------------
// DAILY CHALLENGES
// --------------------------------------------------

const DAILY_CHALLENGES = [
  {
    key: { x: 820, y: 140 },
    exit: { x: 820, y: 440 },

    enemies: [
      { x: 480, y: 280, speed: 85 }
    ]
  },

  {
    key: { x: 150, y: 140 },
    exit: { x: 820, y: 440 },

    enemies: [
      { x: 480, y: 280, speed: 80 },
      { x: 720, y: 150, speed: 70 }
    ]
  },

  {
    key: { x: 820, y: 440 },
    exit: { x: 150, y: 140 },

    enemies: [
      { x: 480, y: 280, speed: 75 },
      { x: 720, y: 420, speed: 75 }
    ]
  },

  {
    key: { x: 480, y: 260 },
    exit: { x: 820, y: 140 },

    enemies: [
      { x: 200, y: 140, speed: 70 },
      { x: 500, y: 420, speed: 80 },
      { x: 800, y: 260, speed: 70 }
    ]
  },

  {
    key: { x: 800, y: 250 },
    exit: { x: 150, y: 140 },

    enemies: [
      { x: 250, y: 420, speed: 70 },
      { x: 480, y: 280, speed: 80 },
      { x: 700, y: 140, speed: 70 },
      { x: 800, y: 420, speed: 65 }
    ]
  }
];


// --------------------------------------------------
// CREATE
// --------------------------------------------------

function create() {
  const scene = this;

  // Reset run state
  hasKey = false;
  finished = false;
  caughtCount = 0;
  finalTime = 0;

  currentDailyId = getDailyId();

  const dailyIndex =
    getDailyChallengeIndex(currentDailyId);

  currentChallenge =
    DAILY_CHALLENGES[dailyIndex];

  // HUD
  timerText = scene.add.text(
    20,
    18,
    'Time: 0.000',
    {
      fontSize: '22px',
      color: '#ffffff'
    }
  );

  statusText = scene.add.text(
    480,
    18,
    'Find the key!',
    {
      fontSize: '22px',
      color: '#ffffff'
    }
  ).setOrigin(0.5, 0);

  dailyText = scene.add.text(
    940,
    18,
    `Daily #${currentDailyId}`,
    {
      fontSize: '18px',
      color: '#aaaaaa'
    }
  ).setOrigin(1, 0);

  // WALLS
  walls = scene.physics.add.staticGroup();

  createWall(scene, 480, 90, 840, 30);
  createWall(scene, 480, 510, 840, 30);
  createWall(scene, 75, 300, 30, 390);
  createWall(scene, 885, 300, 30, 390);

  createWall(scene, 300, 200, 300, 30);
  createWall(scene, 650, 330, 300, 30);

  // PLAYER
  player = scene.add.rectangle(
    PLAYER_START_X,
    PLAYER_START_Y,
    32,
    32,
    0x00ff88
  );

  scene.physics.add.existing(player);

  player.body.setCollideWorldBounds(true);

  // KEY
  keyItem = scene.add.circle(
    currentChallenge.key.x,
    currentChallenge.key.y,
    12,
    0xffff00
  );

  scene.physics.add.existing(
    keyItem,
    true
  );

  // EXIT
  exitZone = scene.add.rectangle(
    currentChallenge.exit.x,
    currentChallenge.exit.y,
    50,
    50,
    0x2266ff
  );

  scene.physics.add.existing(
    exitZone,
    true
  );

  // ENEMIES
  enemies = [];

  currentChallenge.enemies.forEach(
    (enemyData) => {

      const enemy = scene.add.circle(
        enemyData.x,
        enemyData.y,
        18,
        0xff3333
      );

      scene.physics.add.existing(enemy);

      enemy.body.setCollideWorldBounds(true);

      enemy.startX = enemyData.x;
      enemy.startY = enemyData.y;
      enemy.moveSpeed = enemyData.speed;

      enemies.push(enemy);
    }
  );

  // COLLISIONS
  scene.physics.add.collider(
    player,
    walls
  );

  enemies.forEach((enemy) => {

    scene.physics.add.collider(
      enemy,
      walls
    );

    scene.physics.add.overlap(
      player,
      enemy,
      () => {

        if (finished) return;

        caughtCount++;

        resetPositions();
      }
    );
  });

  // PLAYER / KEY
  scene.physics.add.overlap(
    player,
    keyItem,
    () => {

      if (hasKey || finished) return;

      hasKey = true;

      keyItem.destroy();

      statusText.setText(
        'Get to the exit!'
      );
    }
  );

  // PLAYER / EXIT
  scene.physics.add.overlap(
    player,
    exitZone,
    () => {

      if (!hasKey || finished) return;

      finishGame(scene);
    }
  );

  // INPUT
  cursors =
    scene.input.keyboard.createCursorKeys();

  startTime = scene.time.now;
  loadLeaderboard(); 
}

// UPDATE
function update(time) {
  if (finished) return;

  // TIMER
  const elapsed =
    (time - startTime) / 1000;

  timerText.setText(
    `Time: ${elapsed.toFixed(3)}`
  );

  // PLAYER MOVEMENT
  const speed = 220;

  player.body.setVelocity(0);

  if (cursors.left.isDown) {
    player.body.setVelocityX(-speed);
  }

  if (cursors.right.isDown) {
    player.body.setVelocityX(speed);
  }

  if (cursors.up.isDown) {
    player.body.setVelocityY(-speed);
  }

  if (cursors.down.isDown) {
    player.body.setVelocityY(speed);
  }

  if (
    player.body.velocity.x !== 0 ||
    player.body.velocity.y !== 0
  ) {
    player.body.velocity
      .normalize()
      .scale(speed);
  }

  // ENEMY CHASE
  enemies.forEach((enemy) => {

    this.physics.moveToObject(
      enemy,
      player,
      enemy.moveSpeed
    );
  });
}

// FINISH GAME
function finishGame(scene) {
  finished = true;

  player.body.setVelocity(0);

  enemies.forEach((enemy) => {
    enemy.body.setVelocity(0);
  });

  finalTime =
    (scene.time.now - startTime) / 1000;

  timerText.setText(
    `Time: ${finalTime.toFixed(3)}`
  );

  statusText.setText('Complete!');

  showResults(scene);
  submitScore();
}


// --------------------------------------------------
// RESULTS SCREEN
// --------------------------------------------------

function showResults(scene) {

  const overlay = scene.add.rectangle(
    480,
    300,
    600,
    340,
    0x000000,
    0.92
  );

  overlay.setStrokeStyle(
    3,
    0x888888
  );

  overlay.setDepth(100);


  scene.add.text(
    480,
    165,
    'DUNGEON DASH',
    {
      fontSize: '38px',
      color: '#ffffff',
      fontStyle: 'bold'
    }
  )
    .setOrigin(0.5)
    .setDepth(101);


  scene.add.text(
    480,
    215,
    `Daily #${currentDailyId}`,
    {
      fontSize: '20px',
      color: '#bbbbbb'
    }
  )
    .setOrigin(0.5)
    .setDepth(101);


  scene.add.text(
    480,
    260,
    `Time: ${finalTime.toFixed(3)} seconds`,
    {
      fontSize: '26px',
      color: '#ffffff'
    }
  )
    .setOrigin(0.5)
    .setDepth(101);


  scene.add.text(
    480,
    300,
    `Caught: ${caughtCount}`,
    {
      fontSize: '22px',
      color: '#ffffff'
    }
  )
    .setOrigin(0.5)
    .setDepth(101);


  scene.add.text(
    480,
    335,
    `Meanies: ${enemies.length}`,
    {
      fontSize: '22px',
      color: '#ffffff'
    }
  )
    .setOrigin(0.5)
    .setDepth(101);


  createButton(
    scene,
    365,
    405,
    'COPY SCORE',
    () => {
      copyScore(scene);
    }
  );


  createButton(
    scene,
    595,
    405,
    'PLAY AGAIN',
    () => {
      scene.scene.restart();
    }
  );
}


// --------------------------------------------------
// BUTTON
// --------------------------------------------------

function createButton(
  scene,
  x,
  y,
  label,
  callback
) {

  const button = scene.add.text(
    x,
    y,
    label,
    {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: {
        x: 18,
        y: 12
      }
    }
  );

  button
    .setOrigin(0.5)
    .setDepth(102)
    .setInteractive({
      useHandCursor: true
    });

  button.on(
    'pointerdown',
    callback
  );

  button.on(
    'pointerover',
    () => {
      button.setBackgroundColor(
        '#555555'
      );
    }
  );

  button.on(
    'pointerout',
    () => {
      button.setBackgroundColor(
        '#333333'
      );
    }
  );
}


// --------------------------------------------------
// COPY SCORE
// --------------------------------------------------

async function copyScore(scene) {

  const scoreText =
`🗝️ DUNGEON DASH #${currentDailyId}
⏱️ Time: ${finalTime.toFixed(3)}s
👾 Meanies: ${enemies.length}
💀 Caught: ${caughtCount}

https://eddiesgames.xyz/play/dungeon-dash`;

  try {

    await navigator.clipboard.writeText(
      scoreText
    );

    statusText.setText(
      'Score copied!'
    );

  } catch (error) {

    fallbackCopy(scoreText);

    statusText.setText(
      'Score copied!'
    );
  }
}


// --------------------------------------------------
// FALLBACK COPY
// --------------------------------------------------

function fallbackCopy(text) {

  const textarea =
    document.createElement('textarea');

  textarea.value = text;

  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';

  document.body.appendChild(
    textarea
  );

  textarea.focus();
  textarea.select();

  document.execCommand('copy');

  textarea.remove();
}


// --------------------------------------------------
// WALL CREATION
// --------------------------------------------------

function createWall(
  scene,
  x,
  y,
  width,
  height
) {

  const wall = scene.add.rectangle(
    x,
    y,
    width,
    height,
    0x666666
  );

  walls.add(wall);
}


// --------------------------------------------------
// RESET AFTER BEING CAUGHT
// --------------------------------------------------

function resetPositions() {

  player.body.reset(
    PLAYER_START_X,
    PLAYER_START_Y
  );

  enemies.forEach((enemy) => {

    enemy.body.reset(
      enemy.startX,
      enemy.startY
    );
  });

  statusText.setText(
    hasKey
      ? 'Get to the exit!'
      : 'Find the key!'
  );
}


// --------------------------------------------------
// DAILY DATE
// --------------------------------------------------

function getDailyId() {

  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          'America/New_York',

        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    ).formatToParts(
      new Date()
    );

  const values = {};

  parts.forEach((part) => {
    values[part.type] =
      part.value;
  });

  return (
    values.year +
    values.month +
    values.day
  );
}


// --------------------------------------------------
// DAILY CHALLENGE SELECTION
// --------------------------------------------------

function getDailyChallengeIndex(
  dailyId
) {

  let hash = 0;

  for (
    let i = 0;
    i < dailyId.length;
    i++
  ) {

    hash =
      ((hash << 5) - hash) +
      dailyId.charCodeAt(i);

    hash |= 0;
  }

  return (
    Math.abs(hash) %
    DAILY_CHALLENGES.length
  );
}

// --------------------------------------------------
// LEADERBOARD
// --------------------------------------------------

async function loadLeaderboard() {
  const etDate = getEtDateKey();

  try {
    const response = await fetch(
      `/api/dungeon-dash/leaderboard?etDate=${encodeURIComponent(etDate)}`
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error('Leaderboard API error:', data);

      document.getElementById(
        'leaderboard-list'
      ).innerHTML = '<li>Leaderboard unavailable</li>';

      return;
    }

    renderLeaderboard(
      etDate,
      data.entries || []
    );

  } catch (error) {
    console.error(
      'Leaderboard load failed:',
      error
    );

    document.getElementById(
      'leaderboard-list'
    ).innerHTML = '<li>Leaderboard unavailable</li>';
  }
}


function renderLeaderboard(
  etDate,
  entries
) {

  const dateEl =
    document.getElementById(
      'leaderboard-date'
    );

  const listEl =
    document.getElementById(
      'leaderboard-list'
    );

  dateEl.textContent =
    etDate;

  listEl.innerHTML = '';

  if (!entries.length) {

    const item =
      document.createElement('li');

    item.textContent =
      'No runs yet';

    listEl.appendChild(item);

    return;
  }


  entries.forEach((entry) => {

    const item =
      document.createElement('li');

    const time =
      document.createElement('div');

    time.className =
      'score-time';

    time.textContent =
      formatTimeMs(entry.time_ms);


    const detail =
      document.createElement('div');

    detail.className =
      'score-detail';

    detail.textContent =
      `${entry.caught} caught`;


    item.appendChild(time);
    item.appendChild(detail);

    listEl.appendChild(item);
  });
}


// --------------------------------------------------
// SUBMIT SCORE
// --------------------------------------------------

async function submitScore() {

  const completedAt =
    Date.now();

  const etDate =
    getEtDateKey(
      new Date(completedAt)
    );

  try {

    const response = await fetch(
      '/api/dungeon-dash/submit',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          etDate,
          timeMs:
            Math.floor(
              finalTime * 1000
            ),

          caught:
            caughtCount,

          meanies:
            enemies.length,

          completedAt
        })
      }
    );

    if (!response.ok) {

      console.error(
        'Score submission failed'
      );

      return;
    }

    await loadLeaderboard();

  } catch (error) {

    console.error(
      'Score submission failed:',
      error
    );
  }
}


// --------------------------------------------------
// EASTERN DATE KEY
// --------------------------------------------------

function getEtDateKey(
  date = new Date()
) {

  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'America/New_York',

      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
  ).format(date);
}


// --------------------------------------------------
// TIME DISPLAY
// --------------------------------------------------

function formatTimeMs(ms) {

  const seconds =
    Math.floor(ms / 1000);

  const millis =
    ms % 1000;

  return (
    `${seconds}.` +
    `${String(millis).padStart(3, '0')}s`
  );
}
