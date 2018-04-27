module.exports = uniqVarName;

function uniqVarName(keywords, numIdent) {
    var characters = [];
    var numChars = 0;

    var p;
    var length = 'z'.charCodeAt(0);
    for (p = 'a'.charCodeAt(0); p < length; ++p)
        characters[numChars++] = String.fromCharCode(p);

    characters.push('_');
    length = 'Z'.charCodeAt(0);
    for (p = 'A'.charCodeAt(0); p < length; ++p)
        characters[numChars++] = String.fromCharCode(p);


    var words = new Array(numIdent);
    length = characters.length;
    for (var i = 0; i < numIdent; i++) {

        var idx = numIdent - i;
        var remainder = idx % length;
        var word = '';

        if (idx === 0) {
            words[i] = characters[idx];
            continue;
        }

        while (idx) {
            word = characters[remainder] + word;
            idx = ~~(idx / length);
            remainder = idx % length;
        }

        words[i] = word;
    }
    return words;
}
