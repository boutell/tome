"use strict";

export default ({ editor }) => ({
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
      action: 'closedBlock',
      oldCount: editor.chars[editor.row].length
    };
    while (!editor.sol()) {
      editor.back();
    }
    while (editor.peek() === ' ') {
      editor.erase();
    }
    for (let i = 0; (i < editor.tabSpaces * depth); i++) {
      editor.insert([ ' ' ]);
    }
    editor.insert([ '}' ]);
    return {
      undo
    };
  },
  undo(undo) {
    editor.moveTo(editor.row, 0);
    while (!editor.eol()) {
      editor.erase();
    }
    for (let i = 0; (i < undo.oldCount); i++) {
      editor.insert([ ' ' ]);
    }
  },
  redo(redo) {
    editor.moveTo(redo.row, redo.col);
    editor.handlers.closedBlock.do('}');
  }
});
