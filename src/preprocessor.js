var tokenize = require('./tokenizer');
var tokenID = require('./tokenId');
var exprMathEval = require('./exprEval');

('use strict');

//https://gcc.gnu.org/onlinedocs/cpp/Initial-processing.html#Initial-processing
// comments => single space
// line join => no space

// https://gcc.gnu.org/onlinedocs/cpp/Tokenization.html#Tokenization
// Tokens do not have to be separated by white space, but it is often necessary to avoid ambiguities.

/*
preprocessor:
define
else
elif
endif
extension
ifdef
if
pragma
undef
version
 */
// multiple Conditions: defined(_MYDEF) && 5 == MY_DEF && !defined(_ALL_DEF_H)
//var multipleExprReg = /((!defined|defined)\s?\({1}\s?(\w+)\s?\){1})|((\*)|(\/)|(<=)|(>=)|(<)|(>)|(-)|(\+)|(!=)|(==)|(&&)|(\|\|)|(&)|(\|))|(\w+)+/gi;
//var singleExprReg = /\(([a-z_0-9\-\+\=\!\~\&\|\<\> \t]+)\)/gi;
var definedReg = /(!)*[\b\t ]*defined[\b\t ]*\(?([_a-zA-Z0-9]+)\)?/gi;
// change of context

//var defineReg = /#define\s(\w+)$|#define\s(\w+)\s(\S+)|#define\s(\w+)\(\w+\)(.+)/i;
//#defined AQqsdf q534 + qsdf
//#define test(a, b) qsdfq qfs fqs q
var defineReg = /#define[\t ]+([_a-z0-9]+)[\t ]*\(([_a-z0-9, ]+)\)[\t ]*((.)+)|#define[\t ]+([_a-z0-9]+)[\t ]*((.)*)/i;

var undefReg = /#undef (.+)/i;

//
var extensionReg = /#extension\s(\w+)\s:\s(\w+)/i;

// regex to extract error message and line from webgl compiler reporting
// one condition
var ifdefReg = /#ifdef\s(.+)/i;
var elseReg = /#else/i;
var endifReg = /#endif/i;
var ifndefReg = /#ifndef\s(.+)/i;
var ifReg = /#if\s(.+)/i;
//var ifReg = /#if defined(.+)/g
var elifReg = /#elif\s(.+)/i;
//var elifReg = /#elif defined(.+)/gi;

var tokensToStrip = {};
tokensToStrip[tokenID.BLOCK_COMMENT] = true;
tokensToStrip[tokenID.LINE_COMMENT] = true;
tokensToStrip[tokenID.EOF] = true;
var tokenizeOptionsDefine = { stripTokens: tokensToStrip };

// TODO: on addDefine, tokenize define lie, replace value with current defines, on removeDefine recompute defines ?
var preProcessShader = (function() {
    var ignoredDefines = ['GL_FRAGMENT_PRECISION_HIGH', 'DEBUG'];

    // remove unProcessed Code.
    var preProcessor = function(tokens, opt) {
        if (!tokens || tokens.length === 0) return tokens;

        var options = opt || {
            pruneDefines: true,
            replaceDefine: true
        };
        var inputsDefines = options.inputsDefines || [];
        // TODO: add
        // GL_ES 1
        // __VERSION__ currentversion
        // __LINE__ current line
        // __FILE__current file number (0)
        //
        // TODO: lint  reserved prefixes
        // __
        // GL_
        //
        // TODO:  __PREPROCESSOR__:
        // allow special debug preprocessor operation
        //       - like string comparison (shader_name === )
        //
        // TODO: pragma
        //       - loop unroll
        //       - etc
        inputsDefines.push('__PREPROCESSOR_', 'GL_ES');

        // what we'll do
        var pruneDefines = options.pruneDefines;
        var replaceDefine = options.replaceDefine !== undefined ? options.replaceDefine : true;
        var prunesDefineStatement = pruneDefines;
        // state var
        var foundIfDef, index, results, result, ignoreAndKeep;

        var preProcessorCmd = false;
        // do we drop or include current code
        var droppingDefineStack = [false];
        // do we ignore as not preprocess that
        var ignoreDefineStack = [false];
        // did we already include code from this branching struct
        var didIncludeDefineStack = [false];
        // where are we in branching struct stack deepness
        var droppingDefineStackIndex = 0;

        var definesReplaceMap = { true: 1, false: 0 };
        var definesReplaceKeys;
        var definesReplaceMapDirty = false;

        var macrosReplaceMap = {};
        var macrosReplaceKeys;
        var macrosReplaceMapDirty = false;

        // get if one of the branch above is dropping code we're in
        var parentDroppingStack = [false];

        var currTokenIdx;
        var token;
        var tokenStr;

        //  defined (_FLOATTEX) && defined(_PCF)
        //  defined(_NONE) ||  defined(_PCF)
        //  _NONE === 'aha'
        var evalExpr = function(variables, variablesValues, line) {
            // resolve all "defined" first into 0,1
            while (1) {
                var noSolve = true;
                // if the ident is not defined, it's 0
                line = line.replace(definedReg, function(searchValue, isNegative, define) {
                    noSolve = false;
                    var res = false;
                    if (ignoredDefines[define] !== undefined) res = true;
                    if (definesReplaceMap[define] !== undefined) res = true;
                    res = isNegative ? !res : res;
                    return res ? '1' : '0';
                });
                if (noSolve) break;
            }

            // replace defines
            var mathTokens = tokenize(exprMathEval.tokenizeOptionsMath)(line);
            for (var i = 0; i < mathTokens.length; i++) {
                var tokenMath = mathTokens[i];
                if (tokenMath.id === tokenID.IDENT) {
                    i = defineReplace(mathTokens, i, tokenMath.data, true);
                }
            }
            var boolResult = exprMathEval.solveReversePolishNotation(mathTokens);

            return boolResult;
        };

        function spliceTokens(tokensOld, insertStart, removeLength, newTokens) {
            // replace macro calls tokens with macro results
            if (newTokens.length < 20000) {
                tokensOld.splice.apply(tokensOld, [insertStart, removeLength].concat(newTokens));
            } else {
                var tokensAfter = tokensOld.splice(insertStart);
                var m;
                for (m = 0; m < newTokens.length; m++) {
                    tokensOld.push(newTokens[m]);
                }

                for (m = 0; m < tokensAfter.length; m++) {
                    tokensOld.push(tokensAfter[m]);
                }
            }
        }

        function doMacroReplace(tokensOld, idx, replace) {
            // multiple tokens involved
            var argLen = replace.args.length;
            var mArgs = new Array(argLen);
            var mArgIdx = 0;
            mArgs[0] = '';
            var mIdx = idx + 1;
            var tLen = tokensOld.length;
            var mToken;
            while (mIdx < tLen && tokensOld[mIdx++].data[0] !== '(');

            var depthArgParens = 0;
            for (; mIdx < tLen; mIdx++) {
                mToken = tokensOld[mIdx];
                if (mToken.id === tokenID.WHITESPACE) continue;
                if (mToken.data[0] === ',' && depthArgParens === 0) {
                    mArgIdx++;
                    mArgs[mArgIdx] = '';
                    continue;
                }
                if (mToken.data[0] === '(') {
                    depthArgParens++;
                    mArgs[mArgIdx] += '(';
                    continue;
                }
                if (mToken.data[0] === ')') {
                    if (depthArgParens-- === 0) {
                        mArgIdx++;
                        break;
                    }
                    mArgs[mArgIdx] += ')';
                    continue;
                }
                mArgs[mArgIdx] += mToken.data;
            }
            // mIdx is a tokens macro end now,
            // args have values to replace macro args
            var macroProcessed = replace.value.slice(0);
            for (var m = 0; m < argLen; m++) {
                // only way to do do multiple replace is to do that with regexp...
                macroProcessed = macroProcessed.replace(new RegExp(replace.args[m], 'g'), mArgs[m]);
            }
            var macroTokens = tokenize({ stripTokens: tokensToStrip })(macroProcessed);
            spliceTokens(tokensOld, idx, mIdx - idx + 1, macroTokens);
            // may need to re-preprocess once replaced.
            return idx ? idx - 1 : 0;
        }

        function doDefineReplace(
            tokensOld,
            idx,
            replaced,
            toAdd,
            inExpressionForce,
            replacedStack
        ) {
            var replace = definesReplaceMap[toAdd];

            if (replace !== undefined && !replacedStack[toAdd]) {
                // tokenized define is cachable...
                if (inExpressionForce && replace.length === 0) {
                    // in expression an undefined is 0
                    tokensOld[idx].data = '1';
                    tokensOld[idx].id = tokenID.INTEGER;
                    // no more relpacable, no need to continue there
                    // no need to tokenize
                    return -2;
                }
                replaced.replacedString = replace;
                replacedStack[toAdd] = true;
                return 1;
            }

            var defIdx, lDefIdx, key;
            if (definesReplaceMapDirty) {
                definesReplaceKeys = Object.keys(definesReplaceMap);
                definesReplaceMapDirty = false;
            }

            for (defIdx = 0, lDefIdx = definesReplaceKeys.length; defIdx < lDefIdx; defIdx++) {
                key = definesReplaceKeys[defIdx];
                if (replacedStack[key]) continue;
                if (toAdd === key) {
                    replaced.replacedString = definesReplaceMap[key];
                    replacedStack[key] = true;
                    return 1;
                }
            }

            // no finds, no need to continue, no more replaceable
            return 0;
        }

        var idxReplacedStack = -1;
        var replacedStack = {};
        var replaceResult = { replacedString: undefined };
        // TRicky:
        // #define LUV
        // #ifdef LUV
        // LUVTORGB
        // #endif
        // ==> LUVTORGB
        function defineReplace(tokensOld, idxOld, toAdd, inExpressionForce) {
            var idx = idxOld;
            var defineTokens, replace, key, defIdx, lDefIdx;
            // OBJECT LIKE replace
            if (definesReplaceKeys || definesReplaceMapDirty) {
                var atLeastSingleReplace = false;
                replaceResult.replacedString = undefined;
                // handle the self referential macro gotcha
                // /!\ https://gcc.gnu.org/onlinedocs/cpp/Self-Referential-Macros.html#Self-Referential-Macros
                // same "line/token" idx means we did transform that line but came back (macro replace)
                if (idxReplacedStack !== idx) {
                    replacedStack = {};
                    idxReplacedStack = idx;
                }
                var res = doDefineReplace(
                    tokensOld,
                    idx,
                    replaceResult,
                    toAdd,
                    inExpressionForce,
                    replacedStack
                );
                var lastRes = res;
                while (res === 1) {
                    lastRes = res;
                    res = doDefineReplace(
                        tokensOld,
                        idx,
                        replaceResult,
                        replaceResult.replacedString,
                        inExpressionForce,
                        replacedStack
                    );
                }
                if (replaceResult.replacedString !== undefined) {
                    defineTokens = tokenize(tokenizeOptionsDefine)(replaceResult.replacedString);
                    spliceTokens(tokensOld, idx, 1, defineTokens);
                    idx = idx ? idx - 1 : 0;
                    atLeastSingleReplace = true;
                    return idx;
                } else if (lastRes === -2) {
                    // found an expression force
                    // token is integer we can bail out
                    return idx;
                }
                if (!atLeastSingleReplace && inExpressionForce) {
                    // in expression an undefined is 0
                    tokensOld[idx].data = '0';
                    tokensOld[idx].id = tokenID.INTEGER;
                    return idx;
                }
            }

            // MACRO FUNCTION REPLACE
            if (macrosReplaceKeys || macrosReplaceMapDirty) {
                replace = macrosReplaceMap[toAdd];
                if (replace === undefined) {
                    if (macrosReplaceMapDirty) {
                        macrosReplaceKeys = Object.keys(macrosReplaceMap);
                        macrosReplaceMapDirty = false;
                    }
                    for (
                        defIdx = 0, lDefIdx = macrosReplaceKeys.length;
                        defIdx < lDefIdx;
                        defIdx++
                    ) {
                        key = macrosReplaceKeys[defIdx];
                        if (toAdd.indexOf(key) !== -1) {
                            replace = macrosReplaceMap[key];
                        }
                    }
                }
                // found it
                if (replace !== undefined) {
                    // return same idx, but with all the new tokens.
                    // so it will come back here afterwards...
                    // self referential shit possible...
                    return doMacroReplace(tokensOld, idx, replace);
                }
            }

            return idx;
        }

        function doExtension() {
            // #extensionReg
            //https://www.opengl.org/wiki/Core_Language_(GLSL)#Extensions
            results = tokenStr.match(extensionReg);
            if (results !== null && results.length > 2) {
                var extension = results[1];
                var activation = results[2];

                if (inputsDefines.indexOf(extension) === -1) {
                    switch (activation) {
                        case 'enable':
                        case 'require':
                        case 'warn':
                            // TODO: handle enable using gpu caps
                            inputsDefines.push(extension);
                            // keep it in source otw breaks shader
                            // continue
                            return false;

                        //case 'disable':
                        default:
                            //   warn,  disable ...
                            return true;
                    }
                }
            }
            return false;
        }
        function doVersion() {
            return /#version/i.test(tokenStr);
        }
        function doPragma() {
            return /#pragma/i.test(tokenStr);
        }
        function addDefine() {
            results = tokenStr.match(defineReg);
            if (results) {
                var name = results[5];
                var value = results[6];
                if (name) {
                    //console.log('#define ' + name + ' = ' + value);
                    definesReplaceMap[name] = value;
                    definesReplaceMapDirty = true;
                    if (inputsDefines.indexOf(name) === -1) {
                        inputsDefines.push(name);
                    }
                    // TODO: pre-tokenize defines and macro
                } else {
                    // it's a macro
                    name = results[1];
                    var args = results[2].replace(/\s+/g, '').split(',');
                    value = results[3]; //.replace(/\s+/, '');
                    //console.log('#macro ' + name + ' (+' + args + '+) ' + value);
                    macrosReplaceMap[name] = { args: args, value: value };
                    macrosReplaceMapDirty = true;
                    // TODO: pre-tokenize defines and macro
                }

                // keep them in source always
                // macros/values etc
                if (prunesDefineStatement) {
                    tokens.splice(currTokenIdx, 1);
                }
                return true;
            }
            return false;
        }
        function removeDefine() {
            results = tokenStr.match(undefReg);
            if (results !== null && results.length > 1) {
                var defineToUndef = results[1];

                var indexOfDefine = inputsDefines.indexOf(defineToUndef);
                if (indexOfDefine !== -1) {
                    inputsDefines.splice(indexOfDefine, 1);
                }

                if (definesReplaceMap[defineToUndef] !== undefined) {
                    delete definesReplaceMap[defineToUndef];
                    definesReplaceMapDirty = true;
                }

                if (macrosReplaceMap[defineToUndef] !== undefined) {
                    delete macrosReplaceMap[defineToUndef];
                    macrosReplaceMapDirty = true;
                }

                if (prunesDefineStatement) tokens.splice(currTokenIdx, 1);
                return true;
            }
            return false;
        }
        function doIfdef() {
            //////////
            // #ifdef _EVSM
            results = tokenStr.match(ifdefReg);
            if (results !== null && results.length >= 2) {
                foundIfDef = results[1];

                var indexIgnore = ignoreAndKeep ? 0 : ignoredDefines.indexOf(foundIfDef);
                //we don't want to erase/preprocess that
                ignoreDefineStack.push(indexIgnore !== -1);

                index = inputsDefines.indexOf(foundIfDef);
                droppingDefineStackIndex++;
                if (index !== -1) {
                    droppingDefineStack.push(false);
                    didIncludeDefineStack.push(true);
                    parentDroppingStack.push(parentDroppingStack[droppingDefineStackIndex - 1]);
                } else {
                    droppingDefineStack.push(true);
                    didIncludeDefineStack.push(false);
                    parentDroppingStack.push(true);
                }

                if (prunesDefineStatement && !ignoreDefineStack[droppingDefineStackIndex]) {
                    tokens.splice(currTokenIdx, 1);
                }
                return true;
            }
            return false;
        }
        function doIfndef() {
            //////////
            // #ifndef _dfd
            results = tokenStr.match(ifndefReg);
            if (results !== null && results.length >= 2) {
                foundIfDef = results[1];
                index = inputsDefines.indexOf(foundIfDef);

                ignoreDefineStack.push(ignoreAndKeep);
                droppingDefineStackIndex++;

                if (index !== -1) {
                    droppingDefineStack.push(true);
                    didIncludeDefineStack.push(false);
                    parentDroppingStack.push(true);
                } else {
                    droppingDefineStack.push(false);
                    didIncludeDefineStack.push(true);
                    parentDroppingStack.push(parentDroppingStack[droppingDefineStackIndex - 1]);
                }
                if (prunesDefineStatement && !ignoreDefineStack[droppingDefineStackIndex]) {
                    tokens.splice(currTokenIdx, 1);
                }

                return true;
            }

            return false;
        }
        function doElse() {
            results = tokenStr.search(elseReg);
            if (results !== -1) {
                // was keeping, it's early out
                if (didIncludeDefineStack[droppingDefineStackIndex]) {
                    droppingDefineStack[droppingDefineStackIndex] = true;
                    parentDroppingStack[droppingDefineStackIndex] = true;

                    if (prunesDefineStatement && !ignoreDefineStack[droppingDefineStackIndex]) {
                        tokens.splice(currTokenIdx, 1);
                    }

                    return true;
                }

                // no previous include
                droppingDefineStack[droppingDefineStackIndex] = false;
                // didIncludeDefineStack[ droppingDefineStackIndex ] no need we're going out next
                parentDroppingStack[droppingDefineStackIndex] =
                    parentDroppingStack[droppingDefineStackIndex - 1];

                if (prunesDefineStatement && !ignoreDefineStack[droppingDefineStackIndex]) {
                    tokens.splice(currTokenIdx, 1);
                }

                return true;
            }

            return false;
        }
        function doIf() {
            results = tokenStr.search(ifReg);
            if (results !== -1) {
                result = evalExpr(inputsDefines, definesReplaceMap, tokenStr.substr(3));

                droppingDefineStackIndex++;
                ignoreDefineStack.push(ignoreAndKeep);
                droppingDefineStack.push(!result);
                didIncludeDefineStack.push(result);
                if (!result) {
                    parentDroppingStack.push(true);
                } else {
                    parentDroppingStack.push(parentDroppingStack[droppingDefineStackIndex - 1]);
                }
                if (prunesDefineStatement && !ignoreDefineStack[droppingDefineStackIndex]) {
                    tokens.splice(currTokenIdx, 1);
                }
                return true;
            }
            return false;
        }

        function doElif() {
            results = tokenStr.search(elifReg);
            if (results !== -1) {
                // was keeping before, it's a early out
                if (didIncludeDefineStack[droppingDefineStackIndex]) {
                    droppingDefineStack[droppingDefineStackIndex] = true;
                    parentDroppingStack[droppingDefineStackIndex] = true;

                    if (prunesDefineStatement && !ignoreDefineStack[droppingDefineStackIndex]) {
                        tokens.splice(currTokenIdx, 1);
                    }

                    return true;
                }

                result = evalExpr(inputsDefines, definesReplaceMap, tokenStr.substr(5));
                if (result) {
                    droppingDefineStack[droppingDefineStackIndex] = false;
                    didIncludeDefineStack[droppingDefineStackIndex] = true;
                    parentDroppingStack[droppingDefineStackIndex] =
                        parentDroppingStack[droppingDefineStackIndex - 1];
                }

                if (prunesDefineStatement && !ignoreAndKeep) {
                    tokens.splice(currTokenIdx, 1);
                }
                return true;
            }
            return false;
        }
        function doEndif() {
            //////////
            // check for endif
            results = tokenStr.search(endifReg);
            if (results !== -1) {
                ignoreDefineStack.pop();
                droppingDefineStack.pop();
                didIncludeDefineStack.pop();
                parentDroppingStack.pop();
                droppingDefineStackIndex--;

                if (prunesDefineStatement && !ignoreAndKeep) {
                    tokens.splice(currTokenIdx, 1);
                }
                return true; // remove endif
            }
            return false;
        }

        // Let'start, get A move on !
        for (currTokenIdx = 0; currTokenIdx < tokens.length; currTokenIdx++) {
            token = tokens[currTokenIdx];
            tokenStr = token.data;
            ignoreAndKeep = ignoreDefineStack[droppingDefineStackIndex];

            preProcessorCmd = tokenStr[0] === '#';
            if (preProcessorCmd) {
                if (ignoreAndKeep || !parentDroppingStack[droppingDefineStackIndex]) {
                    // code we keep
                    if (addDefine()) continue;
                    if (removeDefine()) continue;

                    // could disable once not in code allowing extensions
                    if (doExtension()) continue;
                    if (doVersion()) continue;
                    if (doPragma()) continue;
                }
                // ifdef branching stack handling
                // important: can only be done by "parsing completely"
                // to get the correct else/elif/endif deepness...
                if (doIf()) continue;
                if (doElse()) continue;
                if (doElif()) continue;
                if (doIfdef()) continue;
                if (doEndif()) continue;
                if (doIfndef()) continue;
            } // preprocessorCommand

            //debugger // eslint-disable-line

            // replace in identifier that we do keep
            if (
                ignoreAndKeep ||
                (!droppingDefineStack[droppingDefineStackIndex] &&
                    !parentDroppingStack[droppingDefineStackIndex])
            ) {
                if (token.id === tokenID.IDENT) {
                    if (
                        replaceDefine &&
                        (definesReplaceKeys ||
                            definesReplaceMapDirty ||
                            macrosReplaceKeys ||
                            macrosReplaceMapDirty)
                    ) {
                        // token or ident only ?
                        currTokenIdx = defineReplace(tokens, currTokenIdx, token.data);
                    }
                }
            } else if (pruneDefines) {
                tokens.splice(currTokenIdx, 1);
                currTokenIdx--;
            }
        }

        return tokens;
    };

    return preProcessor;
})();

module.exports = preProcessShader;
