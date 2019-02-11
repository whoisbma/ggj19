const canvas = document.getElementById('game_canvas');
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const WIDTH = 900;
const HEIGHT = 900;
const SPRITE_W = 64;
const SPRITE_H = 64;

const args = window.location.search.split('?');
const COLS = parseInt(args[1]) || 7;
const ROWS = parseInt(args[2]) || 7;
const MARGIN = parseInt(args[3]) || 130;
const PADDING = parseInt(args[4]) || 4;

const ITEM_SCALE_W = ((WIDTH - (MARGIN * 2) - (COLS * PADDING))/ COLS)/SPRITE_W;
const ITEM_SCALE_H = ((HEIGHT - (MARGIN * 2) - (ROWS * PADDING)) / ROWS)/SPRITE_H;
const ITEM_SCALE = Math.min(ITEM_SCALE_W, ITEM_SCALE_H);

const ITEMS = [
  'book',
  'oilbottle',
  'plant',
  'scissors',
  'bodegacup',
  'calculator'
];

const NUM_ITEMS = ITEMS.length - 0;

const startX = (SPRITE_W * ITEM_SCALE_W) / 2;
const startY = (SPRITE_H * ITEM_SCALE_H) / 2; 

let trash = 0;
let boxes = 0;

const game = new Phaser.Game({
  width: 800, 
  height: 950, 
  type: Phaser.AUTO, 
  parent: 'game_canvas',
  title: 'ggj19',
  scene: {
    preload: preload,
    create: create,
  },
});

// phaser groups
let itemsGroup; // the current sprites in the scene
let itemReqsGroup; // the current sprites listed as requirements for the box

let boardState = [];  // state of the board itself, are cells occupied?
let selectedItem = null;
let trashText;
let boxesText;
let boxIdPositions = [];
let boxGridGraphic = [];

// debug stuff
let debug_gridRects = []; // rects for visualizing board state

function preload() {
  this.load.image('background', './assets/background.jpg');
  this.load.image('rug', './assets/rug.png');
  for (let i = 0; i < NUM_ITEMS; i++) {
    this.load.image(ITEMS[i], './assets/' + ITEMS[i] + '.png');
  }
}

function setItemRequirements() {
  for (let i = 0; i < 4; i++) {
    let r = Phaser.Math.Between(0, NUM_ITEMS - 1);
    let x = 500 + 90 * i;
    let y = 920;
    let item = itemReqsGroup.create(x, y, ITEMS[r]);
    item.itemType = r;
    item.setScale(ITEM_SCALE/1.5, ITEM_SCALE/1.5);
  }
}

function containsRequiredItem(x, y) {
  // if (itemRequirements.contains(getItemType(getItemByXY(x, y)))) {
  //   return true;
  // }
  // return false;
}

function setBoxArea(instance) {
  boxIdPositions = [];

  let startX = Math.floor((COLS) / 2);
  let startY = Math.floor((ROWS) / 2);

  let graphics = instance.make.graphics().lineStyle(5, 0x000000, 1).strokeRect(0, 0, ITEM_SCALE * SPRITE_W, ITEM_SCALE * SPRITE_H);

  graphics.generateTexture('boxRect', ITEM_SCALE * SPRITE_W, ITEM_SCALE * SPRITE_H);

  for (let i = startX - 1; i < startX + 2; i++) {
    boxGridGraphic[i] = [];
    for (let j = startY - 1; j < startY + 2; j++) {
      boxIdPositions.push(getIdxFromXY(i, j));

      let pos = getPixelPosFromXY(i,j);
      boxGridGraphic[i][j] = instance.add.image(pos.x, pos.y, 'boxRect');
      boxGridGraphic[i][j].setDepth(-1);
    }
  }

  graphics.destroy();
}

function createDebugGridGraphics(instance) {
  let graphics = instance.make.graphics().fillStyle(0xffffff).fillRect(0, 0, ITEM_SCALE * SPRITE_W, ITEM_SCALE * SPRITE_H);
  graphics.generateTexture('debugRect', ITEM_SCALE * SPRITE_W, ITEM_SCALE * SPRITE_H);

  for (let i = 0; i < COLS; i++) {
    debug_gridRects[i] = [];
    for (let j = 0; j < ROWS; j++) {
      let pos = getPixelPosFromXY(i,j);
      debug_gridRects[i][j] = instance.add.image(pos.x, pos.y, 'debugRect');
      debug_gridRects[i][j].setDepth(-2);
      debug_gridRects[i][j].setTint(0xaaaaff);
      debug_gridRects[i][j].visible = true;
      debug_gridRects[i][j].setAlpha(0.5);
    }
  }
}

function createCursorGraphic(instance) {
  let graphics = instance.make.graphics().fillStyle(0xffffff, 0.5).fillRect(0, 0, ITEM_SCALE * SPRITE_W, ITEM_SCALE * SPRITE_H);
  graphics.generateTexture('cursorRect', ITEM_SCALE * SPRITE_W, ITEM_SCALE * SPRITE_H);

  let cursor = instance.add.image(ITEM_SCALE * SPRITE_W, ITEM_SCALE * SPRITE_H, 'cursorRect');
  cursor.setDepth(-1);

  instance.input.on('pointerover', (pointer, gameObjects) => {
    cursor.setPosition(gameObjects[0].x, gameObjects[0].y);
  });
}

function create() {
  itemsGroup = this.add.group();
  itemReqsGroup = this.add.group();

  setBoxArea(this);
  createDebugGridGraphics(this);
  createCursorGraphic(this);

  setItemRequirements();

  trashText = this.add.text(50, 895, 'trash: 0', { fontSize: '24px', fill: '#fff' });
  boxesText = this.add.text(50, 925, 'packed boxes: 0', { fontSize: '24px', fill: '#fff' });
  bg = this.add.image(450, 450, 'rug');
  bg.setDepth(-10);
  bg.setDisplaySize(800, 800);
  bg.setScale(1.5, 1.5);

  for (let i = 0; i < COLS; i++) {
    boardState[i] = [];
    for (let j = 0; j < ROWS; j++) {
      boardState[i][j] = true;
      createItemAtXY(i, j);
    }
  }

  this.input.on('pointerdown', (pointer, gameObjects) => {
    // if its part of items group,
    if (itemsGroup.children.entries.indexOf(gameObjects[0]) > -1) {
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

function createItemAtXY(posX, posY) {
  let item;
  const x = startX + MARGIN + posX * ITEM_SCALE_W * SPRITE_W + PADDING * posX;
  const y = startY + MARGIN + posY * ITEM_SCALE_H * SPRITE_H + PADDING * posY;

  let r = Phaser.Math.Between(0, NUM_ITEMS - 1);

  while (getMatchesAtPosition(posX, posY, r).length >= 2) {
    r = Phaser.Math.Between(0, NUM_ITEMS - 1);
  }
  // console.log(getMatchesAtPosition(i, j, r));
  item = itemsGroup.create(x, y, ITEMS[r]);
  item.itemType = r;  
  item.setScale(ITEM_SCALE, ITEM_SCALE);
  item.setInteractive();
  item.posX = posX;
  item.posY = posY;
  item.idx = getIdxFromXY(posX, posY);
  item.name = 'item' + posX.toString() + 'x' + posY.toString();
}

function swapPosition(item1, item2) {
  let newPos = [item2.x, item2.y];
  let newGridPos = [item2.posX, item2.posY];
  item2.posX = item1.posX;
  item2.posY = item1.posY;
  item2.idx = getIdxFromXY(item2.posX, item2.posY)
  item1.posX = newGridPos[0];
  item1.posY = newGridPos[1];
  item1.idx = getIdxFromXY(item1.posX, item1.posY);

  const matches1 = getMatchesAtPosition(item1.posX, item1.posY, getItemType(item1));
  const matches2 = getMatchesAtPosition(item2.posX, item2.posY, getItemType(item2));

  const onComplete = () => {
    if (matches1.length < 3 && matches2.length < 3) {
      let newPos = [item2.x, item2.y];
      let newGridPos = [item2.posX, item2.posY];
      item2.posX = item1.posX;
      item2.posY = item1.posY;
      item2.idx = getIdxFromXY(item2.posX, item2.posY)
      item1.posX = newGridPos[0];
      item1.posY = newGridPos[1];
      item1.idx = getIdxFromXY(item1.posX, item1.posY);
      tweenItemPos(item1, newPos[0], newPos[1], () => {});
      tweenItemPos(item2, item1.x, item1.y, () => {});
    }
  };

  tweenItemPos(item1, newPos[0], newPos[1], () => {});
  tweenItemPos(item2, item1.x, item1.y, onComplete);

  if (matches1.length > 2 && matches2.length > 2) {
    handleMatches(matches1.concat(matches2)); 
  } else if (matches1.length > 2) {
    handleMatches(matches1);
  } else if (matches2.length > 2) {
    handleMatches(matches2);
  }
}

function killItemAtXY(x, y) {
  let item = getItemByXY(x, y);
  if (!item) return;

  tweenDelete(item, () => {
    item.destroy();
    boardState[x][y] = false;
    debug_gridRects[x][y].setTint(0xff00ff);
    shiftDisplacedItems();
  });
}

function getPixelPosFromXY(x, y) {
  const startX = (SPRITE_W * ITEM_SCALE_W) / 2;
  const startY = (SPRITE_H * ITEM_SCALE_H) / 2; 
  const newX = startX + MARGIN + x * ITEM_SCALE_W * SPRITE_W + PADDING * x;
  const newY = startY + MARGIN + y * ITEM_SCALE_H * SPRITE_H + PADDING * y;
  return {
    x: newX,
    y: newY,
  }
}

function shiftDisplacedItems() {
  let totalDisplacedItems = [];
  let dir = 0; // 0 top, 1 right, 2 down, 3 left ( FROM DIRECTION ) 

  let PERP_DIR, LANE_DIR, INCR;
  if (dir === 0) {
    DIR = boardState.length;
    LANE_START = 0;
    LANE_END = boardState[0].length;
    INCR = 1;
  }

  for (let i = 0; i < COLS; i++) {
    // from the bottom, count up.
    // when you find an empty spot, start keeping track.
    // the next time you find a full spot, move it down.
    let emptyStart = -1;
    for (let j = ROWS - 1; j >= 0; --j) {
      if (!boardState[i][j]) {
        if (emptyStart === -1) {
          emptyStart = j;
        } 
      } else {
        if (emptyStart !== -1) {
          let displacedItemsAtRow = shiftAtPosByAmount(i, j, emptyStart - j, dir);
          totalDisplacedItems = totalDisplacedItems.concat(displacedItemsAtRow);
          j = emptyStart ;
          emptyStart = -1;
        }
      }
    }
  }

  let matches = [];
  totalDisplacedItems.forEach((item, i) => {
    item.setTint(0x00ff00);
    let theseMatches = getMatchesAtPosition(item.posX, item.posY, getItemType(item));
    if (theseMatches.length > 2) {
      matches = matches.concat(getMatchesAtPosition(item.posX, item.posY, getItemType(item)));
    }
  });
  let filteredMatches = [];
  matches.forEach((item, i) => {
    if (!filteredMatches.includes(item)) {
      filteredMatches.push(item);
    }
  });
  handleMatches(filteredMatches);    
}

function shiftAtPosByAmount(x, y, amt, dir) {
  let displacedItems = [];
  if (dir === 0) {
    for (let yy = y; yy >= 0; yy--) {
      // console.log('move at', x, yy, 'by', amt);
      let targetY = yy + amt;
      let itemToMove = getItemByXY(x, yy);
      if (!itemToMove) {
        boardState[x][targetY] = false;
        debug_gridRects[x][targetY].setTint(0xff00ff);
      } else {
        itemToMove.posY = targetY;
        let targetPos = getPixelPosFromXY(x, targetY);
        itemToMove.idx = getIdxFromXY(itemToMove.posX, itemToMove.posY);
        boardState[x][targetY] = true;
        debug_gridRects[x][targetY].setTint(0xaaaaff);
        displacedItems.push(itemToMove);

        tweenItemPos(itemToMove, targetPos.x, targetPos.y, () => {itemToMove.setTint(0xffffff);});        
      }
    }

    for (let y = 0; y < amt; y++) {
      boardState[x][y] = false;
      debug_gridRects[x][y].setTint(0xff00ff);
    }
  }

  return displacedItems;
}

function handleMatches(matches) {
  // console.log('handling matches!');
  let matchesToDestroy = [];
  if (matches.length > 2) {
    for (let i = 0 ; i < matches.length; i++) {
      let matchToDestroy = itemsGroup.getChildren().find((item) => item.idx === matches[i]);
      if (matchToDestroy) {    
        matchesToDestroy.push(matchToDestroy);
        let pos = getXYFromIdx(matchesToDestroy[i].idx);
        boardState[pos.x][pos.y] = false;
        debug_gridRects[pos.x][pos.y].setTint(0xff00ff);
      }
    }
  }

  tweenDelete(matchesToDestroy, () => {
    let numDeleted = 0;
    for (let i = 0; i < matchesToDestroy.length; i++) {
      numDeleted++;
      matchesToDestroy[i].destroy();
      trash++;
      trashText.setText('trash: ' + trash);
    }
    if (numDeleted > 0) {
      shiftDisplacedItems();      
    } else {
      fillEmptyCells();
    }
  });
}

function fillEmptyCells() {
  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < ROWS; j++) {
      if (!boardState[i][j]) {
        createItemAtXY(i, j);
        boardState[i][j] = true;
        debug_gridRects[i][j].setTint(0xffffff);
      }
    }
  }
}

function getItemType(item) {
  if (!item) return null;
  return item.itemType;
}

function isAdjacent(item1, item2) {
  // console.log(Math.abs(item1.posX - item2.posX), Math.abs(item1.posY - item2.posY));
  return ((Math.abs(item1.posX - item2.posX) === 1 && Math.abs(item1.posY - item2.posY) === 0) || 
          (Math.abs(item1.posX - item2.posX) === 0 && Math.abs(item1.posY - item2.posY) === 1));     
}

function getIdxFromXY(x, y) {
  return x + y * COLS;
}

function getXYFromIdx(i) {
  return {
    x: Math.floor(i % COLS),
    y: Math.floor(i / COLS),
  };
}

function getItemByXY(x, y) {
  return itemsGroup.getChildren().find((item) => item.idx === getIdxFromXY(x, y)); //.iterate('id', getIdxFromXY(x, y), Phaser.Group.RETURN_CHILD);
}

function getMatchesAtPosition(x, y, color, opt_results) {
  results = opt_results || [];
  for (let i = Math.max(x - 1, 0); i <= Math.min(x + 1, COLS - 1); i++) {
    if (i !== x) {
      let item = getItemByXY(i, y);
      if (color === getItemType(item)) {
        if (!results.includes(item.idx)) {
          results.push(item.idx);
          results = getMatchesAtPosition(i, y, color, results);
        } 
      }
    }
  }
  for (let j = Math.max(y - 1, 0); j <= Math.min(y + 1, COLS - 1); j++) {
    if (j !== y) {
      let item = getItemByXY(x, j);
      if (color === getItemType(item)) { 
        if (!results.includes(item.idx)) {
          results.push(item.idx);
          results = getMatchesAtPosition(x, j, color, results);
        }
      }
    }
  }
  return results;
}

function tweenDelete(item, callback) {
  return game.scene.scenes[0].tweens.add({
    targets: item,
    scaleX: 0,
    scaleY: 0,
    duration: 250,
    ease: 'Power2',
    delay: 600,
    onComplete: callback,
  });
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
