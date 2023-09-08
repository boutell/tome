"use strict";

module.exports = {
  // control-a through control-z
  ...Object.fromEntries(
    [...Array(26).keys()].map(
      n => [ String.fromCharCode(n + 1), 'control-' + String.fromCharCode('a'.charCodeAt(0) + n) ]
    )
  ),
  [fromCharCodes([ 27, 91, 65 ])]: 'up',
  [fromCharCodes([ 27, 91, 67 ])]: 'right',
  [fromCharCodes([ 27, 91, 66 ])]: 'down',
  [fromCharCodes([ 27, 91, 68 ])]: 'left',
  [fromCharCodes([ 27, 91, 49, 59, 50, 65 ])]: 'shift-up',
  [fromCharCodes([ 27, 91, 49, 59, 50, 67 ])]: 'shift-right',
  [fromCharCodes([ 27, 91, 49, 59, 50, 66 ])]: 'shift-down',
  [fromCharCodes([ 27, 91, 49, 59, 50, 68 ])]: 'shift-left',
  [fromCharCodes([ 27, 91, 49, 59, 53, 65 ])]: 'control-up',
  [fromCharCodes([ 27, 91, 49, 59, 53, 67 ])]: 'control-right',
  [fromCharCodes([ 27, 91, 49, 59, 53, 66 ])]: 'control-down',
  [fromCharCodes([ 27, 91, 49, 59, 53, 68 ])]: 'control-left',
  [fromCharCodes([ 27 ])]: 'escape',
  [fromCharCodes([ 13 ])]: 'enter',
  [fromCharCodes([ 9 ])]: 'tab',
  [fromCharCodes([ 127 ])]: 'backspace'
};

function fromCharCodes(a) {
  return a.map(ch => String.fromCharCode(ch)).join('');
}

