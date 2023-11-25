"use strict";

export default ({ editor, clipboard }) => ({
  keyName: 'control-c',
  selectionRequired: true,
  async do(key) {
    if (!editor.hasSelection()) {
      throw new Error('copy handler invoked without a selection, should be impossible');
    }
    const {
      selRow1,
      selCol1,
      selRow2,
      selCol2
    } = editor.getSelection();
    const chars = editor.getSelectionChars();
    await clipboard.set(chars);
    editor.selectMode = false;
    return true;
  }
});
