"use strict";

module.exports = ({ editor }) => ({
  do(key) {
    if (key !== '}') {
      return false;
    }
    if (editor.chars[row].some(char => char !== ' ')) {
      return false;
    }
    let depth = editor.getDepth();
    if (!depth) {
      return false;
    }
    depth--;
    const undo = {
      row,
      col,
      action: 'closedBlock'
    };
    editor.undos.push(undo);
    editor.chars[row] = ' '.repeat(indent) + '}';
    editor.col = editor.chars[row].length;
    return true;
  },
  undo(undo) {
    editor.row = undo.row;
    editor.col = undo.col;
    const depth = getDepth();
    editor.chars[row] = ' '.repeat(tabSpaces * depth);
  }
});
