"use strict";

module.exports = ({ editor }) => ({
  keyName: 'left',
  do() {
    if (editor.col > 0) {
      editor.col = Math.max(editor.col - 1, 0);
      return true;
    }
    if (editor.row > 0) {
      editor.row--;
      editor.col = editor.chars[row].length;
      return true;
    }
    return false;
  }
});
