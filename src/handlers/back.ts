"use strict";

import select from '../select.js';

export default ({ editor }) => ({
  keyName: 'left',
  do() {
    return select({
      editor,
      move() {
        return editor.back();
      }
    });
  }
});
