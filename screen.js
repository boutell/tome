import ansi from 'ansi-escapes';
import styles from 'ansi-styles';

export default class Screen {
  constructor(stdout) {
    this.stdout = stdout;
    this.stdout.write(ansi.clearScreen);
    this.row = 0;
    this.col = 0;
    this.resize();
  }
  set(col, row, char, reverse = false) {
    const nextCell = this.next[row][col];
    nextCell[0] = char;
    nextCell[1] = reverse;
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
    for (let row = 0; (row < this.height); row++) {
      for (let col = 0; (col < this.width); col++) {
        const currentCell = this.current[row][col];
        const nextCell = this.next[row][col];
        if ((currentCell[0] !== nextCell[0]) || (currentCell[1] !== nextCell[1])) {
          stdout.write(ansi.cursorTo(col, row));
          if (nextCell[1]) {
            stdout.write(styles.inverse.open);
          }
          stdout.write(nextCell[0]);
          if (nextCell[1]) {
            stdout.write(styles.inverse.close);
          }
          currentCell[0] = nextCell[0];
          currentCell[1] = nextCell[1];
        }
      }
    }
    stdout.write(ansi.cursorShow);
    stdout.write(ansi.cursorTo(this.col, this.row));
  }
}
