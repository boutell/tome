"use strict";

export default ({ editor }) => ({
  async do() {
    // The "type" handler actually detects this special situation.
    // This handler exists to implement undo and redo for it
    return false;
  },
  async undo(undo) {
    editor.moveTo(undo.row, undo.col);
    editor.selRow = undo.selRow;
    editor.selCol = undo.selCol;
    for (const [ row, chars ] of Object.entries(undo.chars)) {
      editor.chars[row] = chars;
    }
  },
  async redo(redo) {
    editor.moveTo(undo.row, undo.col);
    editor.selRow = undo.selRow;
    editor.selCol = undo.selCol;
    return editor.handlers.type.do('[');
  }
});
