"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-r',
  do() {
    if (!editor.redos.length) {
      return false;
    }
    const task = editor.redos.pop();
    editor.handlers[task.action].redo(task);
    editor.undos.push(task);
    return true;
  }
});
