"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-x',
  async do(key) {
    const undo = {
      action: 'cut'
    };
    if (!await editor.handlers.copy.do()) {
      return false;
    }
    editor.eraseSelection(undo);
    return {
      undo
    };
  },
  async undo(undo) {
    editor.row = undo.row;
    editor.col = undo.col;
    editor.reinsert(undo.chars);
  }
});
