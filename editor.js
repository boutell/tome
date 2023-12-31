"use strict";

import fs from 'fs';
import ansi from 'ansi-escapes';

const stdout = process.stdout;

export default class Editor {

  constructor({
    getKey,
    prompt,
    customHandlers,
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
    screen,
    languages,
    language
  }) {
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
    this.originalWidth = width;
    this.setPrompt(prompt || '');
    this.height = height;
    this.handlers = {};
    this.handlersByKeyName = {};
    this.handlersWithTests = [];
    this.chars = chars || [ [] ];
    this.languages = languages;
    this.setLanguage(language);
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
    this.screen = screen;
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
    for (const [ keyName, fn ] of Object.entries(customHandlers || {})) {
      this.handlersByKeyName[keyName] = {
        keyName,
        do: fn
      };
    }
  }

  resize(width, height, screenTop = 0, screenLeft = 0) {
    this.width = width;
    const reduction = this.subEditors.reduce((a, e) => a + e.height, 0);

    this.height = height - reduction;
    this.screenTop = screenTop;
    this.screenLeft = screenLeft;
    this.scroll();
    this.draw();    
    let nextScreenTop = this.screenTop + height;
    for (const editor of this.subEditors) {
      editor.resize(width, editor.height, nextScreenTop, 0);
      nextScreenTop += editor.height;
    }
  }

  // Handle a key, then do shared things like building up the
  // undo stack, clearing the redo stack, clearing the selection, redrawing, etc.
  async acceptKey(key) {
    // Divert the next keystroke to a getKey method call
    if (this.getKeyPending) {
      const resolver = this.getKeyPending;
      this.getKeyPending = null;
      return resolver(key);
    }
    const wasSelecting = this.selectMode;
    const result = await this.handleKey(key);
    if (result === false) {
      // Bell would be good here
      return;
    }
    const {
      selecting,
      appending,
      undo
    } = result || {};
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
  async handleKey(key) {
    let handler = this.handlersByKeyName[key];
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

  // Await this method to steal the next keystroke from this editor.
  // Usually invoked to feed sub-editors like the Find field
  getKey() {
    return new Promise(resolve => {
      this.getKeyPending = resolve;
    });
  }

  // Keep col from going off the right edge of a row
  clampCol() {
    this.col = Math.min(this.col, this.chars[this.row].length);
  }

  // Insert char at the current position and advance
  insertChar(char) {
    this.chars[this.row].splice(this.col, 0, char);
    this.forward();
  }

  // Used to insert characters without an undo or
  // redo operation. The chars array may include `\r`
  
  insert(chars, {
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

  eraseSelection(undo) {
    const chars = this.getSelectionChars();
    const {
      selected,
      selRow1,
      selCol1,
      selRow2,
      selCol2
    } = this.getSelection();
    if (!selected) {
      return false;
    }
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
  moveTo(row, col) {
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
    let scrolled = false;
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
  draw(appending) {
    const scrollDirection = this.scroll();
    const screen = this.screen;
    const { selected, selRow1, selCol1, selRow2, selCol2 } = this.getSelection();
    this.screen.cursor(this.col - this.left + this.screenLeft, this.row - this.top + this.screenTop);
    if (this.prompt.length) {
      for (let col = 0; (col < this.prompt.length); col++) {
        screen.set(
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
          screen.set(this.screenLeft + sx, sy + this.screenTop, ' ');
        }
        continue;
      }
      for (let sx = 0; (sx < this.width); sx++) {
        const _col = sx + this.left;
        this.moveTo(_row, _col);
        let char;
        let style;
        if (this.eol()) {
          char = ' ';
          style = false;
        } else {
          char = this.peek();
          style = this.language.style(this.state);
          this.forward();
          // Sometimes it feels better to also style the character that caused a state change,
          // e.g. the character responsible for entering the error state
          style = this.language.styleBehind(this.state) || style;
        }
        if (selected) {
          if (
            (_row > selRow1 || ((_row === selRow1) && (_col >= selCol1))) &&
            (_row < selRow2 || ((_row === selRow2) && (_col < selCol2)))
          ) {
            style = 'selected';
          }
        }
        screen.set(this.screenLeft + sx, this.screenTop + sy, char, style);
      }
    }
    this.moveTo(actualRow, actualCol);
    this.screen.cursor(this.col - this.left + this.screenLeft, this.row - this.top + this.screenTop);
    this.drawStatus();
    screen.draw(scrollDirection);
  }

  drawStatus() {
    if (this.status) {
      this.status(this.selectMode ? 'select' : false);
    }
  }

  // Fetch the selection's start, end and "selected" flag in a normalized form.
  // If state is not passed the current selection state of the editor is used.
  getSelection(state) {
    state = state || this;
    let selRow1, selCol1;
    let selRow2, selCol2;
    let selected = false;
    if (state.selRow !== false) {
      selected = true;
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
    }
    return {
      selected,
      selRow1,
      selCol1,
      selRow2,
      selCol2
    };
  }

  // Fetch the selection's chars as a flat array, suitable for reinsertion. Newlines are present as \r,
  // to map to the enter key on reinsertion

  getSelectionChars() {
    const {
      selRow1,
      selCol1,
      selRow2,
      selCol2,
      selected
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
  indent(undo) {
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

  createSubEditor(params) {
    this.height -= params.height;
    this.draw();
    const editor = new Editor({
      handlerFactories: this.handlerFactories,
      clipboard: this.clipboard,
      selectorsByName: this.selectorsByName,
      tabSpaces: this.tabSpaces,
      log: this.log,
      screen: this.screen,
      languages: this.languages,
      language: this.languages.default,
      ...params
    });
    editor.draw();
    this.subEditors.push(editor);
    return editor;
  }

  removeSubEditor(editor) {
    this.subEditors = this.subEditors.filter(e => e !== editor);
    editor.removed = true;
    this.height += editor.height;
    this.draw();
  }
  
  setPrompt(prompt) {
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
  peek(row = null, col = null) {
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
      return null;
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
  //
  // direction must be -1 or 1
  shiftSelection(direction) {
    let {
      selected,
      selRow1,
      selCol1,
      selRow2,
      selCol2
    } = this.getSelection();
    this.moveTo(selRow1, 0);
    const undo = {
      action: (direction === -1) ? 'shiftSelectionLeft' : 'shiftSelectionRight',
      row: this.row,
      col: this.col,
      chars: []
    };
    this.selRow = selRow2;
    this.selCol = this.chars[selRow2].length;
    if (selCol2 === 0) {
      selRow2--;
      this.selCol = 0;
    }
    for (let row = selRow1; (row <= selRow2); row++) {
      let chars = this.chars[row];
      if (direction === -1) {
        for (let space = 0; (space < 2); space++) {
          if (this.chars[row][0] === ' ') {
            chars = chars.slice(1);
          }
        }
      } else {
        chars = [ ' ', ' ', ...chars ]; 
      }
      if (chars !== this.chars[row]) {
        undo.chars[row] = [...this.chars[row]];
        this.chars[row] = chars;
      }
    }
    return undo;
  }
  
  toggleComment() {
  }
  
  setLanguage(language) {
    this.language = language;
    this.state = this.language.newState() || {
      depth: 0
    };
    this.states = [
      structuredClone(this.state)
    ];
  }
  
  setSelection({ row, col, selRow, selCol }) {
    this.moveTo(row, col);
    this.selRow = selRow;
    this.selCol = selCol;
  }
}

function camelize(s) {
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
