"use strict";

import select from '../select.js';

export default ({ editor }) => ({
  keyNames: [ 'control-b' ],
  do() {
    if (editor.eol()) {
      return false;
    }
    const char = editor.peek();
    if (editor.language.shouldOpenBlock(editor.state, char)) {
      return editor.language.forwardToCloser(editor.state, args(editor));
    } else if (editor.language.shouldCloseBlock(editor.state, char)) {
      return editor.language.backToOpener(editor.state, args(editor));
    }
  }
});

function args(editor) {
  return {
    forward() {
      const result = editor.forward();
      if (!result) {
        return false;
      }
      return editor.state;
    },
    back() {
      const result = editor.back();
      if (!result) {
        return false;
      }
      return editor.state;
    },
    log: editor.log
  };
}
 