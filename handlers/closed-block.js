"use strict";

module.exports = ({ editor }) => ({
  do(key) {
    if (key !== '}') {
      return false;
    }
    if (editor.chars[editor.row].some(char => char !== ' ')) {
      return false;
    }
    let depth = editor.getDepth();
    if (!depth) {
      return false;
    }
    depth--;
    const undo = {
      row: editor.row,
      col: editor.col,
      action: 'closedBlock'
    };
    editor.undos.push(undo);
    editor.chars[editor.row] = ' '.repeat(editor.tabSpaces * depth) + '}';
    editor.col = editor.chars[editor.row].length;
    return true;
  },
  undo(undo) {
    editor.row = undo.row;
    editor.col = undo.col;
    const depth = editor.getDepth();
    editor.chars[editor.row] = ' '.repeat(editor.tabSpaces * depth);
  }
});
