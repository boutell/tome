"use strict";

import select from '../select.js';

export default ({ editor }) => ({
  keyName: 'up',
  do() {
    if (editor.row === 0) {
      return false;
    }
    return select({
      editor,
      move() {
        editor.row--;
        editor.clampCol();
        return true;
      }
    });
  }
});
