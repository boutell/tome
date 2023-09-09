"use strict";

const find = require('../find.js');

module.exports = ({ editor, clipboard, log }) => ({
  keyName: 'control-g',
  async do(key) {
    if (editor.lastFind === false) {
      return false;
    }
    const result = find(editor, editor.lastFind.target, editor.lastFind.row, editor.lastFind.col + 1);
    if (result) {
      editor.lastFind.row = editor.row;
      editor.lastFind.col = editor.col;
    }
    return result;
  }
});
