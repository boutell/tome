const exec = require('child_process').execSync;

module.exports = ({ out }) => {
  // Parse terminfo, adequately
  // TODO: Windows will need a canned ANSI termcap or something
  let info = exec('infocmp', { encoding: 'utf8' });
  info = info.replace(/^#.*\n/g, '');
  const fields = info.split(/,\s+/);
  const name = fields.shift();
  const caps = {};
  for (const field of fields) {
    const numberMatches = field.match(/(\w+)#(.*)+/);
    if (numberMatches) {
      let [ , name, value ] = numberMatches;
      if (value.startsWith('0x')) {
        value = parseInt(value.substring(2), 16);
      } else {
        value = parseInt(value);
      }
      caps[name] = value;
      continue;
    }
    const stringMatches = field.match(/(\w+)=(.*)+/);
    if (stringMatches) { 
      const [ , name, value ] = stringMatches;
      caps[name] = unescapeTerminal(value);
      continue;
    }
    caps[name] = true;
  }
  return {
    caps,
    // very halfassed implementation, missing many termcap features
    invoke(name, ...args) {
      const stack = [];
      let cap = caps[name];
      // logCodes(cap);
      while (true) {
        const percentAt = cap.indexOf('%');
        if (percentAt === -1) {
          out.write(cap);
          break;
        }
        const before = cap.substring(0, percentAt);
        if (before.length) {
          out.write(before);
        }
        cap = cap.substring(percentAt + 1);
        const code = consume();
        if (code === 'i') {
          args[0]++;
          args[1]++;
        } else if (code === 'p') {
          const which = parseInt(consume()) - 1;
          stack.push(args[which]);
        } else if (code === 'd') {
          const popped = stack.pop();
          out.write(popped.toString());
        } 
        function consume() {
          const ch = cap.charAt(0);
          cap = cap.substring(1);
          return ch;
        }
      }
    },
    write(s) {
      out.write(s);
    }
  };
};

function unescapeTerminal(value) {
  value = value.replace(/\\[Ee]/g, String.fromCharCode(27)); 
  value = value.replace(/\\n/g, '\n');
  value = value.replace(/\\r/g, '\n');
  value = value.replace(/\\t/g, '\t');
  value = value.replace(/\\b/g, String.fromCharCode(8));
  value = value.replace(/\\s/g, ' ');
  value = value.replace(/\\^/g, '^');
  value = value.replace(/\\\\/g, '\\');
  value = value.replace(/\\,/g, ',');
  value = value.replace(/\\:/g, ':');
  value = value.replace(/\\(\d\d\d)/g, ch => String.fromCharCode(parseInt(ch, 8)));
  // I know this should be "\200"
  // value = value.replace(/\\0/g, String.fromCharCode(0));
  value = value.replace(/\^([a-z])/g, ch => String.fromCharCode(ch.charCodeAt(0) - 96));
  // DEL
  value = value.replace(/\^\?/g, String.fromCharCode(127));
 // I didn't parse delays, hopefully not needed in modern terminals
  return value;
}
