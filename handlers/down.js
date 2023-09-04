"use strict";

module.exports = ({ editor }) => ({
  keyName: 'down',
  do() {
    if (editor.row === (editor.chars.length - 1)) {
      return false;
    }
    editor.row++;
    editor.clampCol();
    return true;
  }
});
