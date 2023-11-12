"use strict";

export default ({ editor }) => ({
  keyName: 'escape',
  do() {
    // Stuck with a modal experience because it's a
    // miracle Mac Terminal lets me access any keys at all
    editor.selectMode = !editor.selectMode;
    return {
      selecting: editor.selectMode
    };
  }
});
