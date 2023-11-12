"use strict";
const readline = require('readline');
const rl = readline.createInterface(process.stdin);
process.stdin.setRawMode(true);
readline.emitKeypressEvents(process.stdin);
process.stdin.on('keypress', (c, k) => {
    if (c === 'c') {
        process.exit(0);
    }
    console.log(JSON.stringify({ c, k }, null, '  '));
    if (c != null) {
        for (const ch of c) {
            console.log(ch.charCodeAt(0));
        }
    }
});
export {};
