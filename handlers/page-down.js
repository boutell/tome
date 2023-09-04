"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-down',
  do() {
    if (editor.row === (editor.chars.length - 1)) {
      return false;
    }
    editor.row = Math.min(editor.row + editor.height, editor.chars.length - 1);
    return true;
  }
});
