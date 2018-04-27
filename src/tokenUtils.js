
var literals100 = require('./syntax/literals');
var builtins100 = require('./syntax/builtins');
var literals300es = require('./syntax/literals-300es');
var builtins300es = require('./syntax/builtins-300es');


function arrayToDict(a, o) {
    for (var i = 0; i < a.length; i++)
        o[a[i]] = true;
    return o;
};

var keywords = arrayToDict(builtins100, {});
arrayToDict(literals100, keywords);
arrayToDict(builtins300es, keywords);
arrayToDict(literals300es, keywords);


var stripTokens = function (tokens, toStripTokens /*, options*/) {
    for (var i = 0; i < tokens.length; i++) {
        if (toStripTokens[tokens[i].id]) {
            // tokens to remove
            tokens.splice(i, 1);
            i--;
        }
    }
};

var logStats = function (stats, tokenIDMap) {
    var str = '';
    for (var key in stats) {
        str += tokenIDMap[key] + ': ' + stats[key] + ', ';
    }
    console.log(str);

};
var tokensRecountStats = function (tokens, tokenIDMap, opt) {
    var stats = {};
    for (var i = 0, l = tokens.length; i < l; i++) {
        var mode = tokens[i].id;
        if (!stats[mode]) { stats[mode] = 1; } else { stats[mode]++; }
    }
    opt.stats = stats;
    logStats(stats, tokenIDMap);
};
module.exports = {
    allKeywords: keywords,
    logStats: logStats,
    stripTokens: stripTokens,
    tokensRecountStats: tokensRecountStats
};
