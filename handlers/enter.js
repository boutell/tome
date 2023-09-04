"use strict";

module.exports = ({ editor }) => ({
  keyName: 'enter',
  do({ reversible = true } = {}) {
    const undo = reversible && {
      action: 'enter',
      row,
      col
    };
    const remainder = editor.chars[row].slice(editor.col);
    editor.chars[editor.row] = editor.chars[row].slice(0, editor.col);
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
    const borrow = editor.chars[row + 1].slice(undo.indent);
    editor.chars[row] = [...editor.chars[row], ...borrow]
    editor.chars.splice(editor.row + 1, 1);
  }
});
