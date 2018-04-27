# glslesPreprocessor

Preprocess webgl shader code before browser/drivergpu compilation:
 - lint
 - minimize
 - obfuscate 
 - optimize
 - format

- Tokens subAST API: 
    - token: type, depth, scope 
    - identifiers instances/declaration
    - variables usage range (reuse/prune)
- error and warnings
    - invalid
    - vague "perfromance token to cycles"
    - uniform flow warning
    - unused uniform/varying/variable/function
- prune
    - comment
    - unused
    - preprocessor branched out code
    - whitespace
- format
    - guarantee consistent style
- perf oriented
    - performance/allocation oriented 
    - tokenisation and strip at same passe
    - tokens Actions in least pass possible 
    - export to string and minify/stylify in one pass

TODO:
    - worker sample
    - faster
    - token based editor (Edit sub token array update from diff. (shader edit a 'view' of token tree))
    - try to work on array/typedarray uint8 instead of js strings (immutable js string makes for a lot of allocations...)

Fork/Code/Inspiration From:
- https://github.com/glslify/glsl-tokenizer
- https://www.npmjs.com/browse/depended/glsl-tokenizer

# License

MIT, see [LICENSE.md](LICENSE.md) for further information.