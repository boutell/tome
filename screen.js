import ansi from 'ansi-escapes';
import styles from 'ansi-styles';
import stateStyles from './state-styles.js';

const ESC = '\u001B[';
const scrollLeftSequence = `${ESC}@`;
const scrollRightSequence = `${ESC}A`;

export default class Screen {
  constructor({
    stdout,
    log 
  }) {
    this.stdout = stdout;
    this.log = log;
    this.stdout.write(ansi.clearScreen);
    this.row = 0;
    this.col = 0;
    this.resize();
  }
  set(col, row, char, style = false) {
    const nextCell = this.next[row][col];
    nextCell[0] = char;
    nextCell[1] = style;
  }
  cursor(col, row) {
    this.col = col;
    this.row = row;
  }
  resize() {
    this.stdout.write(ansi.clearScreen);
    this.current = this.allocate();
    this.next = this.allocate();
  }
  allocate() {
    const data = [];
    this.width = process.stdout.columns;
    this.height = process.stdout.rows;
    for (let row = 0; (row < this.height); row++) {
      const cells = [];
      for (let col = 0; (col < this.width); col++) {
        cells.push([ ' ', false ]);
      }
      data.push(cells);
    }
    return data;
  }
  draw() {
    let writeCount = 0;
    const stdout = this.stdout;
    stdout.write(ansi.cursorHide);
    if (this.scrolledUp()) {
      this.scrollUp();
    } else if (this.scrolledDown()) {
      this.scrollDown();
    } else if (this.scrolledLeft()) {
      this.scrollLeft();
    } else if (this.scrolledRight()) {
      this.scrollRight();
    }
    for (let row = 0; (row < this.height); row++) {
      for (let col = 0; (col < this.width); col++) {
        const currentCell = this.current[row][col];
        const nextCell = this.next[row][col];
        if ((currentCell[0] !== nextCell[0]) || (currentCell[1] !== nextCell[1])) {
          writeCount++;
          stdout.write(ansi.cursorTo(col, row));
          if (nextCell[1]) {
            stdout.write(styles[stateStyles[nextCell[1]]].open);
          }
          stdout.write(nextCell[0]);
          if (nextCell[1]) {
            stdout.write(styles[stateStyles[nextCell[1]]].close);
          }
          currentCell[0] = nextCell[0];
          currentCell[1] = nextCell[1];
        }
      }
    }
    stdout.write(ansi.cursorShow);
    stdout.write(ansi.cursorTo(this.col, this.row));
    this.log(writeCount);
  }
  // Detect whether we're probably shifting most of the screen up a row
  scrolledUp() {
    if (this.row < 2) {
      return false;
    }
    let scrolledUp = true;
    for (let col = 0; (col < this.width); col++) {
      const currentCell = this.current[1][col];
      const nextCell = this.next[0][col];
      if ((currentCell[0] !== nextCell[0]) || (currentCell[1] !== nextCell[1])) {
        scrolledUp = false;
        break;
      }
    }
    return scrolledUp;
  }
  // Scroll the actual screen up a row and update our virtual screen to match
  scrollUp() {
    this.scroll(ansi.scrollUp);
    for (let row = 0; (row < this.height - 4); row++) {
      for (let col = 0; (col < this.width); col++) {
        this.current[row][col][0] = this.current[row + 1][col][0];
        this.current[row][col][1] = this.current[row + 1][col][1];
      }
    }
    for (let col = 0; (col < this.width); col++) {
      this.current[this.height - 4][col][0] = ' ';
      this.current[this.height - 4][col][1] = false;
    }
  }
  // Detect whether we're probably shifting most of the screen down a row
  scrolledDown() {
    if (this.row >= this.height - 4) {
      return false;
    }
    let scrolledDown = true;
    for (let col = 0; (col < this.width); col++) {
      const currentCell = this.current[0][col];
      const nextCell = this.next[1][col];
      if ((currentCell[0] !== nextCell[0]) || (currentCell[1] !== nextCell[1])) {
        scrolledDown = false;
        break;
      }
    }
    return scrolledDown;
  }
  // Scroll the actual screen up a row and update our virtual screen to match
  scrollDown() {
    this.scroll(ansi.scrollDown);
    for (let row = this.height - 5; (row >= 1); row--) {
      for (let col = 0; (col < this.width); col++) {
        this.current[row][col][0] = this.current[row - 1][col][0];
        this.current[row][col][1] = this.current[row - 1][col][1];
      }
    }
    for (let col = 0; (col < this.width); col++) {
      this.current[0][col][0] = ' ';
      this.current[0][col][1] = false;
    }  
  }
  // Detect whether we're probably shifting most of the screen left one column
  scrolledLeft() {
    if (this.col < 2) {
      return false;
    }
    let scrolledLeft = true;
    for (let row = 0; (row <= this.height - 4); row++) {
      const currentCell = this.current[row][1];
      const nextCell = this.next[row][0];
      this.log(currentCell, nextCell);
      if ((currentCell[0] !== nextCell[0]) || (currentCell[1] !== nextCell[1])) {
        scrolledLeft = false;
        break;
      }
    }
    if (scrolledLeft) {
      this.log('scrolledLeft');
    }
    return scrolledLeft;
  }
  // Scroll the actual screen left a column and update our virtual screen to match
  scrollLeft() {
    this.scroll(scrollLeftSequence);
    for (let row = 0; (row <= this.height - 4); row++) {
      for (let col = 0; (col < this.width - 1); col++) {
        this.current[row][col][0] = this.current[row][col + 1][0];
        this.current[row][col][1] = this.current[row][col + 1][1];
      }
    }
    for (let row = 0; (row <= this.height - 4); row++) {
      this.current[row][this.width - 1][0] = ' ';
      this.current[row][this.width - 1][1] = false;
    }
  }
  // Detect whether we're probably shifting most of the screen right one column
  scrolledRight() {
    if (this.col >= this.width - 2) {
      return false;
    }
    let scrolledRight = true;
    for (let row = 0; (row <= this.height - 4); row++) {
      const currentCell = this.current[row][0];
      const nextCell = this.next[row][1];
      if ((currentCell[0] !== nextCell[0]) || (currentCell[1] !== nextCell[1])) {
        scrolledRight = false;
        break;
      }
    }
    if (scrolledRight) {
      this.log('scrolledRight');
    }
    return scrolledRight;
  }
  // Scroll the actual screen up a row and update our virtual screen to match
  scrollRight() {
    this.scroll(scrollRightSequence);
    for (let row = this.height - 4; (row >= 0); row--) {
      for (let col = 1; (col < this.width); col++) {
        this.current[row][col][0] = this.current[row][col - 1][0];
        this.current[row][col][1] = this.current[row][col - 1][1];
      }
    }
    for (let row = 0; (row <= this.height - 4); row++) {
      this.current[row][0][0] = ' ';
      this.current[row][0][1] = false;
    }  
  }
  scroll(sequence) {
    // Not present in ansi-escapes but generally supported: lock the scroll region to
    // exclude the status and help area
    this.stdout.write(`${ESC}${0};${this.height - 3}r`);
    this.stdout.write(sequence);
    this.stdout.write(`${ESC}${0};${this.height - 1}r`);
  }
}
