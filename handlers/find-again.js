"use strict";

const find = require('../find.js');

module.exports = ({ editor, clipboard, log }) => ({
  keyName: 'control-g',
  async do(key) {
    if (editor.lastFind === false) {
      return false;
    }
    const findArgs = {
      ...editor.lastFind
    };
    if (findArgs.direction === 1) {
      findArgs.col = findArgs.col + 1;
      if (findArgs.col === editor.chars[findArgs.row].length) {
        findArgs.col = 0;
        findArgs.row++;
        if (findArgs.row === editor.chars.length) {
          findArgs.row = 0;
        }
      }
    } else {
      findArgs.col = findArgs.col - 1;
      if (findArgs.col < 0) {
        findArgs.row--;
        if (findArgs.row < 0) {
          findArgs.row = editor.chars.length - 1;
        }
        findArgs.col = editor.chars[findArgs.row].length - 1;
      }
    }
    const result = find(editor, findArgs);      
    if (result) {
      editor.lastFind.row = editor.row;
      editor.lastFind.col = editor.col;
    }
    return result;
  }
});
