"use strict";

module.exports = ({ editor }) => ({
  keyName: 'tab',
  do() {
    const nextStop = editor.tabSpaces - (editor.col % editor.tabSpaces);
    for (let n = 0; (n < nextStop); n++) {
      editor.insertChar(' ');
    }
    const undo = {
      spaces: nextStop
    };
    return {
      undo
    };
  },
  undo(task) {
    for (let n = 0; (n < task.spaces); n++) {
      editor.handlers.back.do();
      editor.erase();
    }
  }
});
