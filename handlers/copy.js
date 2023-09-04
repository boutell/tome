"use strict";

module.exports = ({ editor, clipboard }) => ({
  keyName: 'control-c',
  async do(key) {
    const {
      selected,
      selRow1,
      selCol1,
      selRow2,
      selCol2
    } = editor.getSelection();
    if (!selected) {
      return false;
    }
    await clipboard.set(editor.getSelectionChars());
    return true;
  }
});
