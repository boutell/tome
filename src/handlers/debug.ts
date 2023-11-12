"use strict";

export default ({ editor }) => ({
  keyName: 'control-d',
  async do() {
    editor.log('debug state:', editor.state);
  }
});
