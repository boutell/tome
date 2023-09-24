"use strict";

export default ({ editor }) => ({
  keyName: 'control-s',
  async do() {
    if (editor.save) {
      return editor.save();
    }
    return false;
  }
});
