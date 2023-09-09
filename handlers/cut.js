"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-x',
  async do() {
    const undo = {
      action: 'cut',
      ...editor.getSelection()
    };
    if (!await editor.handlers.copy.do()) {
      return false;
    }
    editor.eraseSelection(undo);
    editor.log('next is: ' + JSON.stringify(undo));
    return {
      undo
    };
  },
  async undo(undo) {
    editor.log('undo was: ' + JSON.stringify(undo));
    editor.row = undo.row;
    editor.col = undo.col;
    editor.reinsert(undo.chars);
  },
  async redo(redo) {
    editor.log('redo was: ' + JSON.stringify(redo));
    editor.row = redo.selRow1;
    editor.col = redo.selCol1;
    editor.selRow = redo.selRow2;
    editor.selCol = redo.selCol2;
    editor.handlers.cut.do(); 
  }
});
