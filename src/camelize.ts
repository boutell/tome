export default function camelize(s) {
  const words = s.split('-');
  let result = '';
  for (let i = 0; (i < words.length); i++) {
    if (i > 0) {
      result += words[i].charAt(0).toUpperCase() + words[i].substring(1);
    } else {
      result += words[i];
    }
  }
  return result;
}
