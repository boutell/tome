"use strict";

module.exports = ({ editor }) => ({
  keyName: 'control-u',
  async do(key) {
    if (!editor.undos.length) {
      return false;
    }
    const task = editor.undos.pop();
    await editor.handlers[task.action].undo(task);
    editor.redos.push(task);
    return true;
  }
});
