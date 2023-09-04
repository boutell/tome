"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-w',
  do() {
    if (editor.options.close) {
      return editor.options.close();
    }
    return false;
  }
});
