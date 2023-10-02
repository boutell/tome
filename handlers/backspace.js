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
    undo.char = editor.peek();
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
    editor.insert([ undo.char ]);
  },
  redo(undo) {
    editor.moveTo(undo.row, undo.col);
    editor.handlers.backspace.do();
  }
});
