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
    editor.row = undo.row;
    editor.col = undo.col;
    editor.erase();
  },
  redo(redo) {
    editor.row = redo.row;
    editor.col = redo.col;
    editor.break();
  }
});
