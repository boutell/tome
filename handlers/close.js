"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-q',
  do() {
    if (editor.close) {
      return editor.close();
    }
    return false;
  }
});
