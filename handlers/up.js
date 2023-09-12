"use strict";

const select = require('../select.js');

module.exports = ({ editor }) => ({
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
