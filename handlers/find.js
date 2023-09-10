"use strict";

const find = require('../find.js');

module.exports = ({ editor, clipboard, log }) => ({
  keyName: 'control-f',
  async do(key) {
    const findField = editor.createSubEditor({
      prompt: 'Find: ',
      enter() {
        try {
          const target = findField.chars[0];
          const result = find(editor, target, editor.row, editor.col);
          if (result) {
            editor.lastFind = {
              target,
              row: editor.row,
              col: editor.col
            };
          }
          return result;
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
