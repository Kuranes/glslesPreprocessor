var FUNCTION_DEFINITION = '@@_GLSL_TOKEN_FUNCTION_DEFINITION';
var SHOULD_REMOVE = '@@_GLSL_TOKEN_SHOULD_REMOVE';

function tokenFunctions(tokens) {
    var returnType = null;
    var defnName = null;
    var braceDepth = 0;
    var braceStart = 0;
    var defnStart = 0;
    var argFinish = 0;
    var argStart = 0;
    var output = [];
    var i, j, token;

    // The following loop detects functions with bodies of any type,
    // including structs. e.g.
    // void main() {...}
    // vec4 fn(vec3 a) {...}
    // Ray3 fn(vec3 ro, vec3 rd) {...}
    for (i = 0, j; i < tokens.length; i++) {
        token = tokens[i];
        if (token.data === '{') {
            // If already in a function, keep track of opening braces
            if (braceDepth && braceDepth++) continue;

            // Stepping backwards from the closing brace, find the end
            // of the arguments list. There should only be whitespace on
            // the way there.
            j = findPrevious(i, findOp(')'), findOp());
            if (j < 0) continue;
            argFinish = j;

            // Step backwards to find the beginning of the arguments list. If there's
            // a nested paranthesis in there, then it's definitely not a function.
            j = findPrevious(j, findOp('('), findOp(')'));
            if (j < 0) continue;
            argStart = j;

            // Continue stepping backwards past any whitespace to find the
            // function name. If the token isn't an identifier then it's not a
            // function so we bail
            j = findPrevious(j, findGlyph);
            if (j < 0) continue;
            if (tokens[j].type !== 'ident') continue;
            defnName = tokens[j].data;

            // The next non-whitespace token should be the return type of
            // the function
            j = findPrevious(j, findGlyph);
            if (j < 0) continue;

            braceDepth = 1;
            braceStart = i;
            returnType = tokens[j].data;
            defnStart = j;

            // There are cases when a function definition includes a
            // precision qualifier, e.g. highp float random();
            // So we backtrack one extra step to check if that's the
            // case, and handle it :)
            var k = findPrevious(j, findGlyph);
            switch (tokens[k] && tokens[k].data) {
                case 'lowp':
                case 'highp':
                case 'mediump':
                    defnStart = k;
            }
        } else if (braceDepth && token.data === '}') {
            if (--braceDepth) continue;

            output.push({
                name: defnName,
                type: returnType,
                body: [braceStart + 1, i],
                args: [argStart, argFinish + 1],
                outer: [defnStart, i + 1]
            });
        }
    }

    // This loop is for handling the edge case of functions defined
    // without a body. Generally, this body is defined later in the file.
    // void main();
    // vec2 doModel(vec3 p);
    // Note the replacement of curly braces with a semicolon.
    for (i = 0; i < tokens.length; i++) {
        token = tokens[i];
        if (token.data === ';') {
            // Like before, we start from a semicolon and find the
            // bounds of the argument list to find the function name
            j = findPrevious(i, findOp(')'), findOp());
            if (j < 0) continue;
            argFinish = j;
            j = findPrevious(j, findOp('('), findOp(')'));
            if (j < 0) continue;
            argStart = j;
            j = findPrevious(j, findGlyph);
            if (j < 0) continue;
            if (tokens[j].type !== 'ident') continue;
            defnName = tokens[j].data;

            // Try and find an ident or builtin character, which should be
            // our return type. If so, it'll be the very first preceding glyph.
            j = findPrevious(j, findGlyph);
            if (j < 0) continue;
            if (tokens[j].type === 'operator') continue;
            if (tokens[j].data === 'return') continue;
            returnType = tokens[j].data;

            output.push({
                name: defnName,
                type: returnType,
                body: false,
                args: [argStart, argFinish + 1],
                outer: [j, i + 1]
            });
        }
    }

    return output.sort(function(a, b) {
        return a.outer[0] - b.outer[0];
    });

    function findPrevious(start, match, bail) {
        for (var p = start - 1; p >= 0; p--) {
            if (match(tokens[p])) return p;
            if (bail && bail(tokens[p])) return -1;
        }

        return -1;
    }
}

function findOp(data) {
    return function(token) {
        return token.type === 'operator' && (!data || token.data === data);
    };
}

function findGlyph(token) {
    return token.type !== 'whitespace';
}

function shake(tokens, options) {
    options = options || {};

    var functionsRemoved = 0;
    var tokensRemoved = 0;
    var iterations = 0;

    var ignore = [].concat(options.ignore || []);
    var ignoreList = {};
    for (var i = 0; i < ignore.length; i++) {
        ignoreList[ignore[i]] = true;
    }

    while (++iterations) {
        var results = shakeStep(tokens, ignoreList);
        if (!results) break;
        functionsRemoved += results.functionsRemoved;
        tokensRemoved += results.tokensRemoved;
        if (!results.tokensRemoved) break;
    }

    return {
        functionsRemoved: functionsRemoved,
        tokensRemoved: tokensRemoved,
        iterations: iterations
    };
}

function shakeStep(tokens, ignoreList) {
    var fns = tokenFunctions(tokens);
    if (!fns.length) return;

    var fnIndex = {};
    var lastFunction = fns[fns.length - 1].name;

    // Build up a list of functions to check
    for (var f = 0; f < fns.length; f++) {
        var fn = fns[f];

        fn.argCount = fnDefnArgCount(tokens, fn.args);
        fnIndex[fn.name] = fnIndex[fn.name] || [];
        fnIndex[fn.name].push(fn);

        // Mark the function's name token as such — this way
        // we know not to mistakenly delete it later.
        var next = nextGlyph(tokens, fn.outer[0]);
        if (next !== -1) tokens[next][FUNCTION_DEFINITION] = true;
    }

    // Run through our tokens and cull any functions from `fnIndex`
    // that aren't being used.
    for (var i = 0; i < tokens.length; i++) {
        // Check if this is a function call.
        var token = tokens[i];
        if (token.type !== 'ident') continue;
        if (token[FUNCTION_DEFINITION]) continue;

        var index = fnIndex[token.data];
        if (!index) continue;

        var next = nextGlyph(tokens, i);
        if (next === -1) continue;
        if (tokens[next].data !== '(') continue;

        // Remove any function calls that are being used. This is
        // grouped by argument count, so functions with the same
        // name but different arities will still get removed
        // in most cases where appropriate.
        var count = countArguments(tokens, next);
        var fnArgCount = count[0];
        var fnCallEnds = count[1];

        for (var j = 0; j < index.length; j++) {
            if (index[j].argCount === fnArgCount) {
                index.splice(j--, 1);
            }
        }

        if (!index.length) delete fnIndex[token.data];
    }

    var functionsRemoved = 0;
    var tokensRemoved = 0;

    for (var name in fnIndex) {
        // Don't delete `main`, the last function in the shader,
        // any functions passed through `opts.ignore`, or any functions
        // that are being used in the shader.
        if (name === 'main') continue;
        if (name === lastFunction) continue;
        if (ignoreList[name]) continue;
        if (!fnIndex.hasOwnProperty(name)) continue;

        // Otherwise run through the remaining missing functions
        // and mark their tokens for deletion.
        var index = fnIndex[name];
        for (var k = 0; k < index.length; k++) {
            var start = index[k].outer[0];
            var finish = Math.min(tokens.length, index[k].outer[1]);
            functionsRemoved++;

            for (var b = start; b < finish; b++) {
                tokensRemoved++;
                tokens[b][SHOULD_REMOVE] = true;
            }

            if (tokens[b] && tokens[b].type === 'whitespace') {
                tokensRemoved++;
                tokens[b][SHOULD_REMOVE] = true;
            }
        }
    }

    // Finally, remove all of the remaining tokens!
    for (var t = 0; t < tokens.length; t++) {
        if (!tokens[t]) break;
        if (!tokens[t][SHOULD_REMOVE]) continue;
        for (var u = t; u < tokens.length; u++) {
            if (tokens[u][SHOULD_REMOVE]) continue;
            var diff = u - t;
            tokens.splice(t, diff);
            t -= diff;
            break;
        }
    }

    return {
        functionsRemoved: functionsRemoved,
        tokensRemoved: tokensRemoved
    };
}

// Returns the index of the next non-whitespace token after `idx`
function nextGlyph(tokens, idx) {
    for (var i = idx + 1; i < tokens.length; i++) {
        if (tokens[i].type !== 'whitespace') return i;
    }
    return -1;
}

// Returns a tuple containing the number of arguments for the function call
// whose opening parenthesis starts at `idx`, and the token index where the
// function call finishes.
function countArguments(tokens, idx) {
    var hitGlyph = false;
    var parDepth = 1;
    var count = 0;
    for (var i = idx + 1; i < tokens.length; i++) {
        var data = tokens[i].data;
        if (data === ',') {
            if (parDepth === 1) count++;
        } else if (data === ')') {
            if (!--parDepth) return [count + hitGlyph, i];
        } else if (data === '(') {
            parDepth++;
        } else if (data === 'void') {
            continue;
        } else if (tokens[i].type !== 'whitespace') {
            hitGlyph = true;
        }
    }

    return [count, -1];
}

function fnDefnArgCount(tokens, args) {
    var hitGlyph = false;
    var count = 0;

    for (var i = args[0] + 1; i < args[1]; i++) {
        if (tokens[i].data === ')') break;
        if (tokens[i].type !== 'whitespace') hitGlyph = true;
        if (tokens[i].data === ',') count++;
    }

    return count + hitGlyph;
}

module.exports = shake;
