"use strict";

export default ({ editor }) => ({
  do(key) {
    if (key !== '}') {
      return false;
    }
    editor.log('inside');
    if (editor.chars[editor.row].some(char => char !== ' ')) {
      editor.log('contains non-spaces');
      return false;
    }
    let depth = editor.getDepth();
    if (!depth) {
      editor.log('depth is 0');
      return false;
    }
    depth--;
    const undo = {
      row: editor.row,
      action: 'closedBlock',
      oldCount: editor.chars[editor.row].length
    };
    while (!editor.sol()) {
      editor.log('back iteration');
      editor.back();
    }
    while (editor.peek() === ' ') {
      editor.log('erase iteration');
      editor.erase();
    }
    for (let i = 0; (i < editor.tabSpaces * depth); i++) {
      editor.log('insert iteration');
      editor.insert([ ' ' ]);
    }
    editor.log('inserting }');
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
