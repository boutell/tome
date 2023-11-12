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
    editor.insert(chars);
    undo.rowAfter = editor.row;
    undo.colAfter = editor.col;
    return {
      undo
    };
  },
  async undo(undo) {
    editor.moveTo(undo.rowAfter, undo.colAfter);
    for (let i = 0; (i < undo.chars.length); i++) {
      editor.back();
      editor.erase();
    }
    if (undo.erasedChars) {
      editor.insert(undo.erasedChars);
    }
  },
  async redo(redo) {
    editor.moveTo(editor.row, editor.col);
    return editor.handlers.paste.do();
  }
});
