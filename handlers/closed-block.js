"use strict";

export default ({ editor }) => ({
  do(char) {
    if (!editor.language) {
      return false;
    }
    if (!editor.language.shouldCloseBlock(editor.state, char)) {
      return false;
    }
    if (editor.chars[editor.row].some(char => char !== ' ')) {
      return false;
    }
    let depth = editor.state.depth;
    if (!depth) {
      return false;
    }
    depth--;
    const undo = {
      row: editor.row,
      action: 'closedBlock',
      oldCount: editor.chars[editor.row].length,
      char
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
    editor.insert([ char ]);
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
    editor.handlers.closedBlock.do(redo.char);
  }
});
