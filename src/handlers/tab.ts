"use strict";

export default ({ editor }) => ({
  keyName: 'tab',
  do() {
    const nextStop = editor.tabSpaces - (editor.col % editor.tabSpaces);
    const undo = {
      action: 'tab',
      row: editor.row,
      col: editor.col,
      spaces: nextStop
    };
    for (let n = 0; (n < nextStop); n++) {
      editor.insertChar(' ');
    }
    undo.afterRow = editor.row;
    undo.afterCol = editor.col;
    return {
      undo
    };
  },
  undo(task) {
    editor.moveTo(task.afterRow, task.afterCol);
    for (let n = 0; (n < task.spaces); n++) {
      editor.back();
      editor.erase();
    }
  },
  redo(task) {
    editor.moveTo(task.row, task.col);
    return editor.handlers.tab.do();
  }
});
