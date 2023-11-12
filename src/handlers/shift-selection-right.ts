"use strict";

export default ({ editor }) => ({
  keyName: ']',
  selectionRequired: true,
  async do() {
    return {
      selecting: true,
      undo: editor.shiftSelection(1)
    };
  },
  async undo(undo) {
    editor.setSelection(undo);
    for (const [ row, chars ] of Object.entries(undo.chars)) {
      editor.chars[row] = chars;
    }
  },
  async redo(redo) {
    editor.setSelection(redo);
    return editor.handlers.shiftSelectionLeft.do();
  }
});
