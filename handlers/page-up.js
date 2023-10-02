"use strict";

export default ({ editor }) => ({
  keyNames: [ 'control-up', 'control-o' ],
  do() {
    if (editor.row === 0) {
      return false;
    }
    editor.moveTo(Math.max(editor.row - editor.height, 0), editor.col);
    return true;
  }
});
