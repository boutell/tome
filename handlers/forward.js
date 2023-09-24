"use strict";

import select from '../select.js';

export default ({ editor }) => ({
  keyName: 'right',
  do() {
    return select({
      editor,
      move() {
        if (editor.col < editor.chars[editor.row].length) {
          editor.col++;
          return true;
        }
        if (editor.row + 1 < editor.chars.length) {
          editor.row++;
          editor.col = 0;
          return true;
        }
        return false;
      }
    });     
  }
});
