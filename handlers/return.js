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
    const remainder = editor.chars[editor.row].slice(editor.col);
    editor.chars[editor.row] = editor.chars[editor.row].slice(0, editor.col);
    editor.row++;
    editor.chars.splice(editor.row, 0, []);
    editor.col = 0;
    if (indent) {
      editor.indent(undo);
    }
    editor.chars[editor.row].splice(editor.chars[editor.row].length, 0, ...remainder);
    if (reversible) {
      editor.undos.push(undo);
    }
    return true;
  },
  undo(undo) {
    editor.row = undo.row;
    editor.col = undo.col;
    const borrow = editor.chars[editor.row + 1].slice(undo.indent);
    editor.chars[editor.row] = [...editor.chars[editor.row], ...borrow]
    editor.chars.splice(editor.row + 1, 1);
  },
  redo(redo) {
    editor.row = redo.row;
    editor.col = redo.col;
    editor.handlers.return.do({ reversible: false });
  }
});
