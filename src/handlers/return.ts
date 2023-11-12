"use strict";

export default ({ editor }) => ({
  keyName: 'return',
  do({ reversible = true, indent = true } = {}) {
    if (editor.return) {
      // Custom return handler instead, like for the editor used in the "find" field
      return editor.return();
    }
    const undo = reversible && {
      action: 'return',
      row: editor.row,
      col: editor.col
    };
    editor.insert([ '\r' ], { indent });
    if (reversible) {
      editor.undos.push(undo);
    }
    return true;
  },
  undo(undo) {
    editor.moveTo(undo.row, undo.col);
    editor.erase();
  },
  redo(redo) {
    editor.moveTo(redo.row, redo.col);
    editor.handlers.return.do();
  }
});
