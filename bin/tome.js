#!/usr/bin/env node

// Workaround for ES module as bin script

import('../dist/app.js').catch((err) => { console.error(err); process.exit(1) });
