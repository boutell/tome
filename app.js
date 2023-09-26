"use strict";

import fs from 'fs';
import readline from 'readline';
import properLockFile from 'proper-lockfile';
import ansi from 'ansi-escapes';
import boring from 'boring';
import { inspect } from 'util';

import clipboardFactory from './clipboard.js';
import Editor from './editor.js';
import selectorsByName from './selectors-by-name.js';
import loadHandlerFactories from './load-handler-factories.js';

const stdin = process.stdin;
const stdout = process.stdout;
stdin.setRawMode(true);
readline.emitKeypressEvents(stdin);

const tabSpaces = 2;

const argv = boring();

const filename = argv._[0];

if (!filename && !argv['debug-keycodes']) {
  usage();
}

// TODO consider Windows
const localFolder = `${process.env.HOME}/.local`;
const stateFolder = `${localFolder}/state/tome`;
fs.mkdirSync(stateFolder, { recursive: true });

const logFile = fs.createWriteStream(`${stateFolder}/log.txt`, 'utf8');

const clipboard = clipboardFactory({
  stateFolder,
  lock
});

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

stdout.write(ansi.clearScreen);

let deliverKey;
let editor;
let keyQueue = [];

const handlerFactories = await loadHandlerFactories();
editor = new Editor({
  getKey,
  save: saveFile,
  close: closeEditor,
  status,
  selectorsByName,
  clipboard,
  tabSpaces,
  chars: loadFile() || newFile(),
  hintStack,
  handlerFactories,
  log
});
initScreen();
stdin.on('keypress', (c, k) => {
  let key;
  if ((c == null) || (c.charCodeAt(0) < 32) || (c.charCodeAt(0) === 127)) {
    if (k.shift) {
      k.name = `shift-${k.name}`;
    }
    if (k.ctrl) {
      k.name = `control-${k.name}`;
    }
    if ((k.sequence.charCodeAt(0) === 27) && (k.sequence.charCodeAt(1) === 27)) {
      // readline isn't quite smart enough on its own to do the right thing if
      // ESC is followed quickly by an arrow key, but gives us enough information
      // to figure it out ourselves
      keyQueue.push('escape');
    }
    key = k.name;
  } else {
    key = c;
  }
  if (deliverKey) {
    deliverKey(key);
  } else {
    keyQueue.push(key);
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
while (true) {
  const key = await getKey();
  await editor.acceptKey(key);
}

function status(prompt = false) {
  stdout.write(ansi.cursorTo(0, process.stdout.rows - 1));
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
  stdout.write(ansi.cursorTo(0, process.stdout.rows - 2));
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
      arg = inspect(arg, { depth: 10 });
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
  stdout.write(ansi.clearScreen);
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

// Returns the next key pressed
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
