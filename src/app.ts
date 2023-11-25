"use strict";

import fs from 'fs';
import readline from 'readline';
import ansi from 'ansi-escapes';
import boring from 'boring';
import { inspect } from 'util';

import Clipboard from './clipboard.js';
import Editor from './editor.js';
import selectorsByName from './selectors-by-name.js';
import { Handler, HandlerFactories, loadHandlerFactories } from './load-handler-factories.js';
import loadLanguages from './load-languages.js';

import Terminal from './terminal.js';

const stdin = process.stdin;
const stdout = process.stdout;
stdin.setRawMode(true);
readline.emitKeypressEvents(stdin);
const terminal = new Terminal({
  stdout,
  log
});

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

const clipboard = new Clipboard({
  stateFolder
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
    '^F: Find',
    '^B: Block',
    '^L: Language'
  ]
];

let deliverKey : undefined | Function; 
let editor : undefined | Editor;
let originalText : undefined | string;
let keyQueue : Array<string>;

const handlerFactories : HandlerFactories = await loadHandlerFactories();
const languages = await loadLanguages();
editor = new Editor({
  getKey,
  save: saveFile,
  close: closeEditor,
  status,
  selectorsByName,
  clipboard,
  tabSpaces,
  chars: loadFile() || newFile(),
  languages,
  language: guessLanguage(filename),
  hintStack,
  handlerFactories,
  terminal,
  log,
  ...getMainEditorSize()
});

resize();

stdin.on('keypress', (c, k) => {
  let key;
  if ((c == null) || (c.charCodeAt(0) < 32) || (c.charCodeAt(0) === 127)) {
    if (k.name == null) {
      // ignore occasional undefined keys on mac
      return;
    }
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
      output('escape');
    }
    key = k.name;
  } else {
    key = c;
  }
  if (key == null) {
    // Don't crash on weird input
    return;
  }
  output(key);
  function output(key: string) {
    if (deliverKey) {
      const fn = deliverKey;
      deliverKey = undefined;
      fn(key);
    } else {
      keyQueue.push(key);
    }
  }
});
process.on('SIGWINCH', () => {
  resize();
});
process.on('SIGCONT', () => {
  // In case the user remaps the keyboard to free up control-z for this purpose.
  //
  // Returning from control-Z we have to go back into raw mode in two steps
  // https://stackoverflow.com/questions/48483796/stdin-setrawmode-not-working-after-resuming-from-background
  stdin.setRawMode(false);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
});
terminal.draw();
while (true) {
  const key = await getKey();
  await editor.acceptKey(key);
}

function shortFilename(prompt = '') {
  return filename.split('/').pop().substring(0, stdout.columns - prompt.length - 5);
}

function log(...args: Array<string>) {
  for (let arg of args) {
    if ((typeof arg) === 'object') {
      arg = inspect(arg, { depth: 10 });
    }
    logFile.write(arg + '\n');
  }
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
  originalText = getText(content);
  return content;
}

function newFile() {
  return [ [] ];
}

function saveFile() {
  if (!editor) {
    throw new Error('editor should be defined here');
  }
  fs.writeFileSync(filename, getText(editor.chars));
}

function getText(chars: Array<Array<string>>) : string {
  return chars.map(line => line.join('')).join('\n');
}

async function closeEditor() {
  if (!editor) {
    throw new Error('editor should be defined here');
  }
  const text = getText(editor.chars);
  if (text !== originalText) {
    if (await confirm('Save before exiting? [Y/n]', true)) {
      saveFile();
    }
  }
  stdout.write(ansi.clearScreen);
  process.exit(0);
}

async function confirm(msg: string, def = false) {
  status(msg);
  terminal.cursor(terminal.width - 1, terminal.height - 3);
  terminal.draw();
  const response = await getKey();
  if (def === true) {
    return ((response !== 'n') && (response !== 'N'));
  } else {
    return ((response === 'y') || (response === 'Y'));
  }
}

// Returns a promise for the next key pressed
function getKey() : string | Promise<string> {
  if (keyQueue.length) {
    return keyQueue.shift()!;
  }
  return new Promise(resolve => {
    deliverKey = resolve; 
  });
}

function usage() {
  process.stderr.write('Usage: tome filename\n');
  process.exit(1);
}

function resize() {
  terminal.resize();
  if (!editor) {
    throw new Error('editor should be defined here');
  }
  const {
    width,
    height
  } = getMainEditorSize();
  editor.resize(width, height);
}

function getMainEditorSize() {
  return {
    width: process.stdout.columns,
    height: process.stdout.rows - 3,
    screenTop: 0,
    screenLeft: 0
  };
}

function guessLanguage(filename: string) {
  const matches = filename.match(/\.([^\.]+)$/);
  if (matches) {
    const found = Object.values(languages).find(language => language.extensions.includes(matches[1]));
    return found || languages.default;
  }
  return languages.default;
}

function status(prompt: string | false) {
  if (!editor) {
    throw new Error('editor should be defined here');
  }
  const hints = hintStack[hintStack.length - 1];
  const width = Math.max(...hints.map(s => s.length)) + 2;
  let col = 0;
  let row = process.stdout.rows - 2;
  for (const hint of hints) {
    if (col + width >= process.stdout.columns) {
      fillRest();
      row++;
      if (row >= process.stdout.rows) {
        break;
      }
    }
    for (let sx = 0; (sx < width); sx++) {
      terminal.set(col + sx, row, (sx < hint.length) ? hint.charAt(sx) : ' ');
    }
    col += width;
  }
  while (row < process.stdout.rows) {
    for (let sx = col; (sx < terminal.width); sx++) {
      terminal.set(sx, row, ' ');
    }
    col = 0;
    row++;
  }
  const left = `${editor.row + 1} ${editor.col + 1} ${shortFilename()}`;
  const right = (prompt !== false) ? prompt : '';
  const s = left + ' '.repeat(process.stdout.columns - 1 - right.length - left.length) + right;
  for (let i = 0; (i < s.length); i++) {
    terminal.set(i, process.stdout.rows - 3, s.charAt(i));
  }
  function fillRest() {
    while (col < terminal.width) {
      terminal.set(col, row, ' ');
      col++;
    }
    col = 0;
  }
}
