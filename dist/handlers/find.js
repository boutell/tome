"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import find from '../find.js';
export default ({ editor, clipboard, log }) => ({
    keyName: 'control-f',
    do(key) {
        return __awaiter(this, void 0, void 0, function* () {
            editor.hintStack.push([
                'ENTER: Find',
                '^E: rEgExp',
                '^A: cAse sensitive',
                '^U: Find previoUs',
                '^R: Replace',
                '^F: Cancel'
            ]);
            let regExp = false;
            let caseSensitive = false;
            const findField = editor.createSubEditor({
                prompt: getPrompt(),
                customHandlers: {
                    return() {
                        return go(1);
                    },
                    'control-e': () => {
                        regExp = !regExp;
                        setPrompt();
                    },
                    'control-a': () => {
                        caseSensitive = !caseSensitive;
                        setPrompt();
                    },
                    'control-r': () => {
                        return replace({
                            editor,
                            findField,
                            closeFindField: close,
                            clipboard,
                            log
                        });
                    },
                    'control-u': () => {
                        return go(-1);
                    },
                    'control-f': () => {
                        close();
                    }
                },
                width: editor.width,
                height: 1,
                screenTop: editor.screenTop + editor.height - 1
            });
            findField.draw();
            while (!findField.removed) {
                const key = yield editor.getKey();
                yield findField.acceptKey(key);
            }
            function go(direction) {
                try {
                    const target = findField.chars[0];
                    const findArgs = {
                        target,
                        fromRow: editor.row,
                        fromCol: editor.col,
                        caseSensitive,
                        regExp,
                        direction
                    };
                    const result = find(editor, findArgs);
                    if (result) {
                        editor.lastFind = Object.assign(Object.assign({}, findArgs), { fromRow: editor.row, fromCol: editor.col });
                    }
                    return result;
                }
                finally {
                    close();
                }
            }
            function setPrompt() {
                findField.setPrompt(getPrompt());
                findField.draw();
            }
            function getPrompt() {
                return (regExp ? '[rE] ' : '') + (caseSensitive ? '[cA] ' : '') + 'Find: ';
            }
            function close() {
                editor.hintStack.pop();
                editor.removeSubEditor(findField);
            }
        });
    },
    // Only comes into play if the action was actually a find-and-replace
    undo({ row, col, target, replacement, direction }) {
        editor.moveTo(row, col);
        editor.erase(replacement.length);
        editor.insert(target);
    },
    redo({ row, col, target, replacement, direction }) {
        editor.moveTo(row, col);
        editor.erase(target.length);
        editor.insert(replacement);
    }
});
function replace({ editor, findField, closeFindField, caseSensitive, regExp, clipboard, log }) {
    return __awaiter(this, void 0, void 0, function* () {
        editor.hintStack.push([
            'ENTER: Replace',
            '^U: Replace previoUs',
            '^F: Cancel'
        ]);
        const replaceField = editor.createSubEditor({
            prompt: getPrompt(),
            customHandlers: {
                return() {
                    return go(1);
                },
                'control-u': () => {
                    return go(-1);
                },
                'control-f': () => {
                    close();
                }
            },
            width: editor.width,
            height: 1,
            screenTop: editor.screenTop + editor.height - 1
        });
        replaceField.draw();
        while (!replaceField.removed) {
            const key = yield editor.getKey();
            yield replaceField.acceptKey(key);
        }
        function go(direction) {
            try {
                const target = findField.chars[0];
                const replacement = replaceField.chars[0];
                const findArgs = {
                    target,
                    replacement,
                    fromRow: editor.row,
                    fromCol: editor.col,
                    caseSensitive,
                    regExp,
                    direction
                };
                const result = find(editor, findArgs);
                if (result) {
                    editor.lastFind = Object.assign(Object.assign({}, findArgs), { fromRow: editor.row, fromCol: editor.col });
                }
                return result;
            }
            finally {
                close();
            }
        }
        function getPrompt() {
            return 'Replacement: ';
        }
        function close() {
            editor.hintStack.pop();
            editor.removeSubEditor(replaceField);
            closeFindField();
        }
    });
}
