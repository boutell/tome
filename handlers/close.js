"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-w',
  do() {
    if (editor.close) {
      return editor.close();
    }
    return false;
  }
});
