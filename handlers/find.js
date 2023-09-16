"use strict";

const find = require('../find.js');

module.exports = ({ editor, clipboard, log }) => ({
  keyName: 'control-f',
  async do(key) {
    hintStack.push([
      'ENTER: Find',
      '^E: rEgExp',
      '^A: cAse sensitive',
      '^G: Find Again',
      '^P: Find Previous',
      '^F: Cancel'
    ]);
    let regExp = false;
    let caseSensitive = false;
    const findField = editor.createSubEditor({
      prompt: getPrompt(),
      customHandlers: {
        enter() {
          return go(1);
        },
        'control-e': () => {
          regExp = !regExp;
          setPrompt();
        },
        'control-a': () => {
          caseSensitive = !caseSensitive;
          setPrompt();
        },
        'control-g': () => {
          close();
          editor.handlers.findAgain.do();
        },
        'control-p': () => {
          return go(-1);
        },
        'control-f': () => {
          close();
        }
      },
      width: editor.width,
      height: 1,
      screenTop: editor.screenTop + editor.height - 1
    });
    findField.draw();
    while (!findField.removed) {
      const key = await editor.getKey();
      if (key === 'control-f') {
      } else {
        await findField.acceptKey(key);
      }
    }
    function go(direction) {
      try {
        const target = findField.chars[0];
        const result = find(editor, target, editor.row, editor.col, direction);
        if (result) {
          editor.lastFind = {
            target,
            row: editor.row,
            col: editor.col,
            direction
          };
        }
        return result;
      } finally {
        close();
      }
    }
    function setPrompt() {
      findField.prompt = getPrompt();
      findField.draw();
    }
    function getPrompt() {
      return (regExp ? '[rE] ' : '') + (caseSensitive ? '[cA] ' : '') + 'Find: ';
    }
    function close() {
      hintStack.pop();
      editor.removeSubEditor(findField);
    }
  }
});
