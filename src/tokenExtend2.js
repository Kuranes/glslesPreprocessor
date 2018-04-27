var tokenID = require('./tokenId');


// glsl-token-depth
// token num on same line ?
function getTokenDepth(tokens) {
    var depth = 0;
    var loop = false;
    var currTokenIdx, token;
    var tokenLen = tokens.length;
    for (currTokenIdx = 0; currTokenIdx < tokenLen; currTokenIdx++) {
        token = tokens[currTokenIdx];
        loop = loop || (token.id === tokenID.KEYWORD && (
            token.data === 'for'
        ));

        switch (token.data[0]) {
            case '(':
                token.depth = loop ? depth++ : depth;
                break;
            case '{':
                token.depth = loop ? depth : depth++;
                loop = false;
                break;
            case '}':
                token.depth = --depth;
                break;
            default:
                token.depth = depth;
        }
    }

    for (currTokenIdx = 0; currTokenIdx < tokenLen; currTokenIdx++) {

        token = tokens[currTokenIdx];
        if (token.id !== tokenID.IDENT && token.id !== tokenID.KEYWORD) continue;

        var index = skipArrayArguments(currTokenIdx + 1);

        if (tokens[index].id !== tokenID.IDENT) continue;

        index = skipArrayArguments(index);

        index++;

        if (tokens[index].data[0] !== '(') continue;

        while (index < tokenLen && tokens[index].data[0] !== ';'
            && tokens[index].data[0] !== '{') {
            tokens[index++].depth++;
        }
        if (index < tokenLen && tokens[index].data[0] === '{') tokens[index].depth++;
    }

    return tokens;

    function skipArrayArguments(idxToke) {
        var t;
        while (idxToke < tokenLen) {
            t = tokens[idxToke];
            if (
                t.id !== tokenID.WHITESPACE &&
                t.data[0] !== '[' &&
                t.data[0] !== ']' &&
                t.id !== tokenID.INTEGER
            ) return idxToke;

            idxToke++;
        }
        return idxToke;
    }
}

// glsl-token-scope
// need to have done the glsl-depth before
function getTokenScope(tokens) {
    var stack = [0];
    var inc = stack[0];
    var ldepth = 0;

    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        var depth = token.depth;

        if (depth > ldepth) {
            stack.push(++inc);
        } else
            if (depth < ldepth) {
                stack.splice(-1, 1);
            }

        token.scope = stack[stack.length - 1];
        token.stack = stack.slice();
        ldepth = token.depth;
    }

    return tokens;
}

// glsl-token-string

function getVariables(tokens, defines, functions) {
    var variables = {};
    var lastKeyword = Array(4);
    var k;
    var type, precision, qualifier;
    var structs = { '.': true, ')': true };
    var resets = { ';': true };
    var isStructMember = false;
    var struct = false;
    /*
    var isOpEndInstructions = {
        //',': true, // float x=1, b = 5;
        ';': true, //; float x =1;
        ')': true, // for (int i = 7, l = 5; i< l
        ')': true, // if() qsfqs = 5; but !
        '{': true, // if() {qsfqs = 5;
        '}': true, // } float a = 5;
    };
    */
    // after last ';', ')', '{', '}', and preproc
    //var instructionsStackStartAfter = 0;
    var token, data;
    var len = tokens.length;
    for (var i = 0; i < len; i++) {
        /*
                while (i < len && tokens[i].id === tokenID.WHITESPACE) {
                    i++;
                }
                */
        token = tokens[i];
        /*
        instructionsStackStartAfter = i;

        while (token.id !== tokenID.PREPROCESSOR &&
            !(token.id === tokenID.OPERATOR && isOpEndInstructions[token.data])) {
            i++;
            if (i === tokens.length) break;
            token = tokens[i];
        }
        if (i <= instructionsStackStartAfter + 1) {
            continue;
        }
        while (tokens[i].id === tokenID.WHITESPACE) {
            i++;
        }
        data = '';

        // we have an instruction "line"
        for (k = instructionsStackStartAfter; k < i; k++) {
            data += tokens[k].data;
        }
        console.log(data);
        i++;
        continue;
        */

        data = token.data;

        if (token.id === tokenID.KEYWORD) {
            lastKeyword[3] = lastKeyword[2];
            lastKeyword[2] = lastKeyword[1];
            lastKeyword[1] = lastKeyword[0];
            lastKeyword[0] = data;
            continue;
        } else if (resets[data]) {
            for (k = 0; k < 4; k++) {
                lastKeyword[k] = undefined;
            }
            type = undefined;
            precision = undefined;
            qualifier = undefined;
            struct = undefined;
            continue;
        }
        if (token.id !== tokenID.IDENT) {
            isStructMember = token.id === tokenID.OPERATOR && structs[data];
            continue;
        }

        if (isStructMember) continue;

        if (defines && defines[data]) continue;
        if (functions && functions[data]) continue;

        var scope = token.scope;
        if (!variables[scope]) {
            variables[scope] = {};
        } else {

            var variable = variables[scope][data];
            if (variable) {
                variable.tokens.push(token);
                token.variable = variable;
                console.log('instance: ' + data);
                continue;
            }
        }

        for (k = 0; k < 4; k++) {
            var word = lastKeyword[k];
            if (!word) break;

            if (!struct && word === 'struct') {
                struct = word;
                continue;
            }
            if (!type && /(b|i)?(void|struct|int|float|vec|vec|vec|mat|sampler)(\d)?/i.test(word)) {
                type = word;
                continue;
            }
            if (!qualifier && /uniform|varying|in|out|const/i.test(word)) {
                qualifier = word;
                continue;
            }
            if (!precision && /highp|lowp|mediump/i.test(word)) {
                precision = word;
                continue;
            }
        }

        if (struct) {
            console.log('struct: ' + token.data);

        }
        if (!type) {

            console.log('no var: ' + token.data);
            continue;

        }

        console.log((qualifier ? qualifier + ' ' : '') +
            (precision ? precision + ' ' : '') +
            type + ' ' + token.data);

        variable = {
            decl: token,
            name: data,
            type: type,
            scope: scope,
            precision: precision,
            qualifier: qualifier,
            tokens: []
        };
        variables[scope][data] = variable;
        token.variable = variable;

    }

    return variables;
}

module.exports = {
    getTokenDepth: getTokenDepth,
    getTokenScope: getTokenScope
};
