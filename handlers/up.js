"use strict";

module.exports = ({ editor }) => ({
  keyName: 'up',
  do() {
    if (editor.row === 0) {
      return false;
    }
    editor.row--;
    editor.clampCol();
    return true;
  }
});
