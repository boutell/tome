"use strict";

export default ({ editor, clipboard }) => ({
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
    const chars = editor.getSelectionChars();
    await clipboard.set(chars);
    editor.selectMode = false;
    return true;
  }
});
