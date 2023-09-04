"use strict";

module.exports = ({ editor }) => ({
  keyName: 'forward',
  do() {
    if (editor.col < editor.chars[editor.row].length) {
      editor.col++;
      return true;
    }
    if (editor.row + 1 < chars.length) {
      editor.row++;
      editor.col = 0;
      return true;
    }
    return false;
  }
});
