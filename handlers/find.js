"use strict";

module.exports = ({ editor, clipboard, log }) => ({
  keyName: 'control-f',
  async do(key) {
    const findField = editor.createSubEditor({
      enter() {
        try {
          // TODO handle searches for multiline strings
          const findChars = findField.chars[0];
          for (let row = 0; (row < editor.chars.length); row++) {
            const editorChars = editor.chars[row];
            for (let col = 0; (col < editorChars.length); col++) {
              let j;
              for (j = 0; (j < findChars.length); j++) {
                if (editorChars[col + j] !== findChars[j]) {
                  break;
                }
              }
              if (j === findChars.length) {
                editor.row = row;
                editor.col = col;
                return;
              }
            }
          }
        } finally {
          editor.removeSubEditor(findField);
        }
      },
      escape() {
        editor.removeSubEditor(findField);
      },
      width: editor.width,
      height: 1,
      screenTop: editor.screenTop + editor.height - 1
    });
    findField.draw();
    while (!findField.removed) {
      const key = await editor.getKey();
      await findField.acceptKey(key);
    }
  }
});
