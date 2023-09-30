import readline from 'readline';

const stdin = process.stdin;
stdin.setRawMode(true);
readline.emitKeypressEvents(stdin);

console.log('press c to exit');

stdin.on('keypress', (c, k) => {
  if (c === 'c') {
    process.exit(0);
  }
  console.log((c != null) && c.charCodeAt(0), k, [...k.sequence].map(s => s.charCodeAt(0)));
});
