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
    if (selRow === false) {
      selRow = _row;
      selCol = _col;
    }
    if ((selRow === row) && (selCol === col)) {
      return false;
    }  
    return {
      selecting: true
    };
  }
});
