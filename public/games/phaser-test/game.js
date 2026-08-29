const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: '#181818',
  parent: 'game',

  scene: {
    create,
    update
  }
};

const game = new Phaser.Game(config);

let player;
let cursors;

function create() {
  this.add
    .text(480, 80, 'PHASER TEST', {
      fontSize: '48px',
      color: '#ffffff'
    })
    .setOrigin(0.5);

  this.add
    .text(480, 130, 'Use the arrow keys', {
      fontSize: '20px',
      color: '#aaaaaa'
    })
    .setOrigin(0.5);

  player = this.add.rectangle(
    480,
    300,
    60,
    60,
    0xff7a00
  );

  cursors = this.input.keyboard.createCursorKeys();
}

function update() {
  const speed = 5;

  if (cursors.left.isDown) {
    player.x -= speed;
  }

  if (cursors.right.isDown) {
    player.x += speed;
  }

  if (cursors.up.isDown) {
    player.y -= speed;
  }

  if (cursors.down.isDown) {
    player.y += speed;
  }
}
