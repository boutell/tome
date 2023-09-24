"use strict";

import find from '../find.js';

export default ({ editor, clipboard, log }) => ({
  keyName: 'control-g',
  async do(key) {
    if (editor.lastFind === false) {
      log('no repeat');
      return false;
    }
    const findArgs = {
      ...editor.lastFind
    };
    log('find again args are:', findArgs);
    if (findArgs.direction === 1) {
      findArgs.fromCol = findArgs.fromCol + 1;
      if (findArgs.fromCol === editor.chars[findArgs.fromRow].length) {
        findArgs.fromCol = 0;
        findArgs.fromRow++;
        if (findArgs.fromRow === editor.chars.length) {
          findArgs.fromRow = 0;
        }
      }
    } else {
      findArgs.fromCol = findArgs.fromCol - 1;
      if (findArgs.fromCol < 0) {
        findArgs.fromRow--;
        if (findArgs.fromRow < 0) {
          findArgs.fromRow = editor.chars.length - 1;
        }
        findArgs.fromCol = editor.chars[findArgs.fromRow].length - 1;
      }
    }
    log('find again calling with:', findArgs);
    const result = find(editor, findArgs);      
    if (result) {
      editor.lastFind.fromRow = editor.row;
      editor.lastFind.fromCol = editor.col;
    }
    log('find again result is:', result);
    return result;
  }
});
