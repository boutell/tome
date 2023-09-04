"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-up',
  do() {
    if (editor.row === 0) {
      return false;
    }
    editor.row = Math.max(editor.row - editor.height, 0);
    return true;
  }
});
