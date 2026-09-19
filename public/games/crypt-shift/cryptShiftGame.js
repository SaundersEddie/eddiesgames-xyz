import {
  createGame,
  generateDailyRoom,
  getEasternDateKey,
  parseLevel,
  samePosition,
  takeTurn,
} from './cryptShiftRules.js';

const TILE = 56;
const BOARD_X = 48;
const BOARD_Y = 112;

class CryptShiftScene extends Phaser.Scene {
  constructor() { super('crypt-shift'); }

  create() {
    this.board = this.add.graphics();
    this.pieces = this.add.group();
    this.hud = this.add.text(48, 34, '', {
      color: '#dcecff', fontFamily: 'Arial', fontSize: '22px', fontStyle: 'bold',
    });
    this.message = this.add.text(720, 36, '', {
      align: 'right', color: '#67d6ff', fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.input.keyboard.on('keydown', (event) => this.handleKeyboard(event));
    this.input.on('pointerup', (pointer) => this.handlePointer(pointer));
    document.querySelector('#restart').addEventListener('click', () => this.restartRoom());
    this.restartRoom();
  }

  restartRoom() {
    this.state = createGame(parseLevel(generateDailyRoom()));
    this.message.setText(`Daily ${getEasternDateKey()}`);
    this.renderState();
  }

  handleKeyboard(event) {
    const directions = {
      ArrowUp: 'up', w: 'up', W: 'up', ArrowRight: 'right', d: 'right', D: 'right',
      ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left',
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    this.move(direction);
  }

  handlePointer(pointer) {
    const tile = {
      x: Math.floor((pointer.x - BOARD_X) / TILE),
      y: Math.floor((pointer.y - BOARD_Y) / TILE),
    };
    const dx = tile.x - this.state.player.x;
    const dy = tile.y - this.state.player.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return;
    if (dx === 1) this.move('right');
    else if (dx === -1) this.move('left');
    else if (dy === 1) this.move('down');
    else this.move('up');
  }

  move(direction) {
    const next = takeTurn(this.state, direction);
    this.state = next;
    if (next.status === 'won') this.message.setText('CRYPT CLEARED');
    else if (next.status === 'lost') this.message.setText('THE CRYPT CLAIMED YOU');
    else if (next.events.some((event) => event.type === 'player-damaged')) this.message.setText('The guardian strikes');
    else if (next.events.some((event) => event.type === 'rune-collected')) this.message.setText('Rune secured');
    else this.message.setText('Every step shifts the crypt');
    this.renderState();
  }

  renderState() {
    this.drawBoard();
    this.pieces.clear(true, true);
    this.state.runes.forEach((position) => this.drawRune(position));
    this.drawExit(this.state.level.exit);
    this.state.enemies.forEach((enemy) => this.drawEnemy(enemy.position));
    this.drawPlayer(this.state.player);
    this.hud.setText(`HP ${this.state.health}    RUNES ${this.state.collectedRunes}/${this.state.level.runeStarts.length}    TURN ${this.state.turn}`);
  }

  drawBoard() {
    this.board.clear();
    for (let y = 0; y < this.state.level.height; y += 1) {
      for (let x = 0; x < this.state.level.width; x += 1) {
        const px = BOARD_X + x * TILE;
        const py = BOARD_Y + y * TILE;
        const wall = this.state.level.walls.has(`${x},${y}`);
        this.board.fillStyle(wall ? 0x15202a : 0x0d141b, 1);
        this.board.fillRect(px, py, TILE - 2, TILE - 2);
        if (!wall) {
          this.board.lineStyle(1, 0x263744, 0.8);
          this.board.strokeRect(px + 1, py + 1, TILE - 4, TILE - 4);
        }
        if (samePosition({ x, y }, this.state.level.exit)) {
          this.board.lineStyle(2, 0x45d483, 0.9);
          this.board.strokeRect(px + 7, py + 7, TILE - 16, TILE - 16);
        }
      }
    }
  }

  center(position) {
    return { x: BOARD_X + position.x * TILE + TILE / 2 - 1,
      y: BOARD_Y + position.y * TILE + TILE / 2 - 1 };
  }

  drawPlayer(position) {
    const point = this.center(position);
    const piece = this.add.circle(point.x, point.y, 16, 0x67d6ff).setStrokeStyle(3, 0xdff7ff);
    this.pieces.add(piece);
  }

  drawEnemy(position) {
    const point = this.center(position);
    const piece = this.add.rectangle(point.x, point.y, 27, 27, 0xe25555)
      .setAngle(45).setStrokeStyle(3, 0xffb1a8);
    this.pieces.add(piece);
  }

  drawRune(position) {
    const point = this.center(position);
    const piece = this.add.star(point.x, point.y, 4, 7, 15, 0xa46cff).setStrokeStyle(2, 0xe6d7ff);
    this.pieces.add(piece);
  }

  drawExit(position) {
    const point = this.center(position);
    const piece = this.add.rectangle(point.x, point.y, 24, 32, 0x194f35, 0.8).setStrokeStyle(2, 0x45d483);
    this.pieces.add(piece);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 768,
  height: 720,
  backgroundColor: '#090d12',
  scene: [CryptShiftScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
