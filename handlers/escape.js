"use strict";

module.exports = ({ editor }) => ({
  keyName: 'escape',
  do() {
    if (editor.escape) {
      // Custom escape handler instead, like for the editor used in the "find" field
      return editor.escape();
    }
    // TODO enter the selection mode I'm stuck creating because shift-arrow isn't reliably available
    // in terminals boo
    return true;
  }
});
