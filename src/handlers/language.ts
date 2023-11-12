"use strict";

import select from '../select.js';

export default ({ editor }) => ({
  keyName: 'control-l',
  do() {
    if (!editor.languages) {
      return false;
    }
    const languages = Object.values(editor.languages);
    let currentIndex = languages.indexOf(editor.language);
    currentIndex++;
    currentIndex %= languages.length;
    editor.setLanguage(languages[currentIndex]);
    return true;
  }
});
