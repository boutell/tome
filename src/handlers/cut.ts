"use strict";

export default ({ editor }) => ({
  keyName: 'control-x',
  selectionRequired: true,
  async do() {
    if (!editor.hasSelection()) {
      throw new Error('cut handler invoked without a selection, should be impossible');
    }
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
    editor.moveTo(selection.selRow1, selection.selCol1);
    editor.insert(undo.chars);
  },
  async redo(redo) {
    editor.moveTo(redo.row, redo.col);
    editor.selRow = redo.selRow;
    editor.selCol = redo.selCol;
    return editor.handlers.cut.do(); 
  }
});
