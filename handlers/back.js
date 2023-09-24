"use strict";

import select from '../select.js';

export default ({ editor }) => ({
  keyName: 'left',
  do() {
    return select({
      editor,
      move() {
        if (editor.col > 0) {
          editor.col = Math.max(editor.col - 1, 0);
          return true;
        }
        if (editor.row > 0) {
          editor.row--;
          editor.col = editor.chars[editor.row].length;
          return true;
        }
        return false;
      }
    });
  }
});
