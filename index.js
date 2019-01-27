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
let itemsOnBoard = [];
let cursor;
let occupiedGrid = [];
let occupiedGridGraphic = [];
let selectedItem = null;

function preload() {
  this.load.image('background', './assets/background.jpg');
  this.load.image('book', './assets/book.png');
  this.load.image('oilbottle', './assets/oilbottle.png');
  this.load.image('plant', './assets/plant.png');
  this.load.image('scissors', './assets/scissors.png');
  this.load.image('bodegacup', './assets/bodegacup.png');
  this.load.image('calculator', './assets/calculator.png');
}

function create() {
  // bg = this.add.image(400, 400, 'background');
  // bg.setDepth(-10);
  // bg.setDisplaySize(800, 800);
  items = this.add.group();

  for (let i = 0; i < COLS; i++) {
    itemsOnBoard[i] = [];
    occupiedGrid[i] = [];
    occupiedGridGraphic[i] = [];
    for (let j = 0; j < ROWS; j++) {
      itemsOnBoard[i][j] = true;

      let item;
      const startX = (SPRITE_W * ITEM_SCALE_W) / 2;
      const startY = (SPRITE_H * ITEM_SCALE_H) / 2; 
      const x = startX + MARGIN + i * ITEM_SCALE_W * SPRITE_W + PADDING * i;
      const y = startY + MARGIN + j * ITEM_SCALE_H * SPRITE_H + PADDING * j;

      occupiedGrid[i][j] = this.make.graphics({
        x: x,
        y: y, 
        add: false,
        fillStyle: {
          color: 0xffffff,
          alpha:1,
        },
      });
      occupiedGrid[i][j].fillRect(0, 0, ITEM_SCALE * SPRITE_W, ITEM_SCALE * SPRITE_H);
      occupiedGrid[i][j].generateTexture('debugblock', ITEM_SCALE * SPRITE_W, ITEM_SCALE * SPRITE_H);
      occupiedGridGraphic[i][j] = this.add.image(ITEM_SCALE * SPRITE_W, ITEM_SCALE * SPRITE_H, 'debugblock');
      occupiedGridGraphic[i][j].setPosition(x, y);
      occupiedGridGraphic[i][j].setDepth(-10);
      occupiedGridGraphic[i][j].setTint(0xffff00);
      occupiedGridGraphic[i][j].visible = false;

      let r = Phaser.Math.Between(0, 5);

      while (getMatchesAtPosition(i, j, r).length >= 2) {
        r = Phaser.Math.Between(0, 5);
      }
      // console.log(getMatchesAtPosition(i, j, r));

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
        case 4:
          item = items.create(x, y, 'bodegacup');
          item.category = 4;
          break;
        case 5:
          item = items.create(x, y, 'calculator');
          item.category = 5;
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
  cursor.fillRect(0, 0, ITEM_SCALE * SPRITE_W, ITEM_SCALE * SPRITE_H);
  cursor.generateTexture('block', ITEM_SCALE * SPRITE_W, ITEM_SCALE * SPRITE_H);
  let highlighted = this.add.image(ITEM_SCALE * SPRITE_W, ITEM_SCALE * SPRITE_H, 'block');
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
  let item = getItemByCoord(x, y);
  if (!item) return;

  tweenDelete(item, () => {
    item.destroy();
    itemsOnBoard[x][y] = false;
    occupiedGridGraphic[x][y].setTint(0xff00ff);
    shiftDisplacedItems();
  });
}

function getPositionFromXY(x, y) {
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
    DIR = itemsOnBoard.length;
    LANE_START = 0;
    LANE_END = itemsOnBoard[0].length;
    INCR = 1;
  }

  for (let i = 0; i < itemsOnBoard.length; i++) {
    // from the bottom, count up.
    // when you find an empty spot, start keeping track.
    // the next time you find a full spot, move it down.
    let emptyStart = -1;
    for (let j = itemsOnBoard[0].length - 1; j >= 0; --j) {
      if (!itemsOnBoard[i][j]) {
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
    // item.setTint(0x00ff00);
    let theseMatches = getMatchesAtPosition(item.posX, item.posY, getItemColor(item));
    if (theseMatches.length > 2) {
      matches = matches.concat(getMatchesAtPosition(item.posX, item.posY, getItemColor(item)));
    }
  });
  let filteredMatches = [];
  matches.forEach((item, i) => {
    if (!filteredMatches.includes(item)) {
      filteredMatches.push(item);
    }
  });
  // if (filteredMatches.length > 2) {
  handleMatches(filteredMatches);    
  // }
}

function shiftAtPosByAmount(x, y, amt, dir) {
  let displacedItems = [];
  if (dir === 0) {
    for (let yy = y; yy >= 0; yy--) {
      // console.log('move at', x, yy, 'by', amt);
      let targetY = yy + amt;
      let itemToMove = getItemByCoord(x, yy);
      if (!itemToMove) {
        itemsOnBoard[x][targetY] = false;
        occupiedGridGraphic[x][targetY].setTint(0xff00ff);
      } else {
        itemToMove.posY = targetY;
        let targetPos = getPositionFromXY(x, targetY);
        itemToMove.id = getItemIdFromXY(itemToMove.posX, itemToMove.posY);
        itemsOnBoard[x][targetY] = true;
        occupiedGridGraphic[x][targetY].setTint(0xffff00);
        displacedItems.push(itemToMove);

        tweenItemPos(itemToMove, targetPos.x, targetPos.y, () => {itemToMove.setTint(0xffffff);});        
      }
    }

    for (let y = 0; y < amt; y++) {
      itemsOnBoard[x][y] = false;
      occupiedGridGraphic[x][y].setTint(0xff00ff);
    }
  }

  return displacedItems;
}

function handleMatches(matches) {
  // console.log('handling matches!');
  let matchesToDestroy = [];
  if (matches.length > 2) {
    for (let i = 0 ; i < matches.length; i++) {
      let matchToDestroy = items.getChildren().find((item) => item.id === matches[i]);
      if (matchToDestroy) {    
        matchesToDestroy.push(matchToDestroy);
        let pos = getItemXYFromId(matchesToDestroy[i].id);
        itemsOnBoard[pos.x][pos.y] = false;
        occupiedGridGraphic[pos.x][pos.y].setTint(0xff00ff);
      }
    }
  }

  tweenDelete(matchesToDestroy, () => {
    let numDeleted = 0;
    for (let i = 0; i < matchesToDestroy.length; i++) {
      numDeleted++;
      matchesToDestroy[i].destroy();
    }
    if (numDeleted > 0) {
      shiftDisplacedItems();      
    }
  });
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
  return {
    x: Math.floor(i % COLS),
    y: Math.floor(i / COLS),
  };
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
          results = getMatchesAtPosition(i, y, color, results);
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
