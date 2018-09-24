# 4.0

## Babel 7

LightScript has been rewritten as a Babel 7 plugin.

### Changes:

- A full Babel 7 build chain is required. Using LightScript 4 with any previous version of Babel will result in an incompatibility error.
- `@oigroup/babylon-lightscript` is now `@lightscript/parser`
- `@oigroup/babel-plugin-lightscript` is now `@lightscript/transform`. It is no longer recommended to use this plugin directly; instead use `@lightscript/babel-preset`
- `@oigroup/babel-preset-lightscript` is now `@lightscript/babel-preset`.
- `@babel/preset-env` is now a `peerDependency` of the preset and the plugin and must be installed alongside either.

## BREAKING CHANGE: Fat arrows in object bodies no longer autobind

Previously, when using a fat arrow with a method in an object body, the method would auto-bind to the object:

```js
// In LightScript 3.x,
a = {
  b() => this
}
// compiles to
const a = {
  b() { return c; }
};
a.b = a.b.bind(a);
```

In LightScript 4, a fat arrow gives lexical `this` instead:

```js
// In LightScript 4,
a = {
  b() => this
}
// compiles to
const a = {
  b: () => this
};
```

**Note that this change does NOT apply to class bodies**, where fat arrow methods will still auto-bind in the constructor.

### Rationale:

In real-world code, inline object expressions are often used to create nonce objects or to simulate named parameters:

```js
sub = observable.subscribe({
  next(x) => this.gotNewValue(x)
})
```

In cases like this, lexical `this` is what the programmer wants and auto-binding is a footgun that causes subtle and difficult-to-diagnose errors.

## `try` changes

The `try` syntax has been stabilized for 4.0:

### Changes:

- `enhancedTry` compiler flag removed.
- `try` can be used as an expression, as documented in 3.1 changelog.
- `try` can be used without `catch`, in which case errors are coalesced:
```js
x = try: f()
// compiles to
const x = () => {
  try {
    return f();
  } catch (_err) {
    return _err;
  }
})();
```
- The colon-less coalescing `try` syntax added in 3.1 has been removed.

### Rationale:

Making `try` usable as an expression without breaking changes to its syntax is consistent with LightScript's handling of other constructs, e.g. `if` expressions. The increased parsing tolerance for `try` added in 3.1, as well as its ability to be used as an expression, are non-breaking changes consistent with this rule.

The colon-less `try` syntax created confusion between `try` and `try:` and was not adding anything beyond what using `try:` as an expression already brought, so it has been removed.

## Safe-await arrow `<!-` now compiles like `try:`

The safe-await arrow syntax (`<!-`) is no longer deprecated and will compile into code equivalent to an error-coalescing `try:` block.

```js
f() -/>
  a <!- fetch()
// Is equivalent to
f() -/>
  a = try: <- fetch()
```

## `safeCall` compiler flag removed

As safe calls are part of the ES2018+ optional-chaining proposal, they are now permanently enabled in LightScript. In the (unlikely) event of further changes to the proposal, this will be revisited.

## BREAKING CHANGE: Existential expressions removed

### Changes:

- `existential` compiler flag removed.
- Existential expressions `a?` will no longer compile.
- Recommended replacement for the time being is `~looseNotEq(null)`:
```js
a?
// should be replaced with
a~looseNotEq(null)
```

### Rationale:

Due to the massive overload of the `?` token in JavaScript, including several upcoming TC39 proposals, it's very difficult to overload the token further without breaking parsing.

## Subscript indentation no longer enforced.

Subscript indentation is now unenforced by default. `noEnforcedSubscriptIndentation` compiler flag removed. Of course, you are free to continue to use indented (or non-indented) style for subscripts as you choose.

### Rationale:

This was a case of the compiler forcing style on programmers when it was not necessary to do so.

## LightScript now generates ES2018+ code

Where appropriate, the LightScript compiler will now generate ES2018+ code, including the use of some experimental proposals. As this code does not run in most environments, the LightScript preset has been updated with additional plugins to transpile this code to your target environment.

### Changes:

- Optional traversals (`a?.b`, `a?.(b)`, `a?(b)`) now generate ES2018+ optional chains.
- `@babel/plugin-proposal-optional-chaining` has been added to the preset.
- `throw` now parses as a `ThrowExpression` where appropriate.
- `@babel/plugin-proposal-throw-expressions` has been added to the preset.
- The preset uses the new `@babel/plugin-proposal-decorators` plugin. Options may be passed to this plugin via the `decoratorOpts` config key. By default, the decorators are set to legacy mode (`decoratorOpts: { legacy: true }`) for compatibility with LightScript 3.x. Available options are documented at https://babeljs.io/docs/en/babel-plugin-proposal-decorators

## BREAKING CHANGE: `@lightscript/babel-preset` no longer transforms JSX.

JSX will no longer be transformed by the LightScript preset. Please add
`@babel/preset-react` after the LightScript preset in your build chain in order
to transform JSX. (JSX is, of course, still fully supported in the language, but it must now be transformed by a separate plugin or preset.)

### Rationale:

We are trying to streamline the preset as much as possible in order to give you
maximum control over your build chain. JSX has a number of user configurable
options (pragmas, etc.) which are now left up to you rather than being fixed
by the preset.

## `if` whiteblock versus type annotation ambiguity squashed

The only documented ambiguity in the grammar has been eliminated for 4.0. The code
```js
if fn(): x => 4
```
now correctly compiles as an `if` whose consequent is an arrow function expression `x => 4`.
In general, all ambiguities of this class should now be resolved in the most intuitive way.

(The technical rule is that type-annotated functions are not allowed at the top level of
`if` conditions and other paren-free contexts, but we hope you won't have to remember all that.)

## Miscellaneous changes

- More tolerant parsing for tilde-call callees. Calling IIFEs like `a~(b->c)()` now works.
- BREAKING CHANGE: Implicit returns are not added to `finally` blocks in `try` constructs.
- Fixed all outstanding parser and compiler bugs.

# 3.1

## Enhanced error handling

> Enhanced `try` is a new feature and as such is behind a compiler flag. Pass `{ enhancedTry: true}` as a configuration option to enable these changes. Enhanced try will be live by default in the next major semver increment, 4.0.

### Changes:

#### 1. Parsing of `try` is more tolerant and more closely matches parsing of `if`.

`try`, `catch`, and `finally` can be put on the same line. Oneline whiteblocks
are acceptable.

```js
try: f() catch err: "panic!" finally: calmDown()
```

#### 2. `try` can be used as an expression

`try` can now be used wherever an expression is valid. In its expression form, `try` evaluates to the last-reached value in the whole `try` construct.

If the `try` block succeeds, the expression will evaluate to the last-reached value of the `try` block. If an error is thrown, the expression will evaluate to the last-reached value of the `catch` block.

```js
x = try:
  successfulFunction()
  3
catch err:
  err
// x  === 3

y = try:
  throw new Error()
catch err:
  5
// y === 5
```

`finally` is illegal when `try` is used as an expression.

#### 3. Error coalescence with `try`

Using `try` in front of an expression (no colon) evaluates that expression with error coalescence: the inner expression is evaluated and its value is returned unless an error is thrown, in which case the outer expression evaluates to the thrown error.

```js
x = try f()

if x~isError!:
  print! "operation failed"
else:
  print! "value was", x
```

This can be combined with `match` for idiomatic error handling:
```js
x = match try f():
  | RetriableError: retry(15)
  | Error as err: throw err
  | else as result: result
```

When using `try` to coalesce errors, you cannot use `catch` -- you must handle any potential error values in band with the expression.

#### 4. "Safe await" is deprecated in favor of `try` coalescence.

Prior to 3.1, the safe await arrow `<!-` could be used to coalesce errors resulting from an async function:

```js
result <!- asyncOperation()
if result~isError!:
  handleError(result)
else:
  return result
```

Now this can be achieved using `try` coalescence:

```js
result = try <- asyncOperation()
if result~isError!:
  handleError(result)
else:
  return result
```

The `<!-` operator will be considered deprecated as of the next major semver (4.x) and will be removed altogether in the following major semver (5.x)

### Rationale:

Languages like Rust and Go encourage good programming practice through strong error checking that forces error cases to be handled explicitly. The objective here is to create a similar error-handling idiom in JS-land.

Converting errors into values and putting them in-band with the expressions being evaluated (hopefully aided by a static type checker) encourages handling each possible error condition explicitly and in-band.

## `as` binding in `match` test can rebind the discriminant

### Change:

Prior to 3.1, the following would throw an error, expecting `y` to be a pattern:
```js
match x:
  | Test as y: y
```
It is now legal to use an identifier, in which case the identifier will be assigned the value of the discriminant.

NOTE: This only applies to non-assertive matching with `as`. Since it wouldn't make sense in an assertive pattern match, it can't be used with `with`.

### Rationale:

This is a non-breaking syntax change that enables some nice syntax like the "`try`-and-match" above.

## `for`/`in` loops have implicit `const`

### Change:

```js
for k in obj: k
```
```js
// Before 3.1
unknown: for-in requires a variable qualifier: `now` to reassign an existing variable, or `const`, `let`, `var` to declare a new one. Use `idx` or `elem` to iterate an array. Use `key` or `val` to iterate an object. (1:4)
> 1 | for k in obj: k
    |     ^
  2 |

// After 3.1
for const k in obj {
  k
}
```

### Rationale:

This change was made to `for`/`of` loops in 3.0, leaving `for`/`in` loops as an odd-man-out for no apparent reason. Implicit const should work the same way for all `for` loops now.

## Miscellaneous

- `eslint@4.8.0` is now a `peerDependency` of `lightscript-eslint`. This works around newer versions of ESLint requiring a babel 7 toolchain. (https://github.com/wcjohnson/lightscript/issues/67)
- Bug fixes (https://github.com/wcjohnson/lightscript/issues/70, https://github.com/wcjohnson/lightscript/issues/74)

# 3.0

>This is a major release with breaking changes. This release is no longer strictly backward compatible with `lightscript@0.5.9`. Where compatibility has been broken, we believe we are correctly anticipating the future development of JavaScript and LightScript.

## Missing branches of conditional constructs produce `undefined`

### Change:

Prior to 3.0, if a conditional construct (`if` expression, `match` expression, or safe member expression) reached a branch that was not provided, the default value returned by the construct would be `null`:

```js
x = if false: 1
// now, x === null
```

This has been changed so that missing branches now produce `undefined`:

```js
x = if false: 1
// now, x === undefined
```

This is a **breaking change** to the semantics of the language! If you are directly comparing conditional results to `null`, rather than checking for falsiness, you will need to update those cases.

### Rationale:

`undefined` is the default return value when something is not provided vanilla JavaScript, so for reasons of consistency, LightScript will do the same. (See https://github.com/lightscript/lightscript/issues/45 for more detailed examples of how `null` can cause issues.)

## Sequence expressions require `( )` delimeters

### Change:

In ordinary JavaScript (and LightScript 0.5) a comma-separated list of expressions is treated as a sequence expression. Parentheses are optional:

```js
// Legal JS and LSC 0.5
a, b
```

As of `@oigroup/lightscript` 3.0, a sequence expression must now be wrapped in parentheses:

```js
// Not legal anymore
a, b
// Legal!
(a, b)
```

This is a **breaking change** to syntax.

### Rationale:

Implicit parentheses around sequence expressions introduce additional ambiguities into the language. With the addition of `bangCall: true` as default, these ambiguities became particularly serious, so it became necessary to require explicit parentheses.

## Safe traversal expressions

### Changes:

#### 1. The semantics of safe chaining now match the JS proposal

The JavaScript optional chaining proposal specifies details on how safe chains should be evaluated. We've adopted the algorithm specified in the proposal. This results in a number of bug fixes as well as improved short-circuiting semantics.

For example:
```js
a?[b++]?.c
// in lightscript@0.5.9, this compiles to:
(a == null ? null : a[b++]) == null ? null : a[b++].c;
// in @oigroup/lightscript@3.0.0, this compiles to the (correct):
a == null ? void 0 : (_a = a[b++]) == null ? void 0 : _a.c;
```

This is a **breaking change** to language semantics! Most user code should not be affected, as it should not rely on this kind of side effect ordering -- but please do note the possible impact here.

#### 2. `{ safeCall: true }` enabled by default

The JS proposal appears likely to include safe calls, so they are now on by default. `{ safeCall: false }` can still be passed as a compiler flag to disable them. In the event the JS proposal advances to a late stage with safe calls present, the flag will be removed altogether.

#### 3. Syntax and other changes

The JS optional chaining syntax is still in rapid flux despite its position at Stage 1 in the standards process. There appears to be considerable uncertainty on the final syntax. For that reason, we are delaying introducing any syntax changes at this time.

### Rationale:

We're trying to converge with the JS safe traversal proposal when possible, as well as fix bugs in the previous LSC implementation.

## Bang calls

#### Bang calls (`{bangCall: true}`) are now enabled by default.

LightScript upstream has indicated they will be accepting this feature, so it is now on by default. `{bangCall: false}` can still be passed to disable it. The flag will be removed altogether when LightScript proper integrates the feature.

## Spread Loops (formerly Comprehensions)

### Changes

#### 1. All previous iterations of comprehensions have been removed.

This is now illegal:

```js
[for elem e in arr: e]
```

This is now a block of code consisting of a `for` loop, rather than an object:
```
{for elem e in arr: (e, e)}
```

The `enhancedComprehension` compiler flag and all associated syntax have been removed as well.

#### 2. `for` loops can now be spread:

```js
x = [
  // A spread loop is introduced by `...for` and behaves as if a spread
  // element were added to the array for each iteration of the loop. The
  // last expression reached by the loop will be spread into the final array.
  //
  // In most cases, this means wrapping the element that you want to add
  // to the final array in `[ ]`
  ...for elem e in arr: [e] // produces [ e1, e2, ... ]
  // If you want to create nested arrays, you must add an extra level of nesting
  // at the end:
  ...for elem e in arr: [ [ e ] ] // produces [ [e1], [e2], ... ]
  // You can also add multiple elements to the output array per loop iteration:
  ...for elem e in arr: [e, e+1] // [e1, e1+1, e2, e2+1, ...]
  // The loop is still elisive, meaning you can skip elements you don't want
  // added to the final array:
  ...for elem e in arr: if e > 10: [ e ]
  // You can mix spreads with regular entries as normal
  42
  ...es2015Spread
]
```

```js
reversedObj = {
  // Spread loops work with objects too. As with ES2015 object spread, the
  // loop must end with an expression that will be `Object.assign`ed to the
  // output object.
  ...for key k, val v in otherObj: {[v]: k}
}
```
### Rationale

- The addition of `...` solves the serious grammar ambiguity at https://github.com/wcjohnson/lightscript/issues/25.

- In general, the syntax and semantics here are designed to correspond with ES2015+ spread `...` syntax, bringing the language closer to the standard and leaving less room for user surprise.

- Spread loops are more powerful than previous iterations of comprehensions, allowing each loop iteration to map to zero, one, or any number of output elements.

## Object-block ambiguity

### Changes

#### 1. Context-sensitive parsing of `{ }` delimiters

When the parser encounters `{ }` delimiters, it uses information from context to decide between ambiguous interpretations:

- Whenever plain JavaScript syntax is used with `if`, `for`, `do`, `while`, the following `{ }` will be treated as a block of code:

```js
z = 3
x = if (true) { z }
// x === 3
```

- Whenever LightScript syntax is used with `if`, `for`, `do`, `while`, the following `{ }` will first be treated as an object expression, then as a block of code if it fails to parse as an object:

```js
z = 3
x = if true: { z }
// x deepEquals { z: 3 }
```

- Whenever `{ }` is encountered elsewhere, it is first treated as an object, then as a block.

```js
a; { b } = c
// In lightscript 0.5.9 the `{b}` was treated as a block and this didn't compile:
Unexpected token (1:7)
> 1 | a; {b} = c
    |        ^
// but now it does:
a;
const { b } = c;
```

```js
// It is also no longer necessary to set off anonymous code blocks using semicolons.
{
  a = b
}
// in 0.5.9:
unknown: Unexpected token (2:4)
  2 | {
> 3 |   a = b
    |     ^
// in 3.0:
{
  const a = b;
}
```

#### 2. Labeled expressions are illegal

Applying a label to an expression will now result in an error:
```js
{
  thisIsABlock()
  label: expr
}
```
```js
Labeled expressions are illegal. (3:2)
```

### Rationale

It is easy for LightScript users to get burned by the distinctions between objects and blocks of code in the LightScript grammar:
```js
f() -> {}
g() -> ({})

x = f()
// x === undefined
y = g()
// y === { }
```

The general intent of these changes is to eliminate these sorts of traps and edge cases. Ideally the output of the compiler should "just make sense" and it is not necessary to remember the specific rules about how braces are parsed.

Labeled expressions increase the number of scenarios where objects and blocks can be confused with each other, and don't make much sense on their own, so they have been outlawed.

(In terms of the parser unit test suite, this change eliminated around 20 situations where LightScript was parsing vanilla JavaScript incorrectly, as well as four parsing situations labeled as `unfortunate` in the test suite itself.)

## `pipeCall` option eliminated

### Change

`pipeCall` is no longer available as an option and the syntax has been removed.

### Rationale

Nobody was willing to strongly advocate for this feature or present a compelling use case. In general, the advantanges of `pipeCall`s are already available in the language through other means. Thus it's not worthwile maintaining this syntax.

## `for..of` loops no longer require `const`

### Change

```js
for x of xs: x
// lightscript 0.5.9
unknown: for-of requires a variable qualifier: `now` to reassign an existing variable, or `const`, `let`, `var` to declare a new one. (1:4)
> 1 | for x of xs: x
    |
// @oigroup/lightscript 3.x
for (const x of xs) { x }
```

### Rationale

Nobody was sure why this was being enforced; it is at odds with implicit qualification in other looping constructs like enhanced `for..in`.
