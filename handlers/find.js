"use strict";

import find from '../find.js';

export default ({ editor, clipboard, log }) => ({
  keyName: 'control-f',
  async do(key) {
    editor.hintStack.push([
      'ENTER: Find',
      '^E: rEgExp',
      '^A: cAse sensitive',
      '^G: Find Again',
      '^R: Find pRevious',
      '^F: Cancel'
    ]);
    let regExp = false;
    let caseSensitive = false;
    const findField = editor.createSubEditor({
      prompt: getPrompt(),
      customHandlers: {
        return() {
          return go(1);
        },
        'control-e': () => {
          log('regex toggle');
          regExp = !regExp;
          setPrompt();
        },
        'control-a': () => {
          log('case toggle');
          caseSensitive = !caseSensitive;
          setPrompt();
        },
        'control-g': () => {
          log('again');
          close();
          // TODO can't "find again" until we have a context from a previous find
          editor.handlers.findAgain.do();
        },
        'control-r': () => {
          log('reverse');
          return go(-1);
        },
        'control-f': () => {
          log('cancel');
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
        const findArgs = {
          target,
          fromRow: editor.row,
          fromCol: editor.col,
          caseSensitive,
          regExp,
          direction
        };
        const result = find(editor, findArgs);
        if (result) {
          editor.lastFind = {
            ...findArgs,
            fromRow: editor.row,
            fromCol: editor.col
          };
          log('lastFind is:', editor.lastFind);
        }
        return result;
      } finally {
        close();
      }
    }
    function setPrompt() {
      findField.setPrompt(getPrompt());
      findField.draw();
    }
    function getPrompt() {
      return (regExp ? '[rE] ' : '') + (caseSensitive ? '[cA] ' : '') + 'Find: ';
    }
    function close() {
      editor.hintStack.pop();
      editor.removeSubEditor(findField);
    }
  }
});
