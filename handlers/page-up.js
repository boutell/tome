"use strict";

import select from '../select.js';

export default ({ editor }) => ({
  keyNames: [ 'control-up', 'control-o' ],
  do() {
    if (editor.row === 0) {
      return false;
    }
    return select({
      editor,
      move() {
        editor.moveTo(Math.max(editor.row - editor.height, 0), editor.col);
        return true;
      }
    });
  }
});
