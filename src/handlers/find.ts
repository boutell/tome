"use strict";

import find from '../find.js';

export default ({ editor, clipboard, log }) => ({
  keyName: 'control-f',
  async do(key) {
    editor.hintStack.push([
      'ENTER: Find',
      '^E: rEgExp',
      '^A: cAse sensitive',
      '^U: Find previoUs',
      '^R: Replace',
      '^F: Cancel'
    ]);
    let regExp = false;
    let caseSensitive = false;
    const findField = editor.createSubEditor({
      prompt: getPrompt(),
      customHandlers: {
        return: {
          go() {
            return go(1);
          }
        },
        'control-e': {
          do() {
            regExp = !regExp;
            setPrompt();
          }
        },
        'control-a': {
          do() {
            caseSensitive = !caseSensitive;
            setPrompt();
          }
        },
        'control-r': {
          do() {
            return replace({
              editor,
              findField,
              closeFindField: close,
              clipboard,
              log
            });
          }
        },
        'control-u': {
          do() {
            return go(-1);
          }
        },
        'control-f': {
          do() {
            close();
          }
        }
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
  },
  // Only comes into play if the action was actually a find-and-replace
  undo({
    row,
    col,
    target,
    replacement,
    direction
  }) {
    editor.moveTo(row, col);
    editor.erase(replacement.length);
    editor.insert(target);
  },
  redo({
    row,
    col,
    target,
    replacement,
    direction
  }) {
    editor.moveTo(row, col);
    editor.erase(target.length);
    editor.insert(replacement);
  }
});

async function replace({
  editor,
  findField,
  closeFindField,
  caseSensitive,
  regExp,
  clipboard,
  log
}) {
  editor.hintStack.push([
    'ENTER: Replace',
    '^U: Replace previoUs',
    '^F: Cancel'
  ]);
  const replaceField = editor.createSubEditor({
    prompt: getPrompt(),
    customHandlers: {
      return() {
        return go(1);
      },
      'control-u': () => {
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
  replaceField.draw();
  while (!replaceField.removed) {
    const key = await editor.getKey();
    await replaceField.acceptKey(key);
  }
  function go(direction) {
    try {
      const target = findField.chars[0];
      const replacement = replaceField.chars[0];
      const findArgs = {
        target,
        replacement,
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
      }
      return result;
    } finally {
      close();
    }
  }
  function getPrompt() {
    return 'Replacement: ';
  }
  function close() {
    editor.hintStack.pop();
    editor.removeSubEditor(replaceField);
    closeFindField();
  }
}
