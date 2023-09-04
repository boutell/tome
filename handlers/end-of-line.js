"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-right',
  do() {
    if (editor.col === editor.chars[editor.row].length) {
      return false;
    }
    editor.col = editor.chars[editor.row].length;
    return true;
  }
});
