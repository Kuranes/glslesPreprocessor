var test = require('tape');
var fs = require('fs');

var preprocess = require('../src/glslesPreprocessor');

test('unit:regression preprocess', function (assert) {

    // test 1
    var shaderSrc = fs.readFileSync('./test/test_traps.glsl', 'utf8');
    var shaderRes = preprocess(shaderSrc);

    //console.log(shaderRes);
    var shaderGood = fs.readFileSync('./test/test_output.glsl', 'utf8');
    //fs.writeFileSync('./test/test_output.glsl', shaderRes);
    //console.log(err ? err.stack : err, info)

    // we really only care that we've
    // registered the struct for the future.
    //assert.deepEqual(Object.keys(structs), [expect])
    assert.equal(shaderRes, shaderGood);
    assert.end();
});

/*
test('unit: unexpected eof', function (assert) {
    var input = [
        '#ifndef UNDEFINED',
        'int x, y;',
        'int arf, woof;',
        '#else',
        'int a, b;'
    ].join('\n');

    assert.throws(function () {
        preprocess(input);
    });

    input = [
        '#ifdef UNDEFINED',
        'int x, y;',
        'int arf, woof;',
        '#else',
        'int a, b;'
    ].join('\n');

    // TODO: fix this case

    assert.throws(function () {
        preprocess(input);
    });


    assert.end();
});
*/
test('unit: nested ifs', function (assert) {
    var input = [
        '#define DEFINED',
        '#ifdef UNDEFINED',
        '#ifdef DEFINED',
        'int x, y;',
        '#endif',
        'int arf, woof;',
        '#else',
        'int a, b;',
        '#endif'
    ].join('\n');

    console.log(preprocess(input));
    console.log('\n#define DEFINED\nint a, b;\n');

    assert.equal(preprocess(input), '#define DEFINED\nint a, b;\n');

    assert.end();
});

test('unit: ifdef / ifndef / undef', function (assert) {
    var input = [
        '#ifdef UNDEFINED',
        'int x, y;',
        '#else',
        'int a, b;',
        '#endif'
    ].join('\n');

    assert.equal(preprocess(input), '\nint a, b;\n');

    input = [
        '#ifndef UNDEFINED',
        'int x, y;',
        '#else',
        'int a, b;',
        '#endif'
    ].join('\n');

    assert.equal(preprocess(input), '\nint x, y;\n');

    input = [
        '#define ANYTHING',
        '#ifdef ANYTHING',
        'int x, y;',
        '#else',
        'int a, b;',
        '#endif'
    ].join('\n');

    assert.equal(preprocess(input), '#define ANYTHING\nint x, y;\n');

    input = [
        '#define ANYTHING',
        '#ifndef ANYTHING',
        'int x, y;',
        '#else',
        'int a, b;',
        '#endif'
    ].join('\n');

    assert.equal(preprocess(input), '#define ANYTHING\nint a, b;\n');

    input = [
        '#define ANYTHING',
        '#undef ANYTHING',
        '#ifndef ANYTHING',
        'int x, y;',
        '#else',
        'int a, b;',
        '#endif'
    ].join('\n');

    assert.equal(preprocess(input), '#define ANYTHING\n#undef ANYTHING\nint x, y;\n');

    input = [
        '#define ANYTHING',
        '#undef ANYTHING',
        '#ifdef ANYTHING',
        'int x, y;',
        '#else',
        'int a, b;',
        '#endif'
    ].join('\n');

    assert.equal(preprocess(input), '#define ANYTHING\n#undef ANYTHING\nint a, b;\n');

    assert.end();
});


