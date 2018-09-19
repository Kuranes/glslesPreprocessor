var uniqVarName = require('./uniqVarName');
var tokenID = require('./tokenId');
var keywords = require('./tokenUtils').allKeywords;

// 2- minify whitespace
// 1- format
// 0 - no change output
var tokensToString = function(tokens, format, optionsParam) {
    var len = tokens.length;

    if (format === 0) {
        var str = '';
        for (var i = 0; i < len; i++) {
            str += tokens[i].data;
        }
        return str;
    }
    // remove unneeded white space
    if (format === 2) {
        var data;
        var t = tokens[0];
        var tNext = t;
        var tPrev = t;
        var lastLineEnd = true;
        var nextIsLineEnd = false;

        // whitespace:
        // - after a preproc
        // - after a keyword
        // - after a  struct
        var st = '';
        var c;
        for (var p = 0; p < len; p++) {
            tPrev = t;
            t = tNext;
            tNext = p + 1 < len ? tokens[p + 1] : tokens[p];

            if (t.id !== tokenID.WHITESPACE) {
                c = tokens[p].data;
                st += c;
                continue;
            }

            if (c === '\n') continue;

            if (tNext.id === tokenID.PREPROCESSOR) {
                c = '\n';
                st += c;
                continue;
            }
            if (tPrev.id === tokenID.PREPROCESSOR) {
                c = '\n';
                st += c;
                continue;
            }

            if (tPrev.id === tokenID.KEYWORD) {
                c = ' ';
                st += c;
                continue;
            }

            if (tPrev.id === tokenID.IDENT) {
                // mmm only if struct ?
                c = ' ';
                st += c;
                continue;
            }
        }
        return st;
    }
    // format strictly
    var output = [];
    var options = optionsParam || { whitespace: true, tabs: 4 };
    var spacesNum = options.tabs ? options.tabs : 1;
    var spaces = Array(spacesNum).join(' ');
    var maxDepth = 15;
    var tabs = new Array(15);
    tabs[0] = '';
    for (var k = 1; k < maxDepth; k++) {
        tabs[k] = Array(1 + k).join(spaces);
    }
    var opNotMath = {
        '.': true,
        ',': true,
        ';': true,
        '(': true,
        ')': true,
        '{': true,
        '}': true,
        '[': true,
        ']': true
    };
    var noLineEnd = {
        ',': true,
        '(': true,
        ')': true,
        '{': true,
        '}': true,
        '[': true,
        ']': true
    };
    var opMath = {
        '+': true,
        '*': true,
        '-': true,
        '/': true,
        '>': true,
        '<': true,
        '|': true,
        '&': true,
        '=': true,
        '==': true,
        '!=': true,
        '>=': true,
        '<=': true,
        '>>': true,
        '<<': true,
        '||': true,
        '&&': true
    };
    var data;
    var t = tokens[0];
    var tNext = t;
    var tPrev = t;
    var lastLineEnd = true;
    var nextIsLineEnd = false;
    for (var currTokenIdx = 0; currTokenIdx < len; currTokenIdx++) {
        tPrev = t;
        t = tNext;
        tNext = currTokenIdx + 1 < len ? tokens[currTokenIdx + 1] : tokens[currTokenIdx];
        if (nextIsLineEnd) {
            lastLineEnd = true;
            nextIsLineEnd = false;
        }
        data = t.data;

        switch (t.id) {
            case tokenID.WHITESPACE:
                if (lastLineEnd) {
                    continue;
                }
                lastLineEnd = data[0] === '\n';
                // TODO: line end: handle inside parens () and inside [], and inside struct {}
                if (noLineEnd[tNext.data[0]] || noLineEnd[tPrev.data[0]]) {
                    lastLineEnd = false;
                    continue;
                }
                if (lastLineEnd) continue;
                if (tPrev.data[0] === ' ') continue;
                break;

            case tokenID.EOF:
                break;

            case tokenID.PREPROCESSOR:
                if (!lastLineEnd) lastLineEnd = true;
                break;

            case tokenID.OPERATOR:
                switch (data[0]) {
                    case ';':
                    case '}':
                    case '{':
                        nextIsLineEnd = true;
                        break;
                    case ')':
                    case ']':
                        lastLineEnd = false;
                        if (tPrev.data[0] !== ' ') data = ' ' + data;
                        break;
                    case '[':
                    case ',':
                    case '(':
                        lastLineEnd = false;
                        if (tNext.data[0] !== ' ') data = data + ' ';
                        break;
                    default:
                        lastLineEnd = false;
                        // no special rule, expand math operators
                        if (opMath[data]) {
                            // space around operators
                            if (tPrev.data[0] !== ' ') data = ' ' + data;

                            if (tNext.data[0] !== ' ') data = data + ' ';
                        }
                        break;
                }
                break;

            // nothing to do here
            //case tokenID.KEYWORD:
            //case tokenID.IDENT:
            //default:
            //    break;
        }

        //  indent line start
        if (lastLineEnd && currTokenIdx > 0) {
            data =
                '\n' + (t.depth <= 0 || t.id === tokenID.PREPROCESSOR ? '' : tabs[t.depth]) + data;
            lastLineEnd = false;
        }

        output.push(data);
    }

    return output.join('');
};

function minify(tokens, opt, tokenIDMap) {
    keywords['main'] = true;

    var doneReplace = {};
    var words = uniqVarName(
        keywords,
        opt.doStats && opt.stats[tokenID.IDENT] + opt.stats[tokenID.KEYWORD]
    );
    var numReplace = 0;
    var len = tokens.length;
    var addDefines = [];
    var t;

    var realStart = -1;
    while (++realStart < len) {
        t = tokens[realStart];
        if (t.id === tokenID.WHITESPACE) continue;
        if (t.id !== tokenID.PREPROCESSOR) continue;
        if (t.data.indexOf('#version') === -1 && t.data.indexOf('#extension') === -1) break;
    }

    var needDefineList = {};
    needDefineList[tokenID.KEYWORD] = true;
    needDefineList[tokenID.BUILTIN] = true;
    var replaceList = {};
    replaceList[tokenID.IDENT] = true;
    replaceList[tokenID.KEYWORD] = true;
    replaceList[tokenID.BUILTIN] = true;

    for (var currTokenIdx = realStart; currTokenIdx < len; currTokenIdx++) {
        t = tokens[currTokenIdx];

        if (t.minified) continue;

        if (replaceList[t.id]) {
            var preMin = t.data;
            var postMin = doneReplace[t.data] || words[numReplace++];
            doneReplace[preMin] = postMin;
            t.data = postMin;
            t.minified = true;
            // use scope level >=
            // use list of ident/assign
            for (var currTokenIdx2 = currTokenIdx + 1; currTokenIdx2 < len; currTokenIdx2++) {
                var t2 = tokens[currTokenIdx2];
                if (replaceList[t2.id] && t2.data === preMin) {
                    t2.data = postMin;
                    t2.minified = true;
                }
            }

            if (needDefineList[t.id]) {
                // TODO: only replace keywords/builtins if "#define qdf keyword".length + qdf < keyword.length*instancees
                t = {
                    id: tokenID.PREPROCESSOR,
                    type: tokenIDMap[tokenID.PREPROCESSOR],
                    data: '#define ' + postMin + ' ' + preMin
                };
                addDefines.push({
                    id: tokenID.WHITESPACE,
                    type: tokenIDMap[tokenID.WHITESPACE],
                    data: '\n'
                });
                addDefines.push(t);
                addDefines.push({
                    id: tokenID.WHITESPACE,
                    type: tokenIDMap[tokenID.WHITESPACE],
                    data: '\n'
                });
            }
        }
    }

    tokens.splice.apply(tokens, [realStart, 0].concat(addDefines));
    delete keywords['main'];
}
module.exports = {
    minify: minify,
    tokensToString: tokensToString
};
