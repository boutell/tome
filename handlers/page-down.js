"use strict";

export default ({ editor }) => ({
  keyNames: [ 'control-down', 'control-p' ],
  do() {
    if (editor.row === (editor.chars.length - 1)) {
      return false;
    }
    editor.moveTo(Math.min(editor.row + editor.height, editor.chars.length - 1), editor.col);
    return true;
  }
});
