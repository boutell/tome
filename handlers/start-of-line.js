"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-left',
  do() {
    if (editor.col === 0) {
      return false;
    }
    editor.col = 0;
    return true;
  }
});
