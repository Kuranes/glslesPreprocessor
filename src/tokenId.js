var tokenID = {
    'BLOCK_COMMENT': 0,
    'LINE_COMMENT': 1,
    'PREPROCESSOR': 2,
    'OPERATOR': 3,
    'INTEGER': 4,
    'FLOAT': 5,
    'IDENT': 6,
    'BUILTIN': 7,
    'KEYWORD': 8,
    'WHITESPACE': 9,
    'EOF': 10,
    'HEX': 11,
    // only during tokenisation
    'NORMAL': 13,
    'TOKEN': 12, // <-- never emitted
};

//var tokenIDMap = JSON.stringify(tokenID).replace(/"|{|}|:[0-9]+/g,'').split(',');
module.exports = tokenID;
