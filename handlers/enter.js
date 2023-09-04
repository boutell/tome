"use strict";

module.exports = ({ editor }) => ({
  keyName: 'enter',
  do({ reversible = true } = {}) {
    const undo = reversible && {
      action: 'enter',
      row: editor.row,
      col: editor.col
    };
    const remainder = editor.chars[editor.row].slice(editor.col);
    editor.chars[editor.row] = editor.chars[editor.row].slice(0, editor.col);
    editor.row++;
    editor.chars.splice(editor.row, 0, []);
    editor.col = 0;
    editor.indent(undo);
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
  }
});
