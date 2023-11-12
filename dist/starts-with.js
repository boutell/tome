// Return true if a contains the contents of b beginning
// at the given offset, where a and b are arrays
export default function (a, offset, b) {
    if (b.length > a.length) {
        return false;
    }
    for (let i = 0; (i < b.length); i++) {
        if (a[i + offset] !== b[i]) {
            return false;
        }
    }
    return true;
}
