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
import fs from 'fs';
export default ({ stateFolder, lock }) => {
    const clipboardFile = `${stateFolder}/clipboard.json`;
    const clipboardLockFile = `${clipboardFile}.lock`;
    return {
        set(chars) {
            return __awaiter(this, void 0, void 0, function* () {
                const release = yield lock(clipboardLockFile);
                try {
                    fs.writeFileSync(clipboardFile, JSON.stringify(chars));
                }
                finally {
                    yield release();
                }
            });
        },
        get(chars) {
            return __awaiter(this, void 0, void 0, function* () {
                const release = yield lock(clipboardLockFile);
                try {
                    const clipboard = JSON.parse(fs.readFileSync(clipboardFile));
                    return clipboard;
                }
                catch (e) {
                    if (e.code === 'ENOENT') {
                        // No clipboard exists right now
                        return false;
                    }
                    throw e;
                }
                finally {
                    yield release();
                }
            });
        }
    };
};
