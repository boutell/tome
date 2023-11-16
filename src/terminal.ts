import ansi from 'ansi-escapes';
import styles from 'ansi-styles';
import stateStyles from './state-styles.js';

const ESC = '\u001B[';
// http://www.sweger.com/ansiplus/EscSeqScroll.html
const scrollLeftSequence = `${ESC} @`;
const scrollRightSequence = `${ESC} A`;

export default class Terminal {
  stdout: stream.Readable;
  width: number;
  height: number;
  row: number;
  col: number;
  current: Array<Array<[string,string | boolean]>>;
  next: Array<Array<[string,string | boolean]>>;
  log: (...args: Array<any>) => void;
  
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
  draw(scrollDirection?: string) {
    const stdout = this.stdout;
    stdout.write(ansi.cursorHide);
    if (scrollDirection === 'up') {
      this.scrollUp();
    } else if (scrollDirection === 'down') {
      this.scrollDown();
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
  scroll(sequence) {
    // Not present in ansi-escapes but generally supported: lock the scroll region to
    // exclude the status and help area
    this.stdout.write(`${ESC}${0};${this.height - 3}r`);
    this.stdout.write(sequence);
    this.stdout.write(`${ESC}${0};${this.height - 1}r`);
  }
}
