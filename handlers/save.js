"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-s',
  async do() {
    if (editor.options.save) {
      return editor.options.save();
    }
    return false;
  }
});
