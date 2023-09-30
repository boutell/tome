"use strict";

export default ({ editor }) => ({
  keyName: 'backspace',
  do() {
    const undo = {
      action: 'backspace',
      row: editor.row,
      col: editor.col
    };
    if (!editor.back()) {
      return false;
    }
    const result = editor.erase(undo);
    if (result) {
      return {
        undo
      };
    } else {
      return false;
    }
  },
  undo(undo) {
    if (undo.eol) {
      editor.chars[undo.row - 1] = editor.chars[undo.row - 1].slice(0, editor.chars[undo.row - 1].length - undo.borrowed.length);
      editor.chars.splice(undo.row, 0, undo.borrowed);
      editor.row = undo.row;
      editor.col = 0;
    } else {
      editor.row = undo.row;
      editor.col = undo.col - 1;
      editor.insertChar(undo.char);
    }
  },
  redo(undo) {
    editor.row = undo.row;
    editor.col = undo.col;
    editor.handlers.backspace.do();
  }
});
