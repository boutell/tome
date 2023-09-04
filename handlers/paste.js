"use strict";

module.exports = ({ editor, clipboard }) => ({
  keyName: 'control-v',
  async do(key) {
    const eraseSelectionUndo = {};
    editor.eraseSelection(eraseSelectionUndo);
    const chars = await clipboard.get();
    if (clipboard === false) {
      return false;
    }
    const undo = {
      action: 'paste',
      row,
      col,
      chars,
      erasedChars: eraseSelectionUndo.chars
    };
    editor.reinsert(clipboard);
    undo.rowAfter = editor.row;
    undo.colAfter = editor.col;
    return {
      undo
    };
  },
  async undo(undo) {
    editor.row = undo.rowAfter;
    editor.col = undo.colAfter;
    for (let i = 0; (i < undo.chars.length); i++) {
      editor.back();
      editor.erase();
    }
    if (undo.erasedChars) {
      editor.reinsert(undo.erasedChars);
    }
  }
});
