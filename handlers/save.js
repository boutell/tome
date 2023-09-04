"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-s',
  async do() {
    if (editor.save) {
      return editor.save();
    }
    return false;
  }
});
