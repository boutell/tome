"use strict";

const fs = require('fs');
const readline = require('readline');
const properLockFile = require('proper-lockfile');

const stdin = process.stdin;
const stdout = process.stdout;
stdin.setRawMode(true);
readline.emitKeypressEvents(stdin);

const terminal = require('./terminal.js')({ out: stdout });

const tabSpaces = 2;

const argv = require('boring')();

const filename = argv._[0];

if (!filename && !argv['debug-keycodes']) {
  usage();
}

// TODO consider Windows
const localFolder = `${process.env.HOME}/.local`;
const stateFolder = `${localFolder}/state/tome`;
fs.mkdirSync(stateFolder, { recursive: true });

const logFile = require('fs').createWriteStream(`${stateFolder}/log.txt`, 'utf8');

const clipboard = require('./clipboard.js')({
  stateFolder,
  lock
});

const Editor = require('./editor.js');

const hintStack = [
  [
    '^S: Save',
    '^Q: Quit',
    'ESC: Select',
    '^X: Cut',
    '^C: Copy',
    '^P: Paste',
    '^Z: Undo',
    '^Y: Redo',
    '^F: Find'
  ]
];

terminal.invoke('clear');

let deliverKey;

const selectorsByName = require('./selectors-by-name.js');

let editor;

let keyQueue = [];

main();

function main() {
  editor = new Editor({
    terminal,
    save: saveFile,
    close: closeEditor,
    status,
    selectorsByName,
    clipboard,
    tabSpaces,
    chars: loadFile() || newFile(),
    hintStack,
    log
  });
  initScreen();
  stdin.on('keypress', (c, k) => {
    const queueWasEmpty = keyQueue.length === 0;
    if ((c == null) || (c.charCodeAt(0) < 32) || (c.charCodeAt(0) === 127)) {
      if (k.shift) {
        k.name = `shift-${k.name}`;
      }
      if (k.ctrl) {
        k.name = `control-${k.name}`;
      }
      keyQueue.push(k.name);
    } else {
      keyQueue.push(c);
    }
    if (queueWasEmpty) {
      processNextKey();
    }
  });
  process.on('SIGWINCH', () => {
    initScreen();
  });
  process.on('SIGCONT', () => {
    // Returning from control-Z we have to go back into raw mode in two steps
    // https://stackoverflow.com/questions/48483796/stdin-setrawmode-not-working-after-resuming-from-background
    stdin.setRawMode(false);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
  });
  editor.draw();
}

async function processNextKey() {
  const key = keyQueue.shift();
  if (deliverKey) {
    return deliverKey(key);
  }
  await editor.acceptKey(key);
  if (keyQueue.length) {
    processNextKey();
  }
}

function status(prompt = false) {
  terminal.invoke('cup', process.stdout.rows - 1, 0);
  const hints = hintStack[hintStack.length - 1];
  const width = Math.max(...hints.map(s => s.length)) + 2;
  let col = 0;
  for (const hint of hints) {
    if (col + width >= process.stdout.columns) {
      break;
    }
    stdout.write(hint.padEnd(width, ' '));
    col += width;
  }
  terminal.invoke('cup', process.stdout.rows - 2, 0);
  const left = `${editor.row + 1} ${editor.col + 1} ${shortFilename()}`;
  const right = (prompt !== false) ? prompt : '';
  stdout.write(left + ' '.repeat(process.stdout.columns - 1 - right.length - left.length) + right);
}

function shortFilename(prompt) {
  return filename.split('/').pop().substring(0, stdout.columns - (prompt || '').length - 5);
}

function printKey(key) {
  console.log(name || key.split('').map(ch => ch.charCodeAt(0)).join(',') + `:${key}`);
}

function logCodes(s) {
  try {
    logFile.write(s.split('').map(ch => ch.charCodeAt(0)).join(' ') + '\n');
  } catch (e) {
    log('logCodes failed on non string argument:');
    log(s);
  }
}

function log(...args) {
  for (let arg of args) {
    if ((typeof arg) === 'object') {
      arg = require('util').inspect(arg, { depth: 10 });
    }
    logFile.write(arg + '\n');
  }
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
  // Emoji-safe split by character (split('') is not safe)
  const content = fs.readFileSync(filename, 'utf8').split('\n').map(line => [...line]);
  if (!content.length) {
    content.push([]);
  }
  return content;
}

function newFile() {
  return [ [] ];
}

function saveFile() {
  fs.writeFileSync(filename, editor.chars.map(line => line.join('')).join('\n'));
}

async function closeEditor() {
  if (await confirm('Save before exiting? [Y/n]', true)) {
    saveFile();
  }
  terminal.invoke('clear');
  process.exit(0);
}

async function confirm(msg, def) {
  status(msg);
  const response = await getKey();
  if (def === true) {
    return ((response !== 'n') && (response !== 'N'));
  } else {
    return ((response === 'y') || (response === 'Y'));
  }
}

// Returns the next key pressed, bypassing the normal handlers
async function getKey() {
  if (keyQueue.length) {
    return keyQueue.shift();
  }
  const key = await new Promise(resolve => {
    deliverKey = resolve; 
  });
  deliverKey = null; 
  return key;
}

function usage() {
  process.stderr.write('Usage: tome filename\n');
  process.exit(1);
}

function initScreen() {
  editor.resize(process.stdout.columns, process.stdout.rows - 2);
}
