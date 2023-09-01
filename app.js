"use strict";

const exec = require('child_process').execSync;

const width = process.stdout.columns;
const height = process.stdout.rows;

const stdout = process.stdout;
const terminal = getTerminal();

const tabStops = 2;

const logFile = require('fs').createWriteStream('/tmp/log.txt', 'utf8');

const argv = require('boring')();

terminal.invoke('clear');

let handlersByName, handlersWithTests;
const chars = [ [] ];
let row = 0, col = 0, top = 0, left = 0;
const stdin = process.stdin;
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
  [fromCharCodes([ 4 ])]: 'control-d',
  [fromCharCodes([ 26 ])]: 'control-z',
};

if (argv['debug-keycodes']) {
  debugKeycodes();
} else {
  main();
}

function main() {
  stdin.on('data', key => {
    const result = handle(key);
    if (result === false) {
      // Bell would be good here
      return;
    }
    const { appending } = result || {};
    draw(appending);
  });
}

function handle(key) {
  const name = keys[key];
  const handler = handlersByName[name];
  if (handler) {
    return handler(name);
  } else {
    for (const handler of handlersWithTests) {
      const result = handler(key);
      if (result) {
        return result;
      }
    }
  }
  return false;
}

handlersByName = {
  'control-c': function() {
    process.exit(1);
  },
  'control-z': function() {
    process.kill(process.pid, 'SIGTSTP');  
  },  
  'control-d': function() {
    terminal.invoke('clear');
    console.log('Resulting document:');
    console.log(chars.map(line => line.join('')).join('\n'));
    process.exit(0);
  },
  up,
  right: forward,
  down,
  left: back,
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
  // Optimization to avoid a full refresh for fresh characters on the end of a line when not scrolling
  if (!scroll() && appending) {
    terminal.invoke('cup', row - top, (col - 1) - left); 
    stdout.write(chars[row][col - 1]);
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
      terminal.invoke('cup', sy, sx);
      stdout.write(chars[_row][_col]);
    }
  }
  terminal.invoke('cup', row - top, col - left);
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
      logCodes(cap);
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

