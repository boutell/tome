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
    screen
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
    this.state = {
      state: 'code',
      stack: [],
      depth: 0
    };
    this.states = [
      structuredClone(this.state)
    ];
    this.row = 0;
    this.col = 0;
    this.selRow = 0;
    this.selCol = 0;
    this.top = 0;
    this.left = 0;
    this.undos = [];
    this.redos = [];
    this.subEditors = [];
    this.log = log;
    this.hintStack = hintStack;
    this.screen = screen;
    this.openers = {
      '{': '}',
      '[': ']',
      '(': ')'
    };
    this.closers = {
      '}': '{',
      ']': '[',
      ')': '('
    };
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
    if (!selecting) {
      this.selRow = false;
      this.selectMode = false;
    }
    this.draw(appending);
  }

  // You probably want acceptKey
  async handleKey(key) {
    const handler = this.handlersByKeyName[key];
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
      scrolled = true;
    } 
    while (this.row - this.top >= this.height) {
      this.top++;
      scrolled = true;
    } 
    while (this.col - this.left < 0) {
      this.left--;
      scrolled = true;
    } 
    // Bias in favor of as much of the current line being visible as possible
    while ((this.left > 0) && (this.left > this.chars[this.row].length - this.width)) {
      this.left--;
      scrolled = true;
    }
    while (this.col - this.left >= this.width) { 
      this.left++;
      scrolled = true;
    } 
    return scrolled;
  }

  draw(appending) {
    const screen = this.screen;
    const { selected, selRow1, selCol1, selRow2, selCol2 } = this.getSelection();
    this.screen.cursor(this.col - this.left + this.screenLeft, this.row - this.top + this.screenTop);
    // Optimization to avoid a full refresh for fresh characters on the end of a line when not scrolling
    if (!this.scroll() && appending && !selected) {
      screen.set(
        (this.col - 1) - this.left + this.screenLeft,
        this.row - this.top + this.screenTop,
        this.peekBehind(),
        this.state.state
      );
      this.drawStatus();
      screen.draw();
      return;
    }
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
      this.moveTo(_row, 0);
      for (let sx = 0; (sx < this.width); sx++) {
        const _col = sx + this.left;
        let char;
        let style;
        if (this.eol()) {
          char = ' ';
          style = false;
        } else {
          char = this.peek();
          style = this.state.state;
          this.forward();
          if ((this.state.state === 'code') || (this.state.state === 'error')) {
            // If a character causes the parser to error consider the character part of the error;
            // if a character returns to normal code mode consider the character normal code
            style = this.state.state;
          }
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
    screen.draw();
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
    this.log(`in indent, depth is ${depth}`);
    const spaces = depth * this.tabSpaces;
    if (undo) {
      undo.indent = spaces;
    }
    for (let i = 0; (i < spaces); i++) {
      this.insertChar(' ');
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
        this.parse(peeked);
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
    this.log(`in break, depth is: ${this.state.depth}`);
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
    
  peekBehind() {
    let col = this.col;
    let row = this.row;
    if (this.col > 0) {
      col = Math.max(col - 1, 0);
    } else if (this.row > 0) {
      row--;
      col = this.chars[row].length;
    } else {
      return null;
    }
    return this.peek(row, col);
  }
  
  last() {
    return this.state.stack[this.state.stack.length - 1];
  }
  
  sol() {
    return this.col === 0;
  }
  
  eol() {
    return this.col === this.chars[this.row].length;
  }

  // Parse a character, updating the parse state for purposes of indentation,
  // syntax highlighting, etc.
  parse(char) {
    let maybeComment = false;
    let maybeCloseComment = false;
    if (this.state.state === 'code') {
      if (this.openers[char]) {
        this.state.depth++;
        this.state.stack.push(char);
      } else if (this.closers[char]) {
        const last = this.last();
        const opener = this.closers[char];
        if (last === opener) {
          this.state.stack.pop();
          this.state.depth--;
        } else {
          this.state.state = 'error';
        }
      } else if (char === '\'') {
        this.state.state = 'single';
      } else if (char === '"') {
        this.state.state = 'double';
      } else if (char === '`') {
        // TODO The messy, nestable one
      } else if (char === '/') {
        if (this.state.maybeComment) {
          this.state.state = '//';
        } else {
          maybeComment = true;
        }
      } else if (char === '*') {
        if (this.state.maybeComment) {
          this.state.state = '/*';
        } else {
          maybeComment = true;
        }
      }
    } else if (this.state.state === 'single') {
      if (char === '\\') {
        this.state.state = 'singleEscape';
      } else if (char === '\'') {
        this.state.state = 'code';
      }
    } else if (this.state.state === 'singleEscape') {
      this.state.state = 'single';
    } else if (this.state.state === 'double') {
      if (char === '\\') {
        this.state.state = 'doubleEscape';
      } else if (char === '"') {
        this.state.state = 'code';
      }
    } else if (this.state.state === 'doubleEscape') {
      this.state.state = 'double';
    } else if (this.state.state === 'error') {
      // Cool is the rule, but sometimes... bad is bad
      // The developer very definitely has to fix something above
      // this point, so stick to our highlighting as "bad!"
    } else if (this.state.state === '//') {
      if (char === '\r') {
        this.state.state = 'code';
      }
    } else if (this.state.state === '/*') {
      if (char === '*') {
        maybeCloseComment = true;
      } else if (char === '/') {
        if (this.state.maybeCloseComment) {
          this.state.state = 'code';
        }
      }
    }
    this.state.maybeComment = maybeComment;
    this.state.maybeCloseComment = maybeCloseComment;
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
