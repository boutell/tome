import Screen from '../screen.js';

const screen = new Screen(process.stdout);
for (let y = 0; (y < process.stdout.rows); y++) {
  screen.set(y, y, 'X');
  screen.cursor(y, y);
  await pause(100);
  screen.draw();
}

await pause(5000);

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
