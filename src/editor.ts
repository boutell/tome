"use strict";

import fs from 'fs';
import ansi from 'ansi-escapes';
import Clipboard from './clipboard.js';
import Terminal from './terminal.js';
import Language from './language.js';
import { Handler, HandlerResult, Handlers, HandlerFactories, Undo } from './load-handler-factories.js';

const stdout = process.stdout;

const simpleResult = {
  appending: false,
  selecting: false,
  undo: undefined
};

type EditorParameters = {
  getKey: () => string | Promise<string>,
  prompt?: string,
  customHandlers?: Handlers,
  handlerFactories: HandlerFactories,
  save: () => void,
  close: () => void,
  status: (message: string | false) => void | false,
  clipboard: Clipboard,
  selectorsByName: Record<string, string>,
  tabSpaces: number,
  chars: Array<Array<string>>,
  width: number,
  height: number,
  screenTop: number,
  screenLeft: number,
  log: (...args: Array<any>) => void,
  hintStack: Array<Array<string>>,
  terminal: Terminal,
  languages: any,
  language: Language
}

// Values from the parent editor are used if these are not specified
type OptionalSubEditorParameters =
  'handlerFactories' |
  'clipboard' |
  'selectorsByName' |
  'tabSpaces' |
  'log' |
  'terminal' |
  'languages' |
  'language';

// https://stackoverflow.com/questions/74257654/how-to-define-a-type-in-typescript-based-on-another-type-making-some-properties

type SubEditorParameters = Omit<
  EditorParameters, OptionalSubEditorParameters
> &
  Partial<Pick<EditorParameters, OptionalSubEditorParameters>>;

interface SelectionState {
  selRow: number | false,
  selCol: number,
  row: number,
  col: number
}

interface NormalizedSelection {
  selRow1: number,
  selCol1: number,
  selRow2: number,
  selCol2: number
}

export default class Editor implements SelectionState {

  getKey: () => string | Promise<string>;

  save: () => void;
  
  close: () => void;

  status?: (message: string | false) => void;

  clipboard: Clipboard;
  
  selectorsByName: Record<string, string>;

  handlerFactories: HandlerFactories;
  
  handlers: Handlers;
  
  handlersByKeyName: Handlers;
  
  handlersWithTests: Array<Handler>;

  tabSpaces: number;

  chars: Array<Array<string>>;
  
  width: number;
  
  height: number;
  
  screenTop: number;
  
  screenLeft: number;
  
  log: (...args: Array<any>) => void;

  hintStack: Array<Array<string>>;

  terminal: Terminal;

  languages: Record<string,Language>;
  
  language: Language;
  
  selRow: number | false;
  
  selCol: number;

  row: number;
  
  col: number;
  
  selectMode: boolean;
  
  top: number;
  
  left: number;
  
  originalScreenLeft: number;
  
  originalWidth: number;
  
  undos: Array<Undo>;
  
  redos: Array<Undo>;
  
  subEditors: Array<Editor>;
  
  prompt: string | undefined;

  // Intentionally opaque, implemented by individual languages  
  state: any;
  
  states: Array<any>;
  
  removed: boolean;

  constructor({
    getKey,
    prompt = undefined,
    customHandlers = {},
    handlerFactories,
    save,
    close,
    status,
    clipboard,
    selectorsByName,
    tabSpaces,
    chars,
    width,
    height,
    screenTop,
    screenLeft,
    log,
    hintStack,
    terminal,
    languages,
    language
  } : EditorParameters) {
    this.getKey = getKey;
    this.save = save;
    this.close = close;
    this.status = status;
    this.clipboard = clipboard;
    this.tabSpaces = tabSpaces;
    this.selectorsByName = selectorsByName;
    this.handlerFactories = handlerFactories;
    this.screenTop = screenTop || 0;
    this.screenLeft = screenLeft || 0;
    this.originalScreenLeft = this.screenLeft;
    this.width = width;
    this.originalWidth = width;
    this.setPrompt(prompt || '');
    this.height = height;
    this.handlers = {};
    this.handlersByKeyName = {};
    this.handlersWithTests = [];
    this.chars = chars || [ [] ];
    this.languages = languages;
    this.language = language;
    this.newState();
    this.row = 0;
    this.col = 0;
    this.selRow = false;
    this.selCol = 0;
    this.selectMode = false;
    this.top = 0;
    this.left = 0;
    this.undos = [];
    this.redos = [];
    this.subEditors = [];
    this.log = log;
    this.hintStack = hintStack || [];
    this.terminal = terminal;
    this.states = [];
    this.removed = false;

    for (const [name, factory] of Object.entries(this.handlerFactories)) {
      const handler = factory({
        editor: this,
        clipboard,
        selectorsByName,
        log
      });
      this.handlers[name] = handler;
      if (handler.keyName) {
        this.handlersByKeyName[handler.keyName] = handler; 
      } else if (handler.keyNames) {
        for (const keyName of handler.keyNames) {
          this.handlersByKeyName[keyName] = handler; 
        }
      } else {
        this.handlersWithTests.push(handler);
      }
    }
    // Local overrides for this particular editor instance,
    // as used in the "Find" experience
    Object.assign(this.handlersByKeyName, customHandlers);
  }

  resize(width: number, height: number, screenTop = 0, screenLeft = 0) {
    this.width = width;
    const reduction = this.subEditors.reduce((a, e) => {
      if (!e.height) {
        throw new Error('subeditor should have height at this point');
      }
      return a + e.height;
    }, 0);

    this.height = height - reduction;
    this.screenTop = screenTop;
    this.screenLeft = screenLeft;
    this.scroll();
    this.draw(false);    
    let nextScreenTop = this.screenTop + height;
    for (const editor of this.subEditors) {
      editor.resize(width, editor.height, nextScreenTop, 0);
      nextScreenTop += editor.height;
    }
  }

  // Handle a key, then do shared things like building up the
  // undo stack, clearing the redo stack, clearing the selection, redrawing, etc.
  async acceptKey(key: string) {
    const wasSelecting = this.selectMode;
    let result = await this.handleKey(key);
    if (result === false) {
      // Bell would be good here
      return;
    }
    if (result === true) {
      // Hack to avoid creating an object on every keystroke just to appease TypeScript
      result = simpleResult;
    }
    let {
      selecting,
      appending,
      undo
    } = result;
    selecting = !!selecting;
    appending = !!appending;
    if (undo) {
      // Actions that make a new change invalidate the redo stack
      this.redos.splice(0, this.redos.length);
    }
    if (undo) {
      this.undos.push(undo);
    }
    if (selecting && !wasSelecting) {
      this.hintStack.push([
        'Arrows: Select',
        '^O: Page Up',
        '^P: Page Down',
        '^C: Copy',
        '[: Shift Left',
        ']: Shift Right',
        'C: Toggle Comment',
        'ESC: Done'
      ]);
    } else if (!selecting && wasSelecting) {
      this.selRow = false;
      this.selectMode = false;
      this.hintStack.pop();
    }
    this.draw(appending);
  }

  // You probably want acceptKey
  async handleKey(key: string) : Promise<HandlerResult> {
    let handler : Handler | null = this.handlersByKeyName[key];
    if (handler?.selectionRequired && !this.selectMode) {
      handler = null;
    }
    if (handler) {
      return handler.do(key);
    } else {
      for (const handler of this.handlersWithTests) {
        const result = await handler.do(key);
        if (result) {
          return result;
        }
      }
    }
    return false;
  }

  // Keep col from going off the right edge of a row
  clampCol() {
    this.col = Math.min(this.col, this.chars[this.row].length);
  }

  // Insert char at the current position and advance
  insertChar(char: string) {
    this.chars[this.row].splice(this.col, 0, char);
    this.forward();
  }

  // Used to insert characters without an undo or
  // redo operation. The chars array may include `\r`
  
  insert(chars: Array<string>, {
    indent = false
  } = {}) {
    for (const char of chars) {
      if (char === '\r') {
        this.break();
        if (indent) {
          this.indent();
        }
      } else {
        this.insertChar(char);
      }
    }
  }

  // Erase n characters at current position (not before it, use "back" first for backspace)
  erase(n = 1) {
    let changed = false;
    for (let i = 0; (i < n); i++) {
      const eol = this.col === this.chars[this.row].length;
      if (!eol) {
        this.chars[this.row].splice(this.col, 1);
        changed = true;
      } else if (this.row + 1 < this.chars.length) {
        const borrowed = this.chars[this.row + 1];
        this.chars[this.row].splice(this.chars[this.row].length, 0, ...borrowed);
        this.chars.splice(this.row + 1, 1);
        changed = true;
      }
    }
    return changed;
  }

  // Erase the current selection. Contributes to undo if provided

  eraseSelection(undo: Undo) {
    if (!this.hasSelection()) {
      return false;
    }
    const chars = this.getSelectionChars();
    const {
      selRow1,
      selCol1,
      selRow2,
      selCol2
    } = this.getSelection();
    if (undo) {
      undo.chars = chars;
    }
    this.moveTo(selRow1, selCol1);
    // So we properly merge lines etc.
    for (let i = 0; (i < chars.length); i++) {
      this.erase(); 
    }
    return true;
  }

  // Move to location. If col does not exist on the row, stops appropriately
  // given the direction of movement
  moveTo(row: number, col: number) {
    if ((row < this.row) || ((row === this.row) && (col < this.col))) {
      this.row = row;
      this.col = 0;
      this.state = structuredClone(this.states[this.row]);
      while (this.col < Math.min(col, this.chars[this.row].length)) {
        this.forward();
      }
    } else {
      while ((row !== this.row) || ((this.col < col) && !this.eol())) {
        this.forward();
      }
    }
  }

  scroll() {
    let scrolled : false | 'up' | 'down' | 'left' | 'right' = false;
    while (this.row - this.top < 0) {
      this.top--;
      scrolled = 'down';
    } 
    while (this.row - this.top >= this.height) {
      this.top++;
      scrolled = 'up';
    }
    while (this.col - this.left < 0) {
      this.left--;
      scrolled = 'right';
    } 
    // Bias in favor of as much of the current line being visible as possible
    while ((this.left > 0) && (this.left > this.chars[this.row].length - this.width)) {
      this.left--;
      scrolled = 'right';
    }
    while (this.col - this.left >= this.width) { 
      this.left++;
      scrolled = 'left';
    }
    return scrolled;
  }

  // TODO consider whether we can bring back the "appending" optimization or need to leave it out
  // because there are too many ways syntax highlighting can be impacted
  draw(appending: boolean) {
    const scrollDirection = this.scroll();
    const terminal = this.terminal;
    const selected = this.hasSelection();
    this.terminal.cursor(this.col - this.left + this.screenLeft, this.row - this.top + this.screenTop);
    if (this.prompt?.length) {
      for (let col = 0; (col < this.prompt.length); col++) {
        terminal.set(
          this.screenLeft - this.prompt.length + col,
          this.screenTop,
          this.prompt.charAt(col)
        );
      }
    }
    const actualRow = this.row;
    const actualCol = this.col;
    for (let sy = 0; (sy < this.height); sy++) {
      const _row = sy + this.top;
      if (_row >= this.chars.length) {
        for (let sx = 0; (sx < this.width); sx++) {
          terminal.set(this.screenLeft + sx, sy + this.screenTop, ' ');
        }
        continue;
      }
      for (let sx = 0; (sx < this.width); sx++) {
        const _col = sx + this.left;
        this.moveTo(_row, _col);
        let char;
        let style: string | false = false;
        if (this.eol()) {
          char = ' ';
        } else {
          char = this.peek();
          style = this.language.style(this.state);
          this.forward();
          // Sometimes it feels better to also style the character that caused a state change,
          // e.g. the character responsible for entering the error state
          style = this.language.styleBehind(this.state) || style;
        }
        if (selected) {
          const { selRow1, selCol1, selRow2, selCol2 } = this.getSelection();
          if (
            (_row > selRow1 || ((_row === selRow1) && (_col >= selCol1))) &&
            (_row < selRow2 || ((_row === selRow2) && (_col < selCol2)))
          ) {
            style = 'selected';
          }
        }
        terminal.set(this.screenLeft + sx, this.screenTop + sy, char ?? ' ', style);
      }
    }
    this.moveTo(actualRow, actualCol);
    this.terminal.cursor(this.col - this.left + this.screenLeft, this.row - this.top + this.screenTop);
    this.drawStatus();
    terminal.draw(scrollDirection);
  }

  drawStatus() {
    if (this.status) {
      this.status(this.selectMode ? 'select' : false);
    }
  }

  // Returns true if a selection is active. If state is not passed the
  // current selection state of the editor is used.
  hasSelection(state?: SelectionState) {
    state = state || this;
    return state.selRow !== false;
  }
  
  // Fetch the selection's start and end in a normalized form.
  //
  // If state is not passed the current selection state of the editor is used.
  getSelection(state?: SelectionState): NormalizedSelection {
    state = state || this;
    let selRow1, selCol1;
    let selRow2, selCol2;
    let selected = false;
    if (!this.hasSelection()) {
      throw new Error('Check hasSelection() before calling getSelection()');
    }
    if (state.selRow === false) {
      throw new Error('selRow is false after hasSelection, should be impossible');
    }
    if ((state.selRow > state.row) || ((state.selRow === state.row) && state.selCol > state.col)) {
      selCol1 = state.col;
      selRow1 = state.row;
      selCol2 = state.selCol;
      selRow2 = state.selRow;
    } else {
      selCol1 = state.selCol;
      selRow1 = state.selRow;
      selCol2 = state.col;
      selRow2 = state.row;
    }
    return {
      selRow1,
      selCol1,
      selRow2,
      selCol2
    };
  }

  // Fetch the selection's chars as a flat array, suitable for reinsertion. Newlines are present as \r,
  // to map to the enter key on reinsertion

  getSelectionChars() {
    if (!this.hasSelection()) {
      throw new Error('Check hasSelection before calling getSelectionChars');
    }
    const {
      selRow1,
      selCol1,
      selRow2,
      selCol2
    } = this.getSelection();
    const result = [];
    for (let row = selRow1; (row <= selRow2); row++) {
      let col1 = (row === selRow1) ? selCol1 : 0;
      let col2 = (row === selRow2) ? selCol2 : this.chars[row].length;
      for (let col = col1; (col < col2); col++) {
        result.push(this.chars[row][col]);
      }
      if (row < selRow2) {
        result.push('\r');
      }
    }
    return result;
  }

  // Insert appropriate number of spaces, typically called
  // on an empty newly inserted line
  indent(undo?: Undo) {
    const depth = this.state.depth;
    const spaces = depth * this.tabSpaces;
    if (undo) {
      undo.indent = spaces;
    }
    for (let i = 0; (i < spaces); i++) {
      this.insertChar(' ');
    }
    if (this.state.state === '/*') {
      this.insert([ ' ', '*', ' ' ]);
    }
  }

  createSubEditor(params: SubEditorParameters) {
    this.height -= params.height;
    this.draw(false);
    const editor = new Editor({
      handlerFactories: this.handlerFactories,
      clipboard: this.clipboard,
      selectorsByName: this.selectorsByName,
      tabSpaces: this.tabSpaces,
      log: this.log,
      terminal: this.terminal,
      languages: this.languages,
      language: this.languages.default,
      ...params
    });
    editor.draw(false);
    this.subEditors.push(editor);
    return editor;
  }

  removeSubEditor(editor: Editor) {
    this.subEditors = this.subEditors.filter(e => e !== editor);
    editor.removed = true;
    this.height += editor.height;
    this.draw(false);
  }
  
  setPrompt(prompt: string) {
    this.prompt = prompt;
    this.screenLeft = this.originalScreenLeft + this.prompt.length;
    this.width = this.originalWidth - this.prompt.length;
  }

  forward(n = 1) {
    let changed = false;
    for (let i = 0; (i < n); i++) {
      const canMoveForward = this.col < this.chars[this.row].length;
      const canMoveDown = this.row + 1 < this.chars.length;
      const canMove = canMoveForward || canMoveDown;
      if (canMove) {
        const peeked = this.peek();
        this.language.parse(this.state, peeked, {
          log: this.log,
          row: this.row,
          col: this.col
        });
      }
      if (canMoveForward) {
        this.col++;
        changed = true;
      } else if (canMoveDown) {
        this.row++;
        this.col = 0;
        changed = true;
        this.states[this.row] = structuredClone(this.state);
      }
    }
    return changed;
  }

  back(n = 1) {
    let changed = false;
    for (let i = 0; (i < n); i++) {
      if (this.col > 0) {
        this.col = Math.max(this.col - 1, 0);
        changed = true;
      } else if (this.row > 0) {
        this.row--;
        this.col = this.chars[this.row].length;
        changed = true;
      }
      if (changed) {
        // TODO very inefficient on every backwards arrow move,
        // think about how to avoid unnecessary clones
        this.state = structuredClone(this.states[this.row]);
        for (let col = 0; (col < this.col); col++) {
          this.language.parse(this.state, this.chars[this.row][col], {
            row: this.row,
            col,
            log: this.log
          });
        }
      }
    }
    return changed;
  }

  up() {
    if (this.row === 0) {
      return false;
    }
    const oldRow = this.row;
    const oldCol = this.col;
    while (this.row === oldRow) {
      this.back();
    }
    while (this.col > oldCol) {
      this.back();
    }
    return true;
  }
  
  down() {
    if ((this.row + 1) === this.chars.length) {
      return false;
    }
    const oldRow = this.row;
    const oldCol = this.col;
    while (this.row === oldRow) {
      this.forward();
    }
    while ((this.col < oldCol) && !this.eol()) {
      this.forward();
    }
    return true;
  }
  
  // Insert newline. Does not indent. Advances the cursor
  // to the start of the new line
  break() {
    const remainder = this.chars[this.row].slice(this.col);
    this.chars[this.row] = this.chars[this.row].slice(0, this.col);
    this.chars.splice(this.row + 1, 0, remainder);
    this.forward();
  }
  
  // Returns the character at the current position, or
  // at the position specified
  peek(row: null | number = null, col: null | number = null): string {
    if (row == null) {
      row = this.row;
    }
    if (col == null) {
      col = this.col;
    }
    if (col < this.chars[row].length) {
      return this.chars[row][col];
    } else if (row + 1 < this.chars.length) {
      return '\r';
    } else {
      throw new Error('Always check eol before calling peek');
    }
  }
  
  sol() {
    return this.col === 0;
  }
  
  eol() {
    return this.col === this.chars[this.row].length;
  }

  // Shift text left or right one tab stop.
  //
  // Returns an undo object only if a shift was actually made.
  shiftSelection(direction: -1 | 1) {
    if (!this.hasSelection()) {
      throw new Error('Check hasSelection before calling shiftSelection');
    }
    let {
      selRow1,
      selCol1,
      selRow2,
      selCol2
    } = this.getSelection();
    this.moveTo(selRow1, 0);
    const chars: string[][] = [];
    this.selRow = selRow2;
    this.selCol = this.chars[selRow2].length;
    if (selCol2 === 0) {
      selRow2--;
      this.selCol = 0;
    }
    for (let row = selRow1; (row <= selRow2); row++) {
      let rowChars = this.chars[row];
      if (direction === -1) {
        for (let space = 0; (space < 2); space++) {
          if (this.chars[row][0] === ' ') {
            rowChars = rowChars.slice(1);
          }
        }
      } else {
        rowChars = [ ' ', ' ', ...rowChars ]; 
      }
      if (rowChars !== this.chars[row]) {
        chars[row] = [...this.chars[row]];
        this.chars[row] = rowChars;
      }
    }
    return {
      action: (direction === -1) ? 'shiftSelectionLeft' : 'shiftSelectionRight',
      row: this.row,
      col: this.col,
      chars
    };
  }
  
  toggleComment() {
  }
  
  newState() {
    this.state = this.language.newState() || {
      depth: 0
    };
    this.states = [
      structuredClone(this.state)
    ];
  }
  
  setSelection({ row, col, selRow, selCol }: SelectionState) {
    this.moveTo(row, col);
    this.selRow = selRow;
    this.selCol = selCol;
  }
}

function camelize(s: string) {
  const words = s.split('-');
  let result = '';
  for (let i = 0; (i < words.length); i++) {
    if (i > 0) {
      result += words[i].charAt(0).toUpperCase() + words[i].substring(1);
    } else {
      result += words[i];
    }
  }
  return result;
}
