var glslesPreprocessor = require('../src/glslesPreprocessor');

require('codemirror/mode/clike/clike');
require('codemirror/addon/edit/closebrackets');
require('codemirror/addon/merge/merge');
var codeMirror = require('codemirror');

var orig1, orig2, dv;

var myHeaders = new Headers();
var myInit = {
    method: 'GET',
    headers: myHeaders,
    mode: 'cors',
    cache: 'default'
};

window.addEventListener('load', function() {
    var shader;

    shader = '../test/test.glsl';
    //shader = '../test/test_traps.glsl';

    fetch(shader, myInit).then(function(response) {
        response.text().then(function(text) {
            orig1 = text;
            console.profile('tokenize');
            //for (var i = 0; i < 5; i++) {
            orig2 = preprocess(text);
            //}
            console.profileEnd('tokenize');
            initUI();

            var d = document.createElement('div');
            d.style.cssText = 'width: 50px; margin: 7px; height: 14px';
            dv.editor().addLineWidget(57, d);
        });
    });
});

function initUI() {
    var target = document.getElementById('view');
    target.innerHTML = '';
    dv = codeMirror.MergeView(target, {
        value: orig1,
        origLeft: null,
        orig: orig2,
        lineNumbers: true,
        matchBrackets: true,
        mode: 'x-shader/x-fragment',
        highlightDifferences: true,
        connect: null,
        collapseIdentical: true
    });

    dv.editor().on('changes', function() {
        dv.rightOriginal().setValue(preprocess(dv.editor().getValue()));
    });
}

function preprocess(shaderTextIn) {
    console.profile('tokenize');

    var shaderTextOut = glslesPreprocessor(shaderTextIn, {
        defines: [],
        extensions: [],
        stylish: true,
        whitespace: true,
        tabs: 4,
        pruneComments: true,
        minify: false,
        preprocess: true,
        pruneUnused: true,
        pruneDefines: true,
        output: 1,
        profileTimeEach: true,
        profileTimeGlobal: true,
        logCounts: false,
        debugExperimental: false,
        doStats: false
    });
    console.profileEnd('tokenize');

    console.log(
        'input len: ' +
            shaderTextIn.length +
            ' outptut len: ' +
            shaderTextOut.length +
            ' saved len: ' +
            (shaderTextIn.length - shaderTextOut.length)
    );
    return shaderTextOut;
}
