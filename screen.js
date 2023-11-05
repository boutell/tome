import ansi from 'ansi-escapes';
import styles from 'ansi-styles';
import stateStyles from './state-styles.js';

export default class Screen {
  constructor(stdout) {
    this.stdout = stdout;
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
    const stdout = this.stdout;
    stdout.write(ansi.cursorHide);
    if (this.scrolledUp()) {
      this.scrollUp();
    }
    for (let row = 0; (row < this.height); row++) {
      for (let col = 0; (col < this.width); col++) {
        const currentCell = this.current[row][col];
        const nextCell = this.next[row][col];
        if ((currentCell[0] !== nextCell[0]) || (currentCell[1] !== nextCell[1])) {
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
  }
  // Detect whether the user has probably just scrolled up a row
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
    this.stdout.write(ansi.scrollUp);
    for (let row = 0; (row < this.height - 1); row++) {
      for (let col = 0; (col < this.width); col++) {
        this.current[row][col][0] = this.current[row + 1][col][0];
        this.current[row][col][1] = this.current[row + 1][col][1];
      }
    }
    for (let col = 0; (col < this.width); col++) {
      this.current[this.height - 1][col][0] = ' ';
      this.current[this.height - 1][col][1] = false;
    }
  }
}
