"use strict";

export default ({ editor }) => ({
  keyName: 'control-right',
  do() {
    if (editor.col === editor.chars[editor.row].length) {
      return false;
    }
    editor.col = editor.chars[editor.row].length;
    return true;
  }
});
