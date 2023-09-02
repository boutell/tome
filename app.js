"use strict";

// TODO:
// Offer to save on control-w, with the default being yes
// Undo/redo
// File locking for the actual file
// Make the js stuff file extension specific
// Make the js stuff work in a script tag too
// Add some HTML stuff
// Detect width/height changes

const fs = require('fs');

const exec = require('child_process').execSync;
const properLockFile = require('proper-lockfile');

let width = process.stdout.columns;
let height = process.stdout.rows - 1;

const stdout = process.stdout;
const terminal = getTerminal();

const tabStops = 2;

const logFile = require('fs').createWriteStream('/tmp/log.txt', 'utf8');

const argv = require('boring')();

const filename = argv._[0];

if (!filename) {
  usage();
}

const localFolder = `${process.env.HOME}/.local`;
const stateFolder = `${localFolder}/state/tome`;
const clipboardFile = `${stateFolder}/clipboard.json`;
const clipboardLockFile = `${clipboardFile}.lock`;

fs.mkdirSync(stateFolder, { recursive: true });

terminal.invoke('clear');

let handlersByName, handlersWithTests, selectorsByName;
let keyQueue = [];
const chars = loadFile() || newFile();
let row = 0, col = 0, selRow = 0, selCol = 0, top = 0, left = 0;
const stdin = process.stdin;
let deliverKey;

stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');

const keys = {
  [fromCharCodes([ 27, 91, 65 ])]: 'up',
  [fromCharCodes([ 27, 91, 67 ])]: 'right',
  [fromCharCodes([ 27, 91, 66 ])]: 'down',
  [fromCharCodes([ 27, 91, 68 ])]: 'left',
  [fromCharCodes([ 27, 91, 49, 59, 50, 65 ])]: 'shift-up',
  [fromCharCodes([ 27, 91, 49, 59, 50, 67 ])]: 'shift-right',
  [fromCharCodes([ 27, 91, 49, 59, 50, 66 ])]: 'shift-down',
  [fromCharCodes([ 27, 91, 49, 59, 50, 68 ])]: 'shift-left',
  [fromCharCodes([ 13 ])]: 'enter',
  [fromCharCodes([ 9 ])]: 'tab',
  [fromCharCodes([ 127 ])]: 'backspace',
  [fromCharCodes([ 3 ])]: 'control-c',
  [fromCharCodes([ 24 ])]: 'control-x',
  [fromCharCodes([ 22 ])]: 'control-v',
  [fromCharCodes([ 4 ])]: 'control-d',
  [fromCharCodes([ 26 ])]: 'control-z',
  [fromCharCodes([ 19 ])]: 'control-s',
  [fromCharCodes([ 23 ])]: 'control-w'
};

if (argv['debug-keycodes']) {
  debugKeycodes();
} else {
  main();
}

function main() {
  stdin.on('data', key => {
    if (deliverKey) {
      return deliverKey(key);
    }
    keyQueue.push(key);
    if (keyQueue.length === 1) {
      processNextKey();
    }
  });
  process.on('SIGWINCH', () => {
    width = process.stdout.columns;
    height = process.stdout.rows - 1;
    scroll();
    draw();
  });
  process.on('SIGCONT', () => {
    // Returning from control-Z we have to go back into raw mode in two steps
    // https://stackoverflow.com/questions/48483796/stdin-setrawmode-not-working-after-resuming-from-background
    stdin.setRawMode(false);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
  });
  draw();
}

async function processNextKey() {
  const key = keyQueue.shift();
  await acceptKey(key);
  if (keyQueue.length) {
    processNextKey();
  }
}

async function acceptKey(key) {
  const result = await handle(key);
  if (result === false) {
    // Bell would be good here
    return;
  }
  const {
    selecting,
    appending
  } = result || {};
  if (!selecting) {
    selRow = false;
  }
  draw(appending);
}

async function handle(key) {
  const name = keys[key];
  const handler = handlersByName[name];
  if (handler) {
    return handler(name);
  } else {
    for (const handler of handlersWithTests) {
      const result = await handler(key);
      if (result) {
        return result;
      }
    }
  }
  return false;
}

selectorsByName = {
  'shift-up': up,
  'shift-right': forward,
  'shift-down': down,
  'shift-left': back
};

handlersByName = {
  'control-c': copy,
  'control-x': cut,
  'control-v': paste,
  'control-z': function() {
    process.kill(process.pid, 'SIGTSTP');  
  },  
  'control-s': function() {
    saveFile();
  },
  'control-w': async function() {
    if (await confirm('Save before exiting? [Y/n]')) {
      saveFile();
    }
    terminal.invoke('clear');
    process.exit(0);
  },
  up,
  right: forward,
  down,
  left: back,
  'shift-up': select,
  'shift-right': select,
  'shift-down': select,
  'shift-left': select,
  backspace() {
    if (!back()) {
      return false;
    }
    return erase();
  },
  enter,
  tab() {
    const nextStop = tabStops - (col % tabStops);
    for (let n = 0; (n < nextStop); n++) {
      insertChar(' ');
      forward();
    }
    return true;
  }
};

handlersWithTests = [
  closedBlock,
  type
];

async function copy() {
  const {
    selected,
    selRow1,
    selCol1,
    selRow2,
    selCol2
  } = getSelection();
  if (!selected) {
    return false;
  }
  const clipboard = [];
  for (let row = selRow1; (row <= selRow2); row++) {
    let col1 = (row === selRow1) ? selCol1 : 0;
    let col2 = (row === selRow2) ? selCol2 : chars[row].length;
    for (let col = col1; (col < col2); col++) {
      clipboard.push(chars[row][col]);
    }
    if (row < selRow2) {
      clipboard.push(String.fromCharCode(13));
    }
  }
  const release = await lock(clipboardLockFile);
  try {
    fs.writeFileSync(clipboardFile, JSON.stringify(clipboard));
  } finally {
    await release();
  }
  return true;
}

async function cut() {
  if (!await copy()) {
    return false;
  }
  eraseSelection();
  return true;
}

async function paste() {
  eraseSelection();
  const release = await lock(clipboardLockFile);
  try {
    const clipboard = JSON.parse(fs.readFileSync(clipboardFile));
    for (const key of clipboard) {
      await acceptKey(key);
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      // No clipboard exists right now
      return false;
    }
    throw e;
  } finally {
    await release();
  }
}

function eraseSelection() {
  const {
    selected,
    selRow1,
    selCol1,
    selRow2,
    selCol2
  } = getSelection();
  if (!selected) {
    return false;
  }
  if (selRow1 === selRow2) {
    chars[selRow1] = [...chars[selRow1].slice(0, selCol1), ...chars[selRow1].slice(selCol2) ];
  } else {
    chars[selRow1] = chars[selRow1].slice(0, selCol1);
    chars[selRow2] = chars[selRow2].slice(selCol2);
    chars.splice(selRow + 1, selRow2 - selRow1 - 1); 
  }
  selRow = false; 
  row = selRow1;
  col = selCol1;
  return true;
}

function type(key) {
  let appending = false;
  if (col === chars[row].length) {  
    appending = true;
  }
  insertChar(key);
  forward();
  return { appending };
}

function closedBlock(key) {
  if (key !== '}') {
    return false;
  }
  if (chars[row].some(char => char !== ' ')) {
    return false;
  }
  let depth = getDepth();
  if (!depth) {
    return false;
  }
  depth--;
  const spaces = depth * tabStops;
  chars[row] = ' '.repeat(spaces) + '}';
  col = chars[row].length;
  return true;
}

function scroll() {
  let scrolled = false;
  while (row - top < 0) {
    top--;
    scrolled = true;
  } 
  while (row - top >= height) {
    top++;
    scrolled = true;
  } 
  while (col - left < 0) {
    left--;
    scrolled = true;
  } 
  // Bias in favor of as much of the current line being visible as possible
  while ((left > 0) && (left > chars[row].length - width)) {
    left--;
    scrolled = true;
  }
  while (col - left >= width) { 
    left++;
    scrolled = true;
  } 
  return scrolled;
}

function draw(appending) {
  const { selected, selRow1, selCol1, selRow2, selCol2 } = getSelection();
  // Optimization to avoid a full refresh for fresh characters on the end of a line when not scrolling
  if (!scroll() && appending && selected) {
    terminal.invoke('cup', row - top, (col - 1) - left); 
    stdout.write(chars[row][col - 1]);
    status();
    return;
  }
  terminal.invoke('clear');
  for (let sy = 0; (sy < height); sy++) {
    const _row = sy + top;
    if (_row >= chars.length) {
      break;
    }
    for (let sx = 0; (sx < width); sx++) {
      const _col = sx + left;
      if (_col >= chars[_row].length) {
        break;
      }
      if (selected) {
        if (
          (_row > selRow1 || ((_row === selRow1) && (_col >= selCol1))) &&
          (_row < selRow2 || ((_row === selRow2) && (_col < selCol2)))
        ) {
          terminal.invoke('dim');
        } else {
          terminal.invoke('sgr0');
        }
      }
      terminal.invoke('cup', sy, sx);
      stdout.write(chars[_row][_col]);
    }
  }
  status();
  terminal.invoke('cup', row - top, col - left);
}

function status(prompt = false) {
  terminal.invoke('cup', height, 0);
  const left = `${row + 1} ${col + 1} ${shortFilename()}`;
  const right = (prompt !== false) ? prompt : '';
  stdout.write(left + ' '.repeat(width - 1 - right.length - left.length) + right);
}

function shortFilename(prompt) {
  return filename.split('/').pop().substring(0, width - (prompt || '').length - 5);
}

// Fetch the selection in a normalized form
function getSelection() {
  let selRow1, selCol1;
  let selRow2, selCol2;
  let selected = false;
  if (selRow !== false) {
    selected = true;
    if ((selRow > row) || ((selRow === row) && selCol > col)) {
      selCol1 = col; 
      selRow1 = row; 
      selCol2 = selCol;
      selRow2 = selRow; 
    } else {
      selCol1 = selCol; 
      selRow1 = selRow; 
      selCol2 = col;
      selRow2 = row; 
    }
  }
  return {
    selected,
    selRow1,
    selCol1,
    selRow2,
    selCol2
  };
}

function getRowCount(chars) {
  return chars.length;
}

function getRowLength(chars, row) {
  return chars[row].length;
}

// Insert char at the current position without changing row, col
function insertChar(key) {
  chars[row].splice(col, 0, key);
}

function up() {
  if (row === 0) {
    return false;
  }
  row--;
  clampCol();
  return true;
}

function down() {
  if (row === (chars.length - 1)) {
    return false;
  }
  row++;
  clampCol();
  return true;
}

// Move forward one character
function forward() {
  if (col < chars[row].length) {
    col++;
    return true;
  }
  if (row + 1 < chars.length) {
    row++;
    col = 0;
    return true;
  }
  return false;
}

// Move back one character
function back() {
  if (col > 0) {
    col = Math.max(col - 1, 0);
    return true;
  }
  if (row > 0) {
    row--;
    col = chars[row].length;
    return true;
  }
  return false;
}

// Keep col from going off the right edge of a row
function clampCol() {
  col = Math.min(col, chars[row].length);
}

// Erase character at current position (not the character before it, use "back" first for backspace)
function erase() {
  if (chars[row].length > col) {
    chars[row].splice(col, 1);
    return true;
  }
  if (row < chars.length) {
    chars[row].splice(chars[row].length, 0, ...chars[row + 1]);
    chars.splice(row + 1, 1);
    return true;
  }
  return false;
}

function enter() {
  const remainder = chars[row].slice(col);
  chars[row] = chars[row].slice(0, col);
  row++;
  chars.splice(row, 0, []);
  col = 0;
  indent();
  chars[row].splice(chars[row].length, 0, ...remainder);
  return true;
}

function indent() {
  const depth = getDepth();
  for (let i = 0; (i < depth * tabStops); i++) {
    insertChar(' ');
    forward();
  }
}

// TODO: should be aware of comments and especially strings
//
// TODO: need to start tracking this as we move because it is very
// inefficient to scan the entire document every time we press enter

function getDepth() {
  let depth = 0;
  for (let r = row; (r >= 0); r--) {
    if (chars[r].indexOf('{') !== -1) {
      depth++;
    } else if (chars[r].indexOf('}') !== -1) {
      depth--;
    }
  }
  return depth;
}

//function insertRow(row) {
//  chars.splice(row, 0, []);
//  terminal.invoke('cup', row, col);
//  terminal.invoke('il1');
//}

function select(name) {
  const _row = row, _col = col;

  if (!selectorsByName[name]()) {
    return false;
  }
  if (selRow === false) {
    selRow = _row;
    selCol = _col;
  }
  if ((selRow === row) && (selCol === col)) {
    return false;
  }  
  return {
    selecting: true
  };
}

function fromCharCodes(a) {
  return a.map(ch => String.fromCharCode(ch)).join('');
}

function printKey(key) {
  console.log(name || key.split('').map(ch => ch.charCodeAt(0)).join(',') + `:${key}`);
}

function getTerminal() {
  // Parse terminfo, adequately
  let info = exec('infocmp', { encoding: 'utf8' });
  info = info.replace(/^#.*\n/g, '');
  const fields = info.split(/,\s+/);
  const name = fields.shift();
  const caps = {};
  for (const field of fields) {
    const numberMatches = field.match(/(\w+)#(.*)+/);
    if (numberMatches) {
      let [ , name, value ] = numberMatches;
      if (value.startsWith('0x')) {
        value = parseInt(value.substring(2), 16);
      } else {
        value = parseInt(value);
      }
      caps[name] = value;
      continue;
    }
    const stringMatches = field.match(/(\w+)=(.*)+/);
    if (stringMatches) { 
      const [ , name, value ] = stringMatches;
      caps[name] = unescapeTerminal(value);
      continue;
    }
    caps[name] = true;
  }
  return {
    caps,
    // very halfassed implementation, missing many termcap features
    invoke(name, ...args) {
      const stack = [];
      let cap = caps[name];
      // logCodes(cap);
      while (true) {
        const percentAt = cap.indexOf('%');
        if (percentAt === -1) {
          stdout.write(cap);
          break;
        }
        const before = cap.substring(0, percentAt);
        if (before.length) {
          stdout.write(before);
        }
        cap = cap.substring(percentAt + 1);
        const code = consume();
        if (code === 'i') {
          args[0]++;
          args[1]++;
        } else if (code === 'p') {
          const which = parseInt(consume()) - 1;
          stack.push(args[which]);
        } else if (code === 'd') {
          const popped = stack.pop();
          stdout.write(popped.toString());
        } 
        function consume() {
          const ch = cap.charAt(0);
          cap = cap.substring(1);
          return ch;
        }
      }
    }
  };
}

function unescapeTerminal(value) {
  value = value.replace(/\\[Ee]/g, String.fromCharCode(27)); 
  value = value.replace(/\\n/g, '\n');
  value = value.replace(/\\r/g, '\n');
  value = value.replace(/\\t/g, '\t');
  value = value.replace(/\\b/g, String.fromCharCode(8));
  value = value.replace(/\\s/g, ' ');
  value = value.replace(/\\^/g, '^');
  value = value.replace(/\\\\/g, '\\');
  value = value.replace(/\\,/g, ',');
  value = value.replace(/\\:/g, ':');
  value = value.replace(/\\(\d\d\d)/g, ch => String.fromCharCode(parseInt(ch, 8)));
  // I know this should be "\200"
  // value = value.replace(/\\0/g, String.fromCharCode(0));
  value = value.replace(/\^([a-z])/g, ch => String.fromCharCode(ch.charCodeAt(0) - 96));
  // DEL
  value = value.replace(/\^\?/g, String.fromCharCode(127));
 // I didn't parse delays, hopefully not needed in modern terminals
  return value;
}

function logCodes(s) {
  try {
    logFile.write(s.split('').map(ch => ch.charCodeAt(0)).join(' ') + '\n');
  } catch (e) {
    log('logCodes failed on non string argument:');
    log(s);
  }
}

function log(s) {
  logFile.write(s + '\n');
}

function debugKeycodes() {
  stdin.on('data', key => {
    const name = keys[key];
    if (name === 'control-c') {
      process.exit(1);
    }
    console.log(`${key.split('').map(ch => ch.charCodeAt(0)).join(':')} ${name}`);
  });
}

function lock(filename) {
  return properLockFile(filename, {
    retries: {
      retries: 30,
      factor: 1,
      minTimeout: 1000,
      maxTimeout: 1000
    },
    // Avoid chicken and egg problem when the file does not exist yet
    realpath: false
  });
}

function loadFile() {
  if (!fs.existsSync(filename)) {
    return false;
  }
  const content = fs.readFileSync(filename, 'utf8').split('\n').map(line => line.split(''));
  if (!content.length) {
    content.push([]);
  }
  return content;
}

function newFile() {
  return [ [] ];
}

function saveFile() {
  fs.writeFileSync(filename, chars.map(line => line.join('')).join('\n'));
}

async function confirm(msg, def) {
  status(msg);
  const response = await getKey();
  if (def === true) {
    return ((response !== 'n') && (response !== 'N'));
  } else {
    return ((response !== 'y') && (response !== 'Y'));
  }
}

// Returns the next key pressed, bypassing the normal handlers
async function getKey() {
  if (keyQueue.length) {
    return keyQueue.pop();
  }
  const key = await new Promise(resolve => {
    deliverKey = resolve; 
  });
  deliverKey = null; 
}

function usage() {
  process.stderr.write('Usage: tome filename\n');
  process.exit(1);
}
