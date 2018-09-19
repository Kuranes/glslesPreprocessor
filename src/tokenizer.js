var literals100 = require('./syntax/literals');
var operators = require('./syntax/operators');
var builtins100 = require('./syntax/builtins');
var literals300es = require('./syntax/literals-300es');
var builtins300es = require('./syntax/builtins-300es');
var tokensID = require('./tokenId');

var tokenIDMap = JSON.stringify(tokensID)
    .replace(/"|{|}|:[0-9]+/g, '')
    .toLowerCase()
    .split(',');

function arrayToDict(a, o) {
    for (var i = 0; i < a.length; i++) o[a[i]] = true;
    return o;
}

// fast iswithin hashmap instead of indexof
var operatorsDict = arrayToDict(operators, {});

var builtins100Dict = arrayToDict(builtins100, {});
var literals100Dict = arrayToDict(literals100, {});

var builtins300esDict = arrayToDict(builtins300es, {});
var literals300esDict = arrayToDict(literals300es, {});

// TODO: pre-tokenize defines and macro
// TODO: - clean comment as parse ?
function tokenize(opt) {
    var tokenID = tokensID;
    ///////////////////////////////////:
    var i = 0,
        total = 0,
        mode = tokenID.NORMAL,
        c,
        last,
        content = '',
        tokens = [],
        line = 1,
        col = 0,
        start = 0,
        isnum = false,
        isoperator = false,
        len;
    ///////////////////////////////////:

    opt = opt || { eof: true };
    if (opt.doStats && !opt.stats) opt.stats = {};
    var allBuiltinsDict = builtins100Dict;
    var allLiteralsDict = literals100Dict;
    if (opt.version === '300 es') {
        allBuiltinsDict = builtins300esDict;
        allLiteralsDict = literals300esDict;
    }

    function token(data) {
        if (!data.length) return;

        //if (opt.tokensToStrip && opt.tokensToStrip[mode]) return;
        //      if (opt.tokensWarning && opt.tokensWarning[mode]) console.error('token: ' + data);

        tokens.push({
            id: mode,
            type: tokenIDMap[mode],
            data: data,
            position: start,
            end: start + data.length,
            line: line,
            column: col,
            depth: 0, // scope depth
            scope: 0, // scope id
            declaration: -1 // decl id
        });

        if (!opt.doStats) return;
        if (!opt.stats[mode]) {
            opt.stats[mode] = 1;
        } else {
            opt.stats[mode]++;
        }
    }

    function normal() {
        content = '';

        if (/\s/.test(c)) {
            mode = tokenID.WHITESPACE;
            start = total + i;
            return i;
        }

        if (last === '/' && c === '*') {
            start = total + i - 1;
            mode = tokenID.BLOCK_COMMENT;
            last = c;
            return i + 1;
        }

        if (last === '/' && c === '/') {
            start = total + i - 1;
            mode = tokenID.LINE_COMMENT;
            last = c;
            return i + 1;
        }

        if (c === '#') {
            mode = tokenID.PREPROCESSOR;
            start = total + i;
            return i;
        }

        isnum = /\d/.test(c);
        isoperator = !isnum && /[^\w_]/.test(c);

        start = total + i;
        mode = isnum ? tokenID.INTEGER : isoperator ? tokenID.OPERATOR : tokenID.TOKEN;
        return i;
    }

    function whitespace() {
        if (/[^\s]/g.test(c)) {
            token(content);
            mode = tokenID.NORMAL;
            return i;
        }
        content += c;
        last = c;
        return i + 1;
    }

    function preprocessor() {
        var isNewLine = c === '\n';
        if (isNewLine && last !== '\\') {
            token(content);
            mode = tokenID.NORMAL;
            return i;
        }
        if (!isNewLine && c !== '\\') {
            // convert  multi line macro to single line
            content += c;
        }
        last = c;
        return i + 1;
    }

    var line_comment = preprocessor;

    function block_comment() {
        if (c === '/' && last === '*') {
            content += c;
            token(content);
            mode = tokenID.NORMAL;
            return i + 1;
        }

        content += c;
        last = c;
        return i + 1;
    }

    function operator() {
        if (last === '.' && /\d/.test(c)) {
            mode = tokenID.FLOAT;
            return i;
        }

        if (last === '/' && c === '*') {
            mode = tokenID.BLOCK_COMMENT;
            return i;
        }

        if (last === '/' && c === '/') {
            mode = tokenID.LINE_COMMENT;
            return i;
        }

        if (c === '.' && content.length) {
            while (determine_operator(content));

            mode = tokenID.FLOAT;
            return i;
        }

        if (c === ';' || c === ')' || c === '(') {
            if (content.length) while (determine_operator(content));
            token(c);
            mode = tokenID.NORMAL;
            return i + 1;
        }

        var is_composite_operator = content.length === 2 && c !== '=';
        if (is_composite_operator || /[\w_\d\s]/.test(c)) {
            while (determine_operator(content));
            mode = tokenID.NORMAL;
            return i;
        }

        content += c;
        last = c;
        return i + 1;
    }

    function determine_operator(buf) {
        var j = 0,
            res;

        var l = buf.length;
        do {
            var lenOp = l + j;
            var op = lenOp === 1 ? buf[0] : buf.substring(0, lenOp);

            if (!operatorsDict[op]) {
                j--;
                if (lenOp) continue;
                res = buf[0];
                lenOp = 1;
            } else {
                res = op;
            }

            token(res);
            start += lenOp;
            l = content.length - lenOp;
            content = l === 0 ? '' : content.substring(lenOp);
            return l;
        } while (1);
    }

    function hex() {
        if (/[^a-f0-9]/i.test(c)) {
            token(content);
            mode = tokenID.NORMAL;
            return i;
        }

        content += c;
        last = c;
        return i + 1;
    }

    function integer() {
        if (c === '.') {
            content += c;
            mode = tokenID.FLOAT;
            last = c;
            return i + 1;
        }

        if (/[e]/i.test(c)) {
            content += c;
            mode = tokenID.FLOAT;
            last = c;
            return i + 1;
        }

        if (c === 'x' && content.length === 1 && content[0] === '0') {
            mode = tokenID.HEX;
            content += c;
            last = c;
            return i + 1;
        }

        if (/[^\d]/.test(c)) {
            token(content);
            mode = tokenID.NORMAL;
            return i;
        }

        content += c;
        last = c;
        return i + 1;
    }

    function decimal() {
        if (c === 'f') {
            content += c;
            last = c;
            i += 1;
        }

        if (/[e]/i.test(c)) {
            content += c;
            last = c;
            return i + 1;
        }

        if (c === '-' && /[e]/i.test(last)) {
            content += c;
            last = c;
            return i + 1;
        }

        if (/[^\d]/.test(c)) {
            token(content);
            mode = tokenID.NORMAL;
            return i;
        }

        content += c;
        last = c;
        return i + 1;
    }

    function tokenStringMode(contentstr) {
        if (allLiteralsDict[contentstr]) {
            return tokenID.KEYWORD;
        }
        if (allBuiltinsDict[contentstr]) {
            return tokenID.BUILTIN;
        }

        // warning if ident start with a literal ?
        // [^\d]*[a-z_][a-z_0-9]*
        // /\d/.test(contentStr[0])
        return tokenID.IDENT;
    }

    function readtoken() {
        if (/[^\d\w_]/.test(c)) {
            mode = tokenStringMode(content);
            token(content);
            mode = tokenID.NORMAL;
            return i;
        }
        content += c;
        last = c;
        return i + 1;
    }

    return function(data) {
        tokens = [];
        if (data === null) return tokens;

        if (data.replace) {
            if (opt.whitespace) {
                data = data.replace(/(  +)+|(\n\n+)+|(\r\n+)+/g, function(matched, p1) {
                    return p1 ? ' ' : '\n';
                });
            } else {
                data = data.replace(/\r\n/g, '\n');
            }

            i = 0;
            len = data.length;

            var lastWrite;

            while (i < len) {
                lastWrite = i;

                c = data[i];
                switch (mode) {
                    case tokenID.BLOCK_COMMENT:
                        i = block_comment();
                        break;
                    case tokenID.LINE_COMMENT:
                        i = line_comment();
                        break;
                    case tokenID.PREPROCESSOR:
                        i = preprocessor();
                        break;
                    case tokenID.OPERATOR:
                        i = operator();
                        break;
                    case tokenID.INTEGER:
                        i = integer();
                        break;
                    case tokenID.HEX:
                        i = hex();
                        break;
                    case tokenID.FLOAT:
                        i = decimal();
                        break;
                    case tokenID.TOKEN:
                        i = readtoken();
                        break;
                    case tokenID.WHITESPACE:
                        i = whitespace();
                        break;
                    case tokenID.NORMAL:
                        i = normal();
                        break;
                    default:
                        continue;
                }

                // lastWrite !== i
                if (data[lastWrite] === '\n') {
                    col = 0;
                    line++;
                } else {
                    col++;
                }
            }
        }

        if (content.length) {
            if (mode === tokenID.TOKEN) mode = tokenStringMode(content);
            token(content);
        }
        if (opt.eof && !(opt.tokensToStrip && opt.tokensToStrip[tokenID.EOF])) {
            mode = tokenID.EOF;
            token('(eof)');
        }
        return tokens;
    };
}

module.exports = tokenize;
