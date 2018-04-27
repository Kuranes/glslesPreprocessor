var tokenize = require('./tokenizer');
var tokenID = require('./tokenId');

// return sorted in Reverse Polish Notation order (without parens)
// directly computable
// TODO: ternary operator
function tokensToRPNExpr(tokens) {
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence
    var precedence = {
        '?': 3,
        ':': 3,
        '||': 5,
        '&&': 6,
        '|': 6,
        '&': 7,
        '^': 8,
        '==': 10,
        '<=': 11,
        '>=': 1,
        '<': 11,
        '>': 11,
        '>>': 12,
        '<<': 12,
        '+': 13,
        '-': 13,
        '*': 14,
        '/': 14,
        '%': 14,
        '~': 14,
        '!': 14,
        '¯': 999 // unary minus
    };

    var associativityRightToLeft = {
        '!': true,
        '~': true,
        '?': true,
        '¯': true// unary minus
    };
    var outputQueue = [];
    var stack = [];
    var o1, o2;
    var token;

    // compute rpn for computation
    // Shunting-yard algorithm with
    var isLiteral = {};
    isLiteral[tokenID.INTEGER] = true;
    isLiteral[tokenID.FLOAT] = true;
    isLiteral[tokenID.HEX] = true;
    for (var i = 0; i < tokens.length; i++) {

        token = tokens[i];
        if (isLiteral[token.id]) {

            // enqueue literal
            outputQueue.push(token);

        } else if (token.id === tokenID.OPERATOR) { // if token is ean operator

            if (token.data[0] === '(') { // if token is left parenthesis

                stack.push(token); // then push it onto the stack

            } else if (token.data[0] === ')') { // if token is right parenthesis

                while (stack.length && stack[stack.length - 1].data[0] !== '(') { // until token at top is (
                    outputQueue.push(stack.pop());
                }
                stack.pop(); // pop (, but not onto the output queue

            } else if (token.id === tokenID.OPERATOR) {

                // detect unary minus
                if (token.data === '-') {
                    if (i === 0) {
                        token.data = '¯';
                    } else {
                        var lastToken = tokens[i - 1].data;
                        if (lastToken.id === tokenID.OPERATOR && lastToken.data[0] !== ')') {
                            //is always unary if it immediately follows another operator or a left parenthesis
                            token.data = '¯';
                        }
                        //else if (lastToken.data === ')') {
                        // always binary if it immediately follows an operand or a right parenthesis
                        //}

                    }
                    // A unary minus sign does not cause any operators to be popped from the stack.
                }

                // operator: handle precedence
                o1 = token;
                var o1Precedence = precedence[o1.data];
                var o1assocRigthToLeft = associativityRightToLeft[o1.data];
                while (stack.length) {
                    o2 = stack[stack.length - 1];
                    if (o2.id === tokenID.OPERATOR &&
                        (
                            (!o1assocRigthToLeft && o1Precedence <= precedence[o2.data])
                            ||
                            (o1assocRigthToLeft && o1Precedence < precedence[o2.data])
                        )
                    ) {
                        outputQueue.push(o2); // add o2 to output queue
                        stack.pop(); // pop o2 of the stack
                        o2 = stack[stack.length - 1]; // next round
                    } else {
                        break;
                    }
                }

                stack.push(o1); // push o1 onto the stack
            }
        }
        lastToken = token;
    }
    while (stack.length > 0) {
        outputQueue.push(stack.pop());
    }
    // sorted in RPN order without parens
    return outputQueue;
}

function getTokenLiteralValue(token) {

    switch (token.id) {
        case tokenID.INTEGER: return parseInt(token.data, 10);
        case tokenID.FLOAT: return parseFloat(token.data);
        case tokenID.HEX: return parseInt(token.data, 16);
    }

}
function evalMathExpr(args, operator) {
    switch (operator) {
        case '¯': return -args[0];
        case '~': return ~args[0];
        case '!': return !args[0];
        case '+': return args[0] + args[1];
        case '-': return args[0] - args[1];
        case '^': return args[0] ^ args[1];
        case '*': return args[0] * args[1];
        case '/': return args[0] / args[1];
        case '%': return args[0] % args[1];
        case '>>': return args[0] >> args[1];
        case '<<': return args[0] << args[1];
        case '<': return args[0] < args[1];
        case '>': return args[0] > args[1];
        case '<=': return args[0] <= args[1];
        case '>=': return args[0] >= args[1];
        case '==': return args[0] === args[1];
        case '!=': return args[0] !== args[1];
        case '|': return args[0] | args[1];
        case '||': return args[0] || args[1];
        case '&': return args[0] & args[1];
        case '&&': return args[0] && args[1];
    }
    return 0;
}

var unaryOperator = {
    '!': true,
    '~': true,
    '¯': true// unary minus
};

function solveReversePolishNotation(infixTokens) {
    var resultStack = [];
    var args = [];
    var postFixTokens = tokensToRPNExpr(infixTokens);
    for (var i = 0, l = postFixTokens.length; i < l; i++) {
        var token = postFixTokens[i];
        var isOperator = token.id === tokenID.OPERATOR;
        if (isOperator) {
            var operandsNum = unaryOperator[token.data[0]] ? 1 : 2;
            for (var k = resultStack.length, p = k - operandsNum; p < k; p++) {
                args.push(resultStack[p]);
            }
            var newLen = resultStack.length - operandsNum;
            if (newLen < 0) return 0;// wrong input
            resultStack.length = newLen;
            resultStack.push(evalMathExpr(args, token.data));
            args.length = 0;
        } else {
            resultStack.push(getTokenLiteralValue(token));
        }
    }
    return resultStack.pop();
};

var tokensToStrip = {};
tokensToStrip[tokenID.BLOCK_COMMENT] = true;
tokensToStrip[tokenID.LINE_COMMENT] = true;
tokensToStrip[tokenID.EOF] = true;
tokensToStrip[tokenID.WHITESPACE] = true;
var tokenizeOptionsMath = { tokensToStrip: tokensToStrip };
//tokenize(tokenizeOptionsDefined)(line)

function evalMathExpression(line) {
    return solveReversePolishNotation(tokenize(tokenizeOptionsMath)(line));
}

module.exports = {
    evalMathExpression: evalMathExpression,
    solveReversePolishNotation: solveReversePolishNotation,
    evalMathExpr: evalMathExpr,
    getTokenLiteralValue: getTokenLiteralValue,
    tokenizeOptionsMath: tokenizeOptionsMath
};
