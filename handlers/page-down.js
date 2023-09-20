"use strict";

module.exports = ({ editor }) => ({
  keyNames: [ 'control-down', 'control-p' ],
  do() {
    if (editor.row === (editor.chars.length - 1)) {
      return false;
    }
    editor.row = Math.min(editor.row + editor.height, editor.chars.length - 1);
    return true;
  }
});
