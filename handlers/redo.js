"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-y',
  async do() {
    if (!editor.redos.length) {
      return false;
    }
    const task = editor.redos.pop();
    await editor.handlers[task.action].redo(task);
    editor.undos.push(task);
    return true;
  }
});
