"use strict";

import select from '../select.js';

export default ({ editor }) => ({
  keyName: 'right',
  do() {
    return select({
      editor,
      move() {
        return editor.forward();
      }
    });     
  }
});
