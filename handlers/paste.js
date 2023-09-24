"use strict";

export default ({ editor, clipboard }) => ({
  keyName: 'control-v',
  async do(key) {
    const eraseSelectionUndo = {};
    editor.eraseSelection(eraseSelectionUndo);
    const chars = await clipboard.get();
    if (chars === false) {
      return false;
    }
    const undo = {
      action: 'paste',
      row: editor.row,
      col: editor.col,
      chars,
      erasedChars: eraseSelectionUndo.chars
    };
    editor.reinsert(chars);
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
      editor.handlers.back.do();
      editor.erase();
    }
    if (undo.erasedChars) {
      editor.reinsert(undo.erasedChars);
    }
  },
  async redo(redo) {
    editor.row = redo.row;
    editor.col = redo.col;
    return editor.handlers.paste.do();
  }
});
