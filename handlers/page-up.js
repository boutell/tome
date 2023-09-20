"use strict";

module.exports = ({ editor }) => ({
  keyNames: [ 'control-up', 'control-o' ],
  do() {
    if (editor.row === 0) {
      return false;
    }
    editor.row = Math.max(editor.row - editor.height, 0);
    return true;
  }
});
