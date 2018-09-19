//var functions = require('../tokens/glsl-token-functions');
var shake = require('./glsl-token-function-shaker');
var tokenize = require('./tokenizer');
var preprocessor = require('./preprocessor');
var tokenID = require('./tokenId');

var tokenUtils = require('./tokenUtils');
var tokenExport = require('./tokenExport');
var tokenExtend = require('./tokenExtend');

var glslesPreprocessor = function(sourceCode, optionsParam) {
    var options = optionsParam || {
        debugExperimental: false,
        defines: [],
        doStats: false,
        extensions: [],
        //inline: true,
        pruneComments: true,
        //lint: true,
        logCounts: false,
        minify: true,
        preprocess: true,
        profileTimeEach: false,
        profileTimeGlobal: false,
        pruneUnused: true,
        pruneDefines: true,
        replaceDefine: true,
        optimize: true,
        output: 1, // 0, nothing,    // 1, format    // 2, minify whitespace
        //stylish: true,
        tabs: 4,
        //unroll: true,
        whitespace: true
    };
    // consistency amongst params
    if (!options.doStats && options.minify) options.doStats = true;

    //
    var doTime = options.profileTimeEach;
    var doLog = options.logCounts;
    var id = 'GLSL preprocessor';
    if (options.profileTimeGlobal) console.time(id);

    if (options.pruneComments) {
        var tokensToStrip = {};
        tokensToStrip[tokenID.BLOCK_COMMENT] = true;
        tokensToStrip[tokenID.LINE_COMMENT] = true;
        options.tokensToStrip = tokensToStrip;
    }
    var tokenizer = tokenize(options);
    id = 'GLSL tokenize';
    if (doTime) console.time(id);
    var tokens = tokenizer(sourceCode);
    if (doTime) console.timeEnd(id);

    if (doLog) {
        var tokenIDMap = JSON.stringify(tokenID)
            .replace(/"|{|}|:[0-9]+/g, '')
            .toLowerCase()
            .split(',');
        tokenUtils.logStats(options.stats, tokenIDMap);
    }

    id = 'strip';
    if (doTime) console.time(id);
    tokenUtils.stripTokens(tokens, options.tokensToStrip);
    if (doTime) console.timeEnd(id);
    if (doLog) tokenUtils.tokensRecountStats(tokens, tokenIDMap, options);

    id = 'preprocess';
    if (doTime) console.time(id);
    preprocessor(tokens, {
        defines: options.defines,
        pruneDefines: options.pruneDefines,
        replaceDefine: options.replaceDefines
    });
    if (doTime) console.timeEnd(id);
    if (doLog) tokenUtils.tokensRecountStats(tokens, tokenIDMap, options);
    /*
    if (options.debugExperimental) {
        // process
        id = 'process depth scope';
        if (doTime) console.time(id);
        tokenExtend.getTokenDepth(tokens);
        tokenExtend.getTokenScope(tokens);
        if (doTime) console.timeEnd(id);

        id = 'process var funcs';
        if (doTime) console.time(id);
        var functions = require('glsl-token-functions')(tokens);
        var assigns = require('glsl-token-assignments')(tokens);
        //var variables = getVariables(tokens, options);
        if (doTime) console.timeEnd(id);
        if (doLog) console.log(functions);
        //if (doLog)console.log(variables);
        if (doLog) console.log(assigns);
    }
  */
    // optimize
    if (options.pruneUnused) {
        id = 'pruneUnused';
        if (doTime) console.time(id);
        // https://www.npmjs.com/package/glsl-token-function-shaker#shaketokens-options
        shake(tokens, {});
        if (doTime) console.timeEnd(id);
        if (doLog) tokenUtils.tokensRecountStats(tokens, tokenIDMap, options);
    }

    if (options.minify) {
        id = 'minify';
        if (doTime) console.time(id);
        tokenExport.minify(tokens, options, tokenIDMap);
        if (doTime) console.timeEnd(id);
        if (doLog) tokenUtils.tokensRecountStats(tokens, tokenIDMap, options);
    }

    id = 'toString';
    if (doTime) console.time(id);
    var output = tokenExport.tokensToString(tokens, options.output, options);
    if (doTime) console.timeEnd(id);

    if (options.profileTimeGlobal) console.timeEnd('GLSL preprocessor');
    return output;
};

module.exports = glslesPreprocessor;
