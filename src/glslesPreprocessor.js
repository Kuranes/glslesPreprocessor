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
    defines: [],
    extensions: [],
    stylish: true,
    whitespace: true,
    tabs: 4,
    pruneComments: true,
    lint: true,
    minify: true,
    preprocess: true,
    pruneUnused: true,
    inline: true,
    unroll: true,
    optimize: true,
    output: 2 // 0, nothing,    // 1, format    // 2, minify whitespace
  };

  if (options.pruneComments) {
    var tokensToStrip = {};
    tokensToStrip[tokenID.BLOCK_COMMENT] = true;
    tokensToStrip[tokenID.LINE_COMMENT] = true;
    options.tokensToStrip = tokensToStrip;
  }
  var tokenizer = tokenize(options);
  var id = 'GLSL tokenize';
  console.time(id);
  var tokens = tokenizer(sourceCode);
  console.timeEnd(id);

  var tokenIDMap = JSON.stringify(tokenID)
    .replace(/"|{|}|:[0-9]+/g, '')
    .toLowerCase()
    .split(',');
  tokenUtils.logStats(options.stats, tokenIDMap);

  id = 'strip';
  console.time(id);
  tokenUtils.stripTokens(tokens, options.tokensToStrip);
  console.timeEnd(id);
  tokenUtils.tokensRecountStats(tokens, tokenIDMap, options);

  id = 'preprocess';
  console.time(id);
  //console.profile(id);
  preprocessor(tokens, {
    defines: [''],
    pruneDefines: true,
    replaceDefine: true
  });
  //console.profileEnd(id);
  console.timeEnd(id);
  tokenUtils.tokensRecountStats(tokens, tokenIDMap, options);

  // process
  id = 'process depth scope';
  console.time(id);
  tokenExtend.getTokenDepth(tokens);
  tokenExtend.getTokenScope(tokens);
  console.timeEnd(id);

  id = 'process var funcs';
  console.time(id);
  var functions = require('glsl-token-functions')(tokens);
  var assigns = require('glsl-token-assignments')(tokens);
  //var variables = getVariables(tokens, options);
  console.timeEnd(id);
  console.log(functions);
  //console.log(variables);
  console.log(assigns);

  // optimize
  if (options.pruneUnused) {
    id = 'pruneUnused';
    console.time(id);
    // https://www.npmjs.com/package/glsl-token-function-shaker#shaketokens-options
    shake(tokens, {});
    console.timeEnd(id);
    tokenUtils.tokensRecountStats(tokens, tokenIDMap, options);
  }
  /*
        id = 'minify';
        console.time(id);
        tokenExport.minify(tokens, options, tokenIDMap);
        console.timeEnd(id);

        tokenUtils.tokensRecountStats(tokens, tokenIDMap, options);
    */

  id = 'toString';
  console.time(id);
  var output = tokenExport.tokensToString(tokens, options.output, options);
  console.timeEnd(id);

  return output;
};

module.exports = glslesPreprocessor;
