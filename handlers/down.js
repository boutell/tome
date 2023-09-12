"use strict";

const select = require('../select.js');

module.exports = ({ editor }) => ({
  keyName: 'down',
  do() {
    if (editor.row === (editor.chars.length - 1)) {
      return false;
    }
    return select({
      editor,
      move() {
        editor.row++;
        editor.clampCol();
        return true;
      }
    });
  }
});
