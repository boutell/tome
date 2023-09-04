"use strict";

module.exports = ({ editor, keyNames, selectorsByName }) => ({
  keyNames: [ 'shift-up', 'shift-right', 'shift-down', 'shift-left' ],
  do(key) {
    const _row = editor.row, _col = editor.col;
   
    // Piggyback on the regular movement handlers
    const selector = selectorsByName[keyNames[key]];
    if (!selector) {
      return false;
    }
    editor.handlers[selector].do();
    if (editor.selRow === false) {
      editor.selRow = _row;
      editor.selCol = _col;
    }
    if ((editor.selRow === editor.row) && (editor.selCol === editor.col)) {
      return false;
    }  
    return {
      selecting: true
    };
  }
});
