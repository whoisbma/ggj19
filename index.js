const canvas = document.getElementById('game_canvas');
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const WIDTH = 800;
const HEIGHT = 800;
const SPRITE_W = 64;
const SPRITE_H = 64;

const args = window.location.search.split('?');
const COLS = parseInt(args[1]) || 8;
const ROWS = parseInt(args[2]) || 8;
const MARGIN = parseInt(args[3]) || 80;
const PADDING = parseInt(args[4]) || 10;

const ITEM_SCALE_W = ((WIDTH - (MARGIN * 2) - (COLS * PADDING))/ COLS)/SPRITE_W;
const ITEM_SCALE_H = ((HEIGHT - (MARGIN * 2) - (ROWS * PADDING)) / ROWS)/SPRITE_H;
const ITEM_SCALE = Math.min(ITEM_SCALE_W, ITEM_SCALE_H);

const game = new Phaser.Game({
  width: 800, 
  height: 800, 
  type: Phaser.AUTO, 
  parent: 'game_canvas',
  title: 'ggj19',
  scene: {
    preload: preload,
    create: create,
  },
});

let items;
let cursor;
let selectedItem = null;

function preload() {
  this.load.image('background', './assets/background.jpg');
  this.load.image('book', './assets/book.png');
  this.load.image('oilbottle', './assets/oilbottle.png');
  this.load.image('plant', './assets/plant.png');
  this.load.image('scissors', './assets/scissors.png');
}

function create() {
  bg = this.add.image(400, 400, 'background');
  bg.setDepth(-10);
  bg.setDisplaySize(800, 800);
  items = this.add.group();

  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < ROWS; j++) {
      let r = Phaser.Math.Between(0, 3);
      let item;
      const startX = (SPRITE_W * ITEM_SCALE_W) / 2;
      const startY = (SPRITE_H * ITEM_SCALE_H) / 2; 
      const x = startX + MARGIN + i * ITEM_SCALE_W * SPRITE_W + PADDING * i;
      const y = startY + MARGIN + j * ITEM_SCALE_H * SPRITE_H + PADDING * j;
      switch (Math.floor(r)) {
        case 0:
          item = items.create(x, y, 'oilbottle');
          item.category = 0;
          break;
        case 1:
          item = items.create(x, y, 'book');
          item.category = 1;
          break;
        case 2:
          item = items.create(x, y, 'plant');
          item.category = 2;
          break;
        case 3:
          item = items.create(x, y, 'scissors');
          item.category = 3;
          break;
        default:
          break;
      }
      
      item.setScale(ITEM_SCALE, ITEM_SCALE);
      item.setInteractive();
      item.posX = i;
      item.posY = j;
      item.id = getItemIdFromXY(i, j);
      item.name = 'item' + i.toString() + 'x' + j.toString();
    }
  }

  cursor = this.make.graphics({
    x: 0,
    y: 0,
    add: false, 
    fillStyle: {
      color: 0xffffff,
      alpha: 0.5
    },
  });
  cursor.fillRect(0, 0, 96, 96);
  cursor.generateTexture('block', 96, 96);
  let highlighted = this.add.image(96, 96, 'block');
  highlighted.setDepth(-1);

  this.input.on('pointerover', (pointer, gameObjects) => {
    highlighted.setPosition(gameObjects[0].x, gameObjects[0].y);
  });

  this.input.on('pointerdown', (pointer, gameObjects) => {
    // if its part of items group,
    if (items.children.entries.indexOf(gameObjects[0]) > -1) {
      selectedItem = gameObjects[0];
      selectedItem.setTint(0x333333);
    }
  });

  this.input.on('pointerup', (pointer, gameObjects) => {
    if (selectedItem !== null) {
      if (gameObjects.length > 0) {
        const swappedItem = gameObjects[0];
        if (isAdjacent(swappedItem, selectedItem)) {
          swapPosition(selectedItem, swappedItem);
        }
      }
    selectedItem.clearTint();
    selectedItem = null;
    } 
  });
}

function swapPosition(item1, item2) {
  let newPos = [item2.x, item2.y];
  let newGridPos = [item2.posX, item2.posY];
  item2.posX = item1.posX;
  item2.posY = item1.posY;
  item2.id = getItemIdFromXY(item2.posX, item2.posY)
  item1.posX = newGridPos[0];
  item1.posY = newGridPos[1];
  item1.id = getItemIdFromXY(item1.posX, item1.posY);

  const matches1 = getMatchesAtPosition(item1.posX, item1.posY, getItemColor(item1));
  const matches2 = getMatchesAtPosition(item2.posX, item2.posY, getItemColor(item2));

  const onComplete = () => {
    if (matches1.length < 3 && matches2.length < 3) {
      let newPos = [item2.x, item2.y];
      let newGridPos = [item2.posX, item2.posY];
      item2.posX = item1.posX;
      item2.posY = item1.posY;
      item2.id = getItemIdFromXY(item2.posX, item2.posY)
      item1.posX = newGridPos[0];
      item1.posY = newGridPos[1];
      item1.id = getItemIdFromXY(item1.posX, item1.posY);
      tweenItemPos(item1, newPos[0], newPos[1], () => {});
      tweenItemPos(item2, item1.x, item1.y, () => {});
    } else {
      handleMatches(matches1);
      handleMatches(matches2);
    }
  };

  tweenItemPos(item1, newPos[0], newPos[1], () => {});
  tweenItemPos(item2, item1.x, item1.y, onComplete);
}

function handleMatches(matches) {
  if (matches.length > 2) {
    for (let i = 0 ; i < matches.length; i++) {
      let matchToDestroy = items.getChildren().find((item) => item.id === matches[i]);
      if (matchToDestroy) {
        matchToDestroy.destroy();
      }
    }
  } 
}

function getItemColor(item) {
  if (!item) return null;
  return item.category;
}

function isAdjacent(item1, item2) {
  // console.log(Math.abs(item1.posX - item2.posX), Math.abs(item1.posY - item2.posY));
  return ((Math.abs(item1.posX - item2.posX) === 1 && Math.abs(item1.posY - item2.posY) === 0) || 
          (Math.abs(item1.posX - item2.posX) === 0 && Math.abs(item1.posY - item2.posY) === 1));     
}

function getItemIdFromXY(x, y) {
  return x + y * COLS;
}

function getItemXYFromId(i) {
  return [Math.floor(i % COLS), Math.floor(i / COLS)];
}

function getItemByCoord(x, y) {
  return items.getChildren().find((item) => item.id === getItemIdFromXY(x, y)); //.iterate('id', getItemIdFromXY(x, y), Phaser.Group.RETURN_CHILD);
}

function getMatchesAtPosition(x, y, color, opt_results) {
  results = opt_results || [];
  for (let i = Math.max(x - 1, 0); i <= Math.min(x + 1, COLS - 1); i++) {
    if (i !== x) {
      let item = getItemByCoord(i, y);
      if (color === getItemColor(item)) {
        if (!results.includes(item.id)) {
          results.push(item.id);
          results.concat(getMatchesAtPosition(i, y, color, results));
        } 
      }
    }
  }
  for (let j = Math.max(y - 1, 0); j <= Math.min(y + 1, COLS - 1); j++) {
    if (j !== y) {
      let item = getItemByCoord(x, j);
      if (color === getItemColor(item)) { 
        if (!results.includes(item.id)) {
          results.push(item.id);
          results.concat(getMatchesAtPosition(x, j, color, results));
        }
      }
    }
  }
  return results;
}

function tweenItemPos(item, newPosX, newPosY, callback) {
  // console.log('tween', item.name, 'from', item.x, item.y, 'to', newPosX, newPosY);
  return game.scene.scenes[0].tweens.add({
    targets: item,
    x: newPosX,
    y: newPosY,
    duration: 500,
    ease: 'Power2',
    onComplete: callback,
  });
}
