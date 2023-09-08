const fs = require('fs');

const stdout = process.stdout;

module.exports = class Editor {

  constructor({
    save,
    close,
    status,
    escape,
    enter,
    terminal,
    clipboard,
    keyNames,
    selectorsByName,
    tabSpaces,
    chars,
    width,
    height,
    screenTop,
    screenLeft,
    log
  }) {
    this.save = save;
    this.close = close;
    this.status = status;
    this.escape = escape;
    this.enter = enter;
    this.terminal = terminal;
    this.clipboard = clipboard;
    this.tabSpaces = tabSpaces;
    this.keyNames = keyNames;
    this.selectorsByName = selectorsByName;
    this.screenTop = screenTop || 0;
    this.screenLeft = screenLeft || 0;
    this.width = width;
    this.height = height;
    this.handlers = {};
    this.handlersByKeyName = {};
    this.handlersWithTests = [];
    this.chars = chars || [ [] ];
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
    const handlers = fs.readdirSync(`${__dirname}/handlers`);
    for (let name of handlers) {
      const handler = require(`${__dirname}/handlers/${name}`)({
        editor: this,
        clipboard,
        keyNames,
        selectorsByName,
        log
      });
      name = camelize(name.replace('.js', ''));
      this.handlers[name] = handler;
      if (handler.keyName) {
        this.handlersByKeyName[handler.keyName] = handler; 
      } else {
        this.handlersWithTests.push(handler);
      }
    }
  }

  resize(width, height, screenTop = 0, screenLeft = 0) {
    this.width = width;
    const reduction = this.subEditors.reduce((a, e) => a + e.height, 0);

    this.height = height - reduction;
    this.log(`height given was ${height} reduced by ${reduction}`);
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
    }
    this.draw(appending);
  }

  // You probably want acceptKey
  async handleKey(key) {
    const keyName = this.keyNames[key];
    const handler = this.handlersByKeyName[keyName];
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
    this.handlers.forward.do();
  }

  // Used to reinsert characters as part of an undo or
  // redo operation. The chars array may include `\r` which
  // triggers an enter() call without creating more undo points

  reinsert(chars) {
    for (const char of chars) {
      if (char === '\r') {
        this.handlers.enter.do({ reversible: false });
      } else {
        this.insertChar(char);
      }
    }
  }

  // Erase character at current position (not the character before it, use "back" first for backspace)
  //
  // Adds properties to the provided undo object if any
  erase(undo) {
    const eol = this.col === this.chars[this.row].length;
    if (!eol) {
      if (undo) {
        undo.eol = false;
        undo.char = this.chars[this.row][this.col];
      }
      this.chars[this.row].splice(this.col, 1);
      return true;
    } else {
      if (this.row < this.chars.length) {
        const borrowed = this.chars[this.row + 1];
        if (undo) {
          undo.eol = true;
          undo.borrowed = borrowed;
        }
        this.chars[this.row].splice(this.chars[this.row].length, 0, ...borrowed);
        this.chars.splice(this.row + 1, 1);
        return true;
      }
    }
    return false;
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
      undo.row = selRow1;
      undo.col = selCol1;
      undo.chars = chars;
    }
    this.row = selRow1;
    this.col = selCol1;
    // So we properly merge lines etc.
    for (let i = 0; (i < chars.length); i++) {
      this.erase(); 
    }
    return true;
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
    const { selected, selRow1, selCol1, selRow2, selCol2 } = this.getSelection();
    // Optimization to avoid a full refresh for fresh characters on the end of a line when not scrolling
    if (!this.scroll() && appending && !selected) {
      this.terminal.invoke('cup', this.row - this.top + this.screenTop, (this.col - 1) - this.left + this.screenLeft);
      this.terminal.write(this.chars[this.row][this.col - 1]);
      this.terminal.invoke('civis');
      this.status && this.status();
      this.terminal.invoke('cup', this.row - this.top + this.screenTop, this.col - this.left + this.screenLeft);
      this.terminal.invoke('cnorm');
      return;
    }
    this.terminal.invoke('civis');
    for (let sy = 0; (sy < this.height); sy++) {
      this.terminal.invoke('cup', sy + this.screenTop, 0);
      const _row = sy + this.top;
      if (_row >= this.chars.length) {
        this.terminal.write(' '.repeat(this.width));
        continue;
      }
      for (let sx = 0; (sx < this.width); sx++) {
        const _col = sx + this.left;
        const char = (_col >= this.chars[_row].length) ? ' ' : this.chars[_row][_col];
        if (selected) {
          if (
            (_row > selRow1 || ((_row === selRow1) && (_col >= selCol1))) &&
            (_row < selRow2 || ((_row === selRow2) && (_col < selCol2)))
          ) {
            this.terminal.invoke('rev');
          } else {
            this.terminal.invoke('sgr0');
          }
        }
        this.terminal.write(char);
      }
    }
    this.status && this.status();
    this.terminal.invoke('cup', this.row - this.top + this.screenTop, this.col - this.left + this.screenLeft);
    this.terminal.invoke('cnorm');
  }

  // Fetch the selection's start, end and "selected" flag in a normalized form
  getSelection() {
    let selRow1, selCol1;
    let selRow2, selCol2;
    let selected = false;
    if (this.selRow !== false) {
      selected = true;
      if ((this.selRow > this.row) || ((this.selRow === this.row) && this.selCol > this.col)) {
        selCol1 = this.col; 
        selRow1 = this.row; 
        selCol2 = this.selCol;
        selRow2 = this.selRow; 
      } else {
        selCol1 = this.selCol; 
        selRow1 = this.selRow; 
        selCol2 = this.col;
        selRow2 = this.row; 
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
    const depth = this.getDepth();
    const spaces = depth * this.tabSpaces;
    if (undo) {
      undo.indent = spaces;
    }
    for (let i = 0; (i < spaces); i++) {
      this.insertChar(' ');
    }
  }

  // TODO: should be aware of comments and especially strings
  //
  // TODO: need to start tracking this as we move because it is very
  // inefficient to scan the entire document every time we press enter

  getDepth() {
    let depth = 0;
    for (let r = this.row; (r >= 0); r--) {
      for (const char of this.chars[r]) {
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
        }
      }
    }
    return Math.max(depth, 0);
  }

  createSubEditor(params) {
    this.height -= params.height;
    this.draw();
    const editor = new Editor({
      terminal: this.terminal,
      clipboard: this.clipboard,
      keyNames: this.keyNames,
      selectorsByName: this.selectorsByName,
      tabSpaces: this.tabSpaces,
      ...params
    });
    editor.draw();
    this.subEditors.push(editor);
    return editor;
  }

  removeSubEditor(editor) {
    this.subEditors = this.subEditors.filter(e => e !== editor);
    editor.removed = true;
    this.log(`height was ${this.height} adding ${editor.height}`);
    this.height += editor.height;
    this.draw();
  }
};

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
