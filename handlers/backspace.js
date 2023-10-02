"use strict";

export default ({ editor }) => ({
  keyName: 'backspace',
  do() {
    if (!editor.back()) {
      return false;
    }
    const undo = {
      action: 'backspace',
      row: editor.row,
      col: editor.col,
      char: editor.peek()
    };
    const result = editor.erase();
    if (result) {
      return {
        undo
      };
    } else {
      return false;
    }
  },
  undo(undo) {
    editor.moveTo(undo.row, undo.col);
    editor.insert([ undo.char ]);
  },
  redo(undo) {
    editor.moveTo(undo.row, undo.col);
    editor.erase();
  }
});
