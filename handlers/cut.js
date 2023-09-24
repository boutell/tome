"use strict";

export default ({ editor }) => ({
  keyName: 'control-x',
  async do() {
    const undo = {
      action: 'cut',
      row: editor.row,
      col: editor.col,
      selRow: editor.selRow,
      selCol: editor.selCol
    };
    if (!await editor.handlers.copy.do()) {
      return false;
    }
    editor.eraseSelection(undo);
    return {
      undo
    };
  },
  async undo(undo) {
    const selection = editor.getSelection(undo);
    editor.row = selection.selRow1;
    editor.col = selection.selCol1;
    editor.reinsert(undo.chars);
  },
  async redo(redo) {
    editor.row = redo.row;
    editor.col = redo.col;
    editor.selRow = redo.selRow;
    editor.selCol = redo.selCol;
    return editor.handlers.cut.do(); 
  }
});
