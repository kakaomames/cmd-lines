// include: shell.js
// include: minimum_runtime_check.js
(function() {
  // "30.0.0" -> 300000
  function humanReadableVersionToPacked(str) {
    str = str.split('-')[0]; // Remove any trailing part from e.g. "12.53.3-alpha"
    var vers = str.split('.').slice(0, 3);
    while(vers.length < 3) vers.push('00');
    vers = vers.map((n, i, arr) => n.padStart(2, '0'));
    return vers.join('');
  }
  // 300000 -> "30.0.0"
  var packedVersionToHumanReadable = n => [n / 10000 | 0, (n / 100 | 0) % 100, n % 100].join('.');

  var TARGET_NOT_SUPPORTED = 2147483647;

  // Note: We use a typeof check here instead of optional chaining using
  // globalThis because older browsers might not have globalThis defined.
  var currentNodeVersion = typeof process !== 'undefined' && process.versions?.node ? humanReadableVersionToPacked(process.versions.node) : TARGET_NOT_SUPPORTED;
  if (currentNodeVersion < 160000) {
    throw new Error(`This emscripten-generated code requires node v${ packedVersionToHumanReadable(160000) } (detected v${packedVersionToHumanReadable(currentNodeVersion)})`);
  }

  var userAgent = typeof navigator !== 'undefined' && navigator.userAgent;
  if (!userAgent) {
    return;
  }

  var currentSafariVersion = userAgent.includes("Safari/") && !userAgent.includes("Chrome/") && userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/) ? humanReadableVersionToPacked(userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentSafariVersion < 150000) {
    throw new Error(`This emscripten-generated code requires Safari v${ packedVersionToHumanReadable(150000) } (detected v${currentSafariVersion})`);
  }

  var currentFirefoxVersion = userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentFirefoxVersion < 79) {
    throw new Error(`This emscripten-generated code requires Firefox v79 (detected v${currentFirefoxVersion})`);
  }

  var currentChromeVersion = userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentChromeVersion < 85) {
    throw new Error(`This emscripten-generated code requires Chrome v85 (detected v${currentChromeVersion})`);
  }
})();

// end include: minimum_runtime_check.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != 'undefined' ? Module : {};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = !!globalThis.window;
var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != 'renderer';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)


var arguments_ = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// In MODULARIZE mode _scriptName needs to be captured already at the very top of the page immediately when the page is parsed, so it is generated there
// before the page load. In non-MODULARIZE modes generate it here.
var _scriptName = globalThis.document?.currentScript?.src;

if (typeof __filename != 'undefined') { // Node
  _scriptName = __filename;
} else
if (ENVIRONMENT_IS_WORKER) {
  _scriptName = self.location.href;
}

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {
  const isNode = globalThis.process?.versions?.node && globalThis.process?.type != 'renderer';
  if (!isNode) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require('fs');

  scriptDirectory = __dirname + '/';

// include: node_shell_read.js
readBinary = (filename) => {
  // We need to re-wrap `file://` strings to URLs.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename);
  assert(Buffer.isBuffer(ret));
  return ret;
};

readAsync = async (filename, binary = true) => {
  // See the comment in the `readBinary` function.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename, binary ? undefined : 'utf8');
  assert(binary ? Buffer.isBuffer(ret) : typeof ret == 'string');
  return ret;
};
// end include: node_shell_read.js
  if (process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, '/');
  }

  arguments_ = process.argv.slice(2);

  // MODULARIZE will export the module in the proper place outside, we don't need to export here
  if (typeof module != 'undefined') {
    module['exports'] = Module;
  }

  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };

} else
if (ENVIRONMENT_IS_SHELL) {

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  try {
    scriptDirectory = new URL('.', _scriptName).href; // includes trailing slash
  } catch {
    // Must be a `blob:` or `data:` URL (e.g. `blob:http://site.com/etc/etc`), we cannot
    // infer anything from them.
  }

  if (!(globalThis.window || globalThis.WorkerGlobalScope)) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  {
// include: web_or_worker_shell_read.js
if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = async (url) => {
    // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
    // See https://github.com/github/fetch/pull/92#issuecomment-140665932
    // Cordova or Electron apps are typically loaded from a file:// url.
    // So use XHR on webview if URL is a file URL.
    if (isFileURI(url)) {
      return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            resolve(xhr.response);
            return;
          }
          reject(xhr.status);
        };
        xhr.onerror = reject;
        xhr.send(null);
      });
    }
    var response = await fetch(url, { credentials: 'same-origin' });
    if (response.ok) {
      return response.arrayBuffer();
    }
    throw new Error(response.status + ' : ' + response.url);
  };
// end include: web_or_worker_shell_read.js
  }
} else
{
  throw new Error('environment detection error');
}

var out = console.log.bind(console);
var err = console.error.bind(console);

var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var FETCHFS = 'FETCHFS is no longer included by default; build with -lfetchfs.js';
var ICASEFS = 'ICASEFS is no longer included by default; build with -licasefs.js';
var JSFILEFS = 'JSFILEFS is no longer included by default; build with -ljsfilefs.js';
var OPFS = 'OPFS is no longer included by default; build with -lopfs.js';

var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';

// perform assertions in shell.js after we set up out() and err(), as otherwise
// if an assertion fails it cannot print the message

assert(!ENVIRONMENT_IS_SHELL, 'shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable.');

// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary;

if (!globalThis.WebAssembly) {
  err('no native wasm support detected');
}

// Wasm globals

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed' + (text ? ': ' + text : ''));
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');

// include: runtime_common.js
// include: runtime_stack_check.js
// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  // If the stack ends at address zero we write our cookies 4 bytes into the
  // stack.  This prevents interference with SAFE_HEAP and ASAN which also
  // monitor writes to address zero.
  if (max == 0) {
    max += 4;
  }
  // The stack grow downwards towards _emscripten_stack_get_end.
  // We write cookies to the final two words in the stack and detect if they are
  // ever overwritten.
  HEAPU32[((max)>>2)] = 0x02135467;
  HEAPU32[(((max)+(4))>>2)] = 0x89BACDFE;
  // Also test the global address 0 for integrity.
  HEAPU32[((0)>>2)] = 1668509029;
}

function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  // See writeStackCookie().
  if (max == 0) {
    max += 4;
  }
  var cookie1 = HEAPU32[((max)>>2)];
  var cookie2 = HEAPU32[(((max)+(4))>>2)];
  if (cookie1 != 0x02135467 || cookie2 != 0x89BACDFE) {
    abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`);
  }
  // Also test the global address 0 for integrity.
  if (HEAPU32[((0)>>2)] != 0x63736d65 /* 'emsc' */) {
    abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
  }
}
// end include: runtime_stack_check.js
// include: runtime_exceptions.js
// end include: runtime_exceptions.js
// include: runtime_debug.js
var runtimeDebug = true; // Switch to false at runtime to disable logging at the right times

// Used by XXXXX_DEBUG settings to output debug messages.
function dbg(...args) {
  if (!runtimeDebug && typeof runtimeDebug != 'undefined') return;
  // TODO(sbc): Make this configurable somehow.  Its not always convenient for
  // logging to show up as warnings.
  console.warn(...args);
}

// Endianness check
(() => {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 0x6373;
  if (h8[0] !== 0x73 || h8[1] !== 0x63) abort('Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)');
})();

function consumedModuleProp(prop) {
  if (!Object.getOwnPropertyDescriptor(Module, prop)) {
    Object.defineProperty(Module, prop, {
      configurable: true,
      set() {
        abort(`Attempt to set \`Module.${prop}\` after it has already been processed.  This can happen, for example, when code is injected via '--post-js' rather than '--pre-js'`);

      }
    });
  }
}

function makeInvalidEarlyAccess(name) {
  return () => assert(false, `call to '${name}' via reference taken before Wasm module initialization`);

}

function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
  return name === 'FS_createPath' ||
         name === 'FS_createDataFile' ||
         name === 'FS_createPreloadedFile' ||
         name === 'FS_preloadFile' ||
         name === 'FS_unlink' ||
         name === 'addRunDependency' ||
         // The old FS has some functionality that WasmFS lacks.
         name === 'FS_createLazyFile' ||
         name === 'FS_createDevice' ||
         name === 'removeRunDependency';
}

/**
 * Intercept access to a symbols in the global symbol.  This enables us to give
 * informative warnings/errors when folks attempt to use symbols they did not
 * include in their build, or no symbols that no longer exist.
 *
 * We don't define this in MODULARIZE mode since in that mode emscripten symbols
 * are never placed in the global scope.
 */
function hookGlobalSymbolAccess(sym, func) {
  if (!Object.getOwnPropertyDescriptor(globalThis, sym)) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get() {
        func();
        return undefined;
      }
    });
  }
}

function missingGlobal(sym, msg) {
  hookGlobalSymbolAccess(sym, () => {
    warnOnce(`\`${sym}\` is no longer defined by emscripten. ${msg}`);
  });
}

missingGlobal('buffer', 'Please use HEAP8.buffer or wasmMemory.buffer');
missingGlobal('asm', 'Please use wasmExports instead');

function missingLibrarySymbol(sym) {
  hookGlobalSymbolAccess(sym, () => {
    // Can't `abort()` here because it would break code that does runtime
    // checks.  e.g. `if (typeof SDL === 'undefined')`.
    var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
    // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
    // library.js, which means $name for a JS name with no prefix, or name
    // for a JS name like _name.
    var librarySymbol = sym;
    if (!librarySymbol.startsWith('_')) {
      librarySymbol = '$' + sym;
    }
    msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
    if (isExportedByForceFilesystem(sym)) {
      msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
    }
    warnOnce(msg);
  });

  // Any symbol that is not included from the JS library is also (by definition)
  // not exported on the Module object.
  unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get() {
        var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        abort(msg);
      },
    });
  }
}

// end include: runtime_debug.js
// Memory management
var
/** @type {!Int8Array} */
  HEAP8,
/** @type {!Uint8Array} */
  HEAPU8,
/** @type {!Int16Array} */
  HEAP16,
/** @type {!Uint16Array} */
  HEAPU16,
/** @type {!Int32Array} */
  HEAP32,
/** @type {!Uint32Array} */
  HEAPU32,
/** @type {!Float32Array} */
  HEAPF32,
/** @type {!Float64Array} */
  HEAPF64;

// BigInt64Array type is not correctly defined in closure
var
/** not-@type {!BigInt64Array} */
  HEAP64,
/* BigUint64Array type is not correctly defined in closure
/** not-@type {!BigUint64Array} */
  HEAPU64;

var runtimeInitialized = false;



function updateMemoryViews() {
  var b = wasmMemory.buffer;
  HEAP8 = new Int8Array(b);
  HEAP16 = new Int16Array(b);
  HEAPU8 = new Uint8Array(b);
  HEAPU16 = new Uint16Array(b);
  HEAP32 = new Int32Array(b);
  HEAPU32 = new Uint32Array(b);
  HEAPF32 = new Float32Array(b);
  HEAPF64 = new Float64Array(b);
  HEAP64 = new BigInt64Array(b);
  HEAPU64 = new BigUint64Array(b);
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// end include: runtime_common.js
assert(globalThis.Int32Array && globalThis.Float64Array && Int32Array.prototype.subarray && Int32Array.prototype.set,
       'JS engine does not provide full typed array support');

function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  consumedModuleProp('preRun');
  // Begin ATPRERUNS hooks
  callRuntimeCallbacks(onPreRuns);
  // End ATPRERUNS hooks
}

function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;

  checkStackCookie();

  // Begin ATINITS hooks
  if (!Module['noFSInit'] && !FS.initialized) FS.init();
TTY.init();
  // End ATINITS hooks

  wasmExports['__wasm_call_ctors']();

  // Begin ATPOSTCTORS hooks
  FS.ignorePermissions = false;
  // End ATPOSTCTORS hooks
}

function preMain() {
  checkStackCookie();
  // No ATMAINS hooks
}

function postRun() {
  checkStackCookie();
   // PThreads reuse the runtime from the main thread.

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  consumedModuleProp('postRun');

  // Begin ATPOSTRUNS hooks
  callRuntimeCallbacks(onPostRuns);
  // End ATPOSTRUNS hooks
}

/** @param {string|number=} what */
function abort(what) {
  Module['onAbort']?.(what);

  what = 'Aborted(' + what + ')';
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

function createExportWrapper(name, nargs) {
  return (...args) => {
    assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
    var f = wasmExports[name];
    assert(f, `exported native function \`${name}\` not found`);
    // Only assert for too many arguments. Too few can be valid since the missing arguments will be zero filled.
    assert(args.length <= nargs, `native function \`${name}\` called with ${args.length} args but expects ${nargs}`);
    return f(...args);
  };
}

var wasmBinaryFile;

function findWasmBinary() {
  return locateFile('engine.wasm');
}

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
    return readBinary(file);
  }
  // Throwing a plain string here, even though it not normally advisable since
  // this gets turning into an `abort` in instantiateArrayBuffer.
  throw 'both async and sync fetching of the wasm failed';
}

async function getWasmBinary(binaryFile) {
  // If we don't have the binary yet, load it asynchronously using readAsync.
  if (!wasmBinary) {
    // Fetch the binary using readAsync
    try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {
      // Fall back to getBinarySync below;
    }
  }

  // Otherwise, getBinarySync should be able to get it synchronously
  return getBinarySync(binaryFile);
}

async function instantiateArrayBuffer(binaryFile, imports) {
  try {
    var binary = await getWasmBinary(binaryFile);
    var instance = await WebAssembly.instantiate(binary, imports);
    return instance;
  } catch (reason) {
    err(`failed to asynchronously prepare wasm: ${reason}`);

    // Warn on some common problems.
    if (isFileURI(binaryFile)) {
      err(`warning: Loading from a file URI (${binaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
    }
    abort(reason);
  }
}

async function instantiateAsync(binary, binaryFile, imports) {
  if (!binary
      // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
      && !isFileURI(binaryFile)
      // Avoid instantiateStreaming() on Node.js environment for now, as while
      // Node.js v18.1.0 implements it, it does not have a full fetch()
      // implementation yet.
      //
      // Reference:
      //   https://github.com/emscripten-core/emscripten/pull/16917
      && !ENVIRONMENT_IS_NODE
     ) {
    try {
      var response = fetch(binaryFile, { credentials: 'same-origin' });
      var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
      return instantiationResult;
    } catch (reason) {
      // We expect the most common failure cause to be a bad MIME type for the binary,
      // in which case falling back to ArrayBuffer instantiation should work.
      err(`wasm streaming compile failed: ${reason}`);
      err('falling back to ArrayBuffer instantiation');
      // fall back of instantiateArrayBuffer below
    };
  }
  return instantiateArrayBuffer(binaryFile, imports);
}

function getWasmImports() {
  // prepare imports
  var imports = {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  };
  return imports;
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
async function createWasm() {
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance(instance, module) {
    wasmExports = instance.exports;

    assignWasmExports(wasmExports);

    updateMemoryViews();

    removeRunDependency('wasm-instantiate');
    return wasmExports;
  }
  addRunDependency('wasm-instantiate');

  // Prefer streaming instantiation if available.
  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above PTHREADS-enabled path.
    return receiveInstance(result['instance']);
  }

  var info = getWasmImports();

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module['instantiateWasm']) {
    return new Promise((resolve, reject) => {
      try {
        Module['instantiateWasm'](info, (inst, mod) => {
          resolve(receiveInstance(inst, mod));
        });
      } catch(e) {
        err(`Module.instantiateWasm callback failed with error: ${e}`);
        reject(e);
      }
    });
  }

  wasmBinaryFile ??= findWasmBinary();
  var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
  var exports = receiveInstantiationResult(result);
  return exports;
}

// end include: preamble.js

// Begin JS library code


  class ExitStatus {
      name = 'ExitStatus';
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }

  var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    };
  var onPostRuns = [];
  var addOnPostRun = (cb) => onPostRuns.push(cb);

  var onPreRuns = [];
  var addOnPreRun = (cb) => onPreRuns.push(cb);

  var runDependencies = 0;
  
  
  var dependenciesFulfilled = null;
  
  var runDependencyTracking = {
  };
  
  var runDependencyWatcher = null;
  var removeRunDependency = (id) => {
      runDependencies--;
  
      Module['monitorRunDependencies']?.(runDependencies);
  
      assert(id, 'removeRunDependency requires an ID');
      assert(runDependencyTracking[id]);
      delete runDependencyTracking[id];
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback(); // can add another dependenciesFulfilled
        }
      }
    };
  
  
  var addRunDependency = (id) => {
      runDependencies++;
  
      Module['monitorRunDependencies']?.(runDependencies);
  
      assert(id, 'addRunDependency requires an ID')
      assert(!runDependencyTracking[id]);
      runDependencyTracking[id] = 1;
      if (runDependencyWatcher === null && globalThis.setInterval) {
        // Check for missing dependencies every few seconds
        runDependencyWatcher = setInterval(() => {
          if (ABORT) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null;
            return;
          }
          var shown = false;
          for (var dep in runDependencyTracking) {
            if (!shown) {
              shown = true;
              err('still waiting on run dependencies:');
            }
            err(`dependency: ${dep}`);
          }
          if (shown) {
            err('(end of list)');
          }
        }, 10000);
        // Prevent this timer from keeping the runtime alive if nothing
        // else is.
        runDependencyWatcher.unref?.()
      }
    };


  
    /**
     * @param {number} ptr
     * @param {string} type
     */
  function getValue(ptr, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': return HEAP8[ptr];
      case 'i8': return HEAP8[ptr];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP64[((ptr)>>3)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      case '*': return HEAPU32[((ptr)>>2)];
      default: abort(`invalid type for getValue: ${type}`);
    }
  }

  var noExitRuntime = true;

  var ptrToString = (ptr) => {
      assert(typeof ptr === 'number', `ptrToString expects a number, got ${typeof ptr}`);
      // Convert to 32-bit unsigned value
      ptr >>>= 0;
      return '0x' + ptr.toString(16).padStart(8, '0');
    };


  
    /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
  function setValue(ptr, value, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': HEAP8[ptr] = value; break;
      case 'i8': HEAP8[ptr] = value; break;
      case 'i16': HEAP16[((ptr)>>1)] = value; break;
      case 'i32': HEAP32[((ptr)>>2)] = value; break;
      case 'i64': HEAP64[((ptr)>>3)] = BigInt(value); break;
      case 'float': HEAPF32[((ptr)>>2)] = value; break;
      case 'double': HEAPF64[((ptr)>>3)] = value; break;
      case '*': HEAPU32[((ptr)>>2)] = value; break;
      default: abort(`invalid type for setValue: ${type}`);
    }
  }

  var stackRestore = (val) => __emscripten_stack_restore(val);

  var stackSave = () => _emscripten_stack_get_current();

  var warnOnce = (text) => {
      warnOnce.shown ||= {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = 'warning: ' + text;
        err(text);
      }
    };

  

  var wasmTableMirror = [];
  
  
  var getWasmTableEntry = (funcPtr) => {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        /** @suppress {checkTypes} */
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      /** @suppress {checkTypes} */
      assert(wasmTable.get(funcPtr) == func, 'JavaScript-side Wasm function table mirror is out of date!');
      return func;
    };
  var ___call_sighandler = (fp, sig) => getWasmTableEntry(fp)(sig);

  var syscallGetVarargI = () => {
      assert(SYSCALLS.varargs != undefined);
      // the `+` prepended here is necessary to convince the JSCompiler that varargs is indeed a number.
      var ret = HEAP32[((+SYSCALLS.varargs)>>2)];
      SYSCALLS.varargs += 4;
      return ret;
    };
  var syscallGetVarargP = syscallGetVarargI;
  
  
  var PATH = {
  isAbs:(path) => path.charAt(0) === '/',
  splitPath:(filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },
  normalizeArray:(parts, allowAboveRoot) => {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },
  normalize:(path) => {
        var isAbsolute = PATH.isAbs(path),
            trailingSlash = path.slice(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter((p) => !!p), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },
  dirname:(path) => {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.slice(0, -1);
        }
        return root + dir;
      },
  basename:(path) => path && path.match(/([^\/]+|\/)\/*$/)[1],
  join:(...paths) => PATH.normalize(paths.join('/')),
  join2:(l, r) => PATH.normalize(l + '/' + r),
  };
  
  var initRandomFill = () => {
      // This block is not needed on v19+ since crypto.getRandomValues is builtin
      if (ENVIRONMENT_IS_NODE) {
        var nodeCrypto = require('crypto');
        return (view) => nodeCrypto.randomFillSync(view);
      }
  
      return (view) => crypto.getRandomValues(view);
    };
  var randomFill = (view) => {
      // Lazily init on the first invocation.
      (randomFill = initRandomFill())(view);
    };
  
  
  
  var PATH_FS = {
  resolve:(...args) => {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? args[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path != 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = PATH.isAbs(path);
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter((p) => !!p), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },
  relative:(from, to) => {
        from = PATH_FS.resolve(from).slice(1);
        to = PATH_FS.resolve(to).slice(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      },
  };
  
  
  var UTF8Decoder = globalThis.TextDecoder && new TextDecoder();
  
  var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
      var maxIdx = idx + maxBytesToRead;
      if (ignoreNul) return maxIdx;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.
      // As a tiny code save trick, compare idx against maxIdx using a negation,
      // so that maxBytesToRead=undefined/NaN means Infinity.
      while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
      return idx;
    };
  
  
    /**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number=} idx
     * @param {number=} maxBytesToRead
     * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
     * @return {string}
     */
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
  
      var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
  
      // When using conditional TextDecoder, skip it for short strings as the overhead of the native call is not worth it.
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = '';
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte ' + ptrToString(u0) + ' encountered when deserializing a UTF-8 string in wasm memory to a JS string!');
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
  
        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
      return str;
    };
  
  var FS_stdin_getChar_buffer = [];
  
  var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var c = str.charCodeAt(i); // possibly a lead surrogate
        if (c <= 0x7F) {
          len++;
        } else if (c <= 0x7FF) {
          len += 2;
        } else if (c >= 0xD800 && c <= 0xDFFF) {
          len += 4; ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
  
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      assert(typeof str === 'string', `stringToUTF8Array expects a string (got ${typeof str})`);
      // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
      // undefined and false each don't write out any bytes.
      if (!(maxBytesToWrite > 0))
        return 0;
  
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
      for (var i = 0; i < str.length; ++i) {
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        var u = str.codePointAt(i);
        if (u <= 0x7F) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 0x7FF) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 0xC0 | (u >> 6);
          heap[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xFFFF) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 0xE0 | (u >> 12);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 0x10FFFF) warnOnce('Invalid Unicode code point ' + ptrToString(u) + ' encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).');
          heap[outIdx++] = 0xF0 | (u >> 18);
          heap[outIdx++] = 0x80 | ((u >> 12) & 63);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
          // Gotcha: if codePoint is over 0xFFFF, it is represented as a surrogate pair in UTF-16.
          // We need to manually skip over the second code unit for correct iteration.
          i++;
        }
      }
      // Null-terminate the pointer to the buffer.
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
  /** @type {function(string, boolean=, number=)} */
  var intArrayFromString = (stringy, dontAddNull, length) => {
      var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    };
  var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          // we will read data by chunks of BUFSIZE
          var BUFSIZE = 256;
          var buf = Buffer.alloc(BUFSIZE);
          var bytesRead = 0;
  
          // For some reason we must suppress a closure warning here, even though
          // fd definitely exists on process.stdin, and is even the proper way to
          // get the fd of stdin,
          // https://github.com/nodejs/help/issues/2136#issuecomment-523649904
          // This started to happen after moving this logic out of library_tty.js,
          // so it is related to the surrounding code in some unclear manner.
          /** @suppress {missingProperties} */
          var fd = process.stdin.fd;
  
          try {
            bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
          } catch(e) {
            // Cross-platform differences: on Windows, reading EOF throws an
            // exception, but on other OSes, reading EOF returns 0. Uniformize
            // behavior by treating the EOF exception to return 0.
            if (e.toString().includes('EOF')) bytesRead = 0;
            else throw e;
          }
  
          if (bytesRead > 0) {
            result = buf.slice(0, bytesRead).toString('utf-8');
          }
        } else
        if (globalThis.window?.prompt) {
          // Browser.
          result = window.prompt('Input: ');  // returns null on cancel
          if (result !== null) {
            result += '\n';
          }
        } else
        {}
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    };
  var TTY = {
  ttys:[],
  init() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process.stdin.setEncoding('utf8');
        // }
      },
  shutdown() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process.stdin.pause();
        // }
      },
  register(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },
  stream_ops:{
  open(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },
  close(stream) {
          // flush any pending line data
          stream.tty.ops.fsync(stream.tty);
        },
  fsync(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
  read(stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.atime = Date.now();
          }
          return bytesRead;
        },
  write(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.mtime = stream.node.ctime = Date.now();
          }
          return i;
        },
  },
  default_tty_ops:{
  get_char(tty) {
          return FS_stdin_getChar();
        },
  put_char(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },
  fsync(tty) {
          if (tty.output?.length > 0) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  ioctl_tcgets(tty) {
          // typical setting
          return {
            c_iflag: 25856,
            c_oflag: 5,
            c_cflag: 191,
            c_lflag: 35387,
            c_cc: [
              0x03, 0x1c, 0x7f, 0x15, 0x04, 0x00, 0x01, 0x00, 0x11, 0x13, 0x1a, 0x00,
              0x12, 0x0f, 0x17, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
              0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ]
          };
        },
  ioctl_tcsets(tty, optional_actions, data) {
          // currently just ignore
          return 0;
        },
  ioctl_tiocgwinsz(tty) {
          return [24, 80];
        },
  },
  default_tty1_ops:{
  put_char(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
  fsync(tty) {
          if (tty.output?.length > 0) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  },
  };
  
  
  var zeroMemory = (ptr, size) => HEAPU8.fill(0, ptr, ptr + size);
  
  var alignMemory = (size, alignment) => {
      assert(alignment, "alignment argument is required");
      return Math.ceil(size / alignment) * alignment;
    };
  var mmapAlloc = (size) => {
      size = alignMemory(size, 65536);
      var ptr = _emscripten_builtin_memalign(65536, size);
      if (ptr) zeroMemory(ptr, size);
      return ptr;
    };
  var MEMFS = {
  ops_table:null,
  mount(mount) {
        return MEMFS.createNode(null, '/', 16895, 0);
      },
  createNode(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // not supported
          throw new FS.ErrnoError(63);
        }
        MEMFS.ops_table ||= {
          dir: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              lookup: MEMFS.node_ops.lookup,
              mknod: MEMFS.node_ops.mknod,
              rename: MEMFS.node_ops.rename,
              unlink: MEMFS.node_ops.unlink,
              rmdir: MEMFS.node_ops.rmdir,
              readdir: MEMFS.node_ops.readdir,
              symlink: MEMFS.node_ops.symlink
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek
            }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        };
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.atime = node.mtime = node.ctime = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
          parent.atime = parent.mtime = parent.ctime = node.atime;
        }
        return node;
      },
  getFileDataAsTypedArray(node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },
  expandFileStorage(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
        // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
        // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
        // avoid overshooting the allocation cap by a very large margin.
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity); // Allocate new storage.
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
      },
  resizeFileStorage(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
        } else {
          var oldContents = node.contents;
          node.contents = new Uint8Array(newSize); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
        }
      },
  node_ops:{
  getattr(node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.atime);
          attr.mtime = new Date(node.mtime);
          attr.ctime = new Date(node.ctime);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },
  setattr(node, attr) {
          for (const key of ["mode", "atime", "mtime", "ctime"]) {
            if (attr[key] != null) {
              node[key] = attr[key];
            }
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },
  lookup(parent, name) {
          throw new FS.ErrnoError(44);
        },
  mknod(parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },
  rename(old_node, new_dir, new_name) {
          var new_node;
          try {
            new_node = FS.lookupNode(new_dir, new_name);
          } catch (e) {}
          if (new_node) {
            if (FS.isDir(old_node.mode)) {
              // if we're overwriting a directory at new_name, make sure it's empty.
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(55);
              }
            }
            FS.hashRemoveNode(new_node);
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          new_dir.contents[new_name] = old_node;
          old_node.name = new_name;
          new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
        },
  unlink(parent, name) {
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
  rmdir(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
  readdir(node) {
          return ['.', '..', ...Object.keys(node.contents)];
        },
  symlink(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 0o777 | 40960, 0);
          node.link = oldpath;
          return node;
        },
  readlink(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        },
  },
  stream_ops:{
  read(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },
  write(stream, buffer, offset, length, position, canOwn) {
          // The data buffer should be a typed array view
          assert(!(buffer instanceof ArrayBuffer));
  
          if (!length) return 0;
          var node = stream.node;
          node.mtime = node.ctime = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) {
              assert(position === 0, 'canOwn must imply no weird position inside the file');
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = buffer.slice(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
  
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) {
            // Use typed array write which is available.
            node.contents.set(buffer.subarray(offset, offset + length), position);
          } else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position + length);
          return length;
        },
  llseek(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },
  mmap(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if (!(flags & 2) && contents && contents.buffer === HEAP8.buffer) {
            // We can't emulate MAP_SHARED when the file is not backed by the
            // buffer we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            if (contents) {
              // Try to avoid unnecessary slices.
              if (position > 0 || position + length < contents.length) {
                if (contents.subarray) {
                  contents = contents.subarray(position, position + length);
                } else {
                  contents = Array.prototype.slice.call(contents, position, position + length);
                }
              }
              HEAP8.set(contents, ptr);
            }
          }
          return { ptr, allocated };
        },
  msync(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        },
  },
  };
  
  var FS_modeStringToFlags = (str) => {
      var flagModes = {
        'r': 0,
        'r+': 2,
        'w': 512 | 64 | 1,
        'w+': 512 | 64 | 2,
        'a': 1024 | 64 | 1,
        'a+': 1024 | 64 | 2,
      };
      var flags = flagModes[str];
      if (typeof flags == 'undefined') {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    };
  
  var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    };
  
  
  
  
    /**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index.
     * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
     * @return {string}
     */
  var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => {
      assert(typeof ptr == 'number', `UTF8ToString expects a number (got ${typeof ptr})`);
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : '';
    };
  
  var strError = (errno) => UTF8ToString(_strerror(errno));
  
  var ERRNO_CODES = {
      'EPERM': 63,
      'ENOENT': 44,
      'ESRCH': 71,
      'EINTR': 27,
      'EIO': 29,
      'ENXIO': 60,
      'E2BIG': 1,
      'ENOEXEC': 45,
      'EBADF': 8,
      'ECHILD': 12,
      'EAGAIN': 6,
      'EWOULDBLOCK': 6,
      'ENOMEM': 48,
      'EACCES': 2,
      'EFAULT': 21,
      'ENOTBLK': 105,
      'EBUSY': 10,
      'EEXIST': 20,
      'EXDEV': 75,
      'ENODEV': 43,
      'ENOTDIR': 54,
      'EISDIR': 31,
      'EINVAL': 28,
      'ENFILE': 41,
      'EMFILE': 33,
      'ENOTTY': 59,
      'ETXTBSY': 74,
      'EFBIG': 22,
      'ENOSPC': 51,
      'ESPIPE': 70,
      'EROFS': 69,
      'EMLINK': 34,
      'EPIPE': 64,
      'EDOM': 18,
      'ERANGE': 68,
      'ENOMSG': 49,
      'EIDRM': 24,
      'ECHRNG': 106,
      'EL2NSYNC': 156,
      'EL3HLT': 107,
      'EL3RST': 108,
      'ELNRNG': 109,
      'EUNATCH': 110,
      'ENOCSI': 111,
      'EL2HLT': 112,
      'EDEADLK': 16,
      'ENOLCK': 46,
      'EBADE': 113,
      'EBADR': 114,
      'EXFULL': 115,
      'ENOANO': 104,
      'EBADRQC': 103,
      'EBADSLT': 102,
      'EDEADLOCK': 16,
      'EBFONT': 101,
      'ENOSTR': 100,
      'ENODATA': 116,
      'ETIME': 117,
      'ENOSR': 118,
      'ENONET': 119,
      'ENOPKG': 120,
      'EREMOTE': 121,
      'ENOLINK': 47,
      'EADV': 122,
      'ESRMNT': 123,
      'ECOMM': 124,
      'EPROTO': 65,
      'EMULTIHOP': 36,
      'EDOTDOT': 125,
      'EBADMSG': 9,
      'ENOTUNIQ': 126,
      'EBADFD': 127,
      'EREMCHG': 128,
      'ELIBACC': 129,
      'ELIBBAD': 130,
      'ELIBSCN': 131,
      'ELIBMAX': 132,
      'ELIBEXEC': 133,
      'ENOSYS': 52,
      'ENOTEMPTY': 55,
      'ENAMETOOLONG': 37,
      'ELOOP': 32,
      'EOPNOTSUPP': 138,
      'EPFNOSUPPORT': 139,
      'ECONNRESET': 15,
      'ENOBUFS': 42,
      'EAFNOSUPPORT': 5,
      'EPROTOTYPE': 67,
      'ENOTSOCK': 57,
      'ENOPROTOOPT': 50,
      'ESHUTDOWN': 140,
      'ECONNREFUSED': 14,
      'EADDRINUSE': 3,
      'ECONNABORTED': 13,
      'ENETUNREACH': 40,
      'ENETDOWN': 38,
      'ETIMEDOUT': 73,
      'EHOSTDOWN': 142,
      'EHOSTUNREACH': 23,
      'EINPROGRESS': 26,
      'EALREADY': 7,
      'EDESTADDRREQ': 17,
      'EMSGSIZE': 35,
      'EPROTONOSUPPORT': 66,
      'ESOCKTNOSUPPORT': 137,
      'EADDRNOTAVAIL': 4,
      'ENETRESET': 39,
      'EISCONN': 30,
      'ENOTCONN': 53,
      'ETOOMANYREFS': 141,
      'EUSERS': 136,
      'EDQUOT': 19,
      'ESTALE': 72,
      'ENOTSUP': 138,
      'ENOMEDIUM': 148,
      'EILSEQ': 25,
      'EOVERFLOW': 61,
      'ECANCELED': 11,
      'ENOTRECOVERABLE': 56,
      'EOWNERDEAD': 62,
      'ESTRPIPE': 135,
    };
  
  var asyncLoad = async (url) => {
      var arrayBuffer = await readAsync(url);
      assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
      return new Uint8Array(arrayBuffer);
    };
  
  
  var FS_createDataFile = (...args) => FS.createDataFile(...args);
  
  var getUniqueRunDependency = (id) => {
      var orig = id;
      while (1) {
        if (!runDependencyTracking[id]) return id;
        id = orig + Math.random();
      }
    };
  
  
  
  var preloadPlugins = [];
  var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
      // Ensure plugins are ready.
      if (typeof Browser != 'undefined') Browser.init();
  
      for (var plugin of preloadPlugins) {
        if (plugin['canHandle'](fullname)) {
          assert(plugin['handle'].constructor.name === 'AsyncFunction', 'Filesystem plugin handlers must be async functions (See #24914)')
          return plugin['handle'](byteArray, fullname);
        }
      }
      // If no plugin handled this file then return the original/unmodified
      // byteArray.
      return byteArray;
    };
  var FS_preloadFile = async (parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
      // TODO we should allow people to just pass in a complete filename instead
      // of parent and name being that we just join them anyways
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`); // might have several active requests for the same fullname
      addRunDependency(dep);
  
      try {
        var byteArray = url;
        if (typeof url == 'string') {
          byteArray = await asyncLoad(url);
        }
  
        byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
        preFinish?.();
        if (!dontCreateFile) {
          FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
        }
      } finally {
        removeRunDependency(dep);
      }
    };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      FS_preloadFile(parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
    };
  var FS = {
  root:null,
  mounts:[],
  devices:{
  },
  streams:[],
  nextInode:1,
  nameTable:null,
  currentPath:"/",
  initialized:false,
  ignorePermissions:true,
  filesystems:null,
  syncFSRequests:0,
  readFiles:{
  },
  ErrnoError:class extends Error {
        name = 'ErrnoError';
        // We set the `name` property to be able to identify `FS.ErrnoError`
        // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
        // - when using PROXYFS, an error can come from an underlying FS
        // as different FS objects have their own FS.ErrnoError each,
        // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
        // we'll use the reliable test `err.name == "ErrnoError"` instead
        constructor(errno) {
          super(runtimeInitialized ? strError(errno) : '');
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
        }
      },
  FSStream:class {
        shared = {};
        get object() {
          return this.node;
        }
        set object(val) {
          this.node = val;
        }
        get isRead() {
          return (this.flags & 2097155) !== 1;
        }
        get isWrite() {
          return (this.flags & 2097155) !== 0;
        }
        get isAppend() {
          return (this.flags & 1024);
        }
        get flags() {
          return this.shared.flags;
        }
        set flags(val) {
          this.shared.flags = val;
        }
        get position() {
          return this.shared.position;
        }
        set position(val) {
          this.shared.position = val;
        }
      },
  FSNode:class {
        node_ops = {};
        stream_ops = {};
        readMode = 292 | 73;
        writeMode = 146;
        mounted = null;
        constructor(parent, name, mode, rdev) {
          if (!parent) {
            parent = this;  // root node sets parent to itself
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.rdev = rdev;
          this.atime = this.mtime = this.ctime = Date.now();
        }
        get read() {
          return (this.mode & this.readMode) === this.readMode;
        }
        set read(val) {
          val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
        }
        get write() {
          return (this.mode & this.writeMode) === this.writeMode;
        }
        set write(val) {
          val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
        }
        get isFolder() {
          return FS.isDir(this.mode);
        }
        get isDevice() {
          return FS.isChrdev(this.mode);
        }
      },
  lookupPath(path, opts = {}) {
        if (!path) {
          throw new FS.ErrnoError(44);
        }
        opts.follow_mount ??= true
  
        if (!PATH.isAbs(path)) {
          path = FS.cwd() + '/' + path;
        }
  
        // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
        linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
          // split the absolute path
          var parts = path.split('/').filter((p) => !!p);
  
          // start at the root
          var current = FS.root;
          var current_path = '/';
  
          for (var i = 0; i < parts.length; i++) {
            var islast = (i === parts.length-1);
            if (islast && opts.parent) {
              // stop resolving
              break;
            }
  
            if (parts[i] === '.') {
              continue;
            }
  
            if (parts[i] === '..') {
              current_path = PATH.dirname(current_path);
              if (FS.isRoot(current)) {
                path = current_path + '/' + parts.slice(i + 1).join('/');
                // We're making progress here, don't let many consecutive ..'s
                // lead to ELOOP
                nlinks--;
                continue linkloop;
              } else {
                current = current.parent;
              }
              continue;
            }
  
            current_path = PATH.join2(current_path, parts[i]);
            try {
              current = FS.lookupNode(current, parts[i]);
            } catch (e) {
              // if noent_okay is true, suppress a ENOENT in the last component
              // and return an object with an undefined node. This is needed for
              // resolving symlinks in the path when creating a file.
              if ((e?.errno === 44) && islast && opts.noent_okay) {
                return { path: current_path };
              }
              throw e;
            }
  
            // jump to the mount's root node if this is a mountpoint
            if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
              current = current.mounted.root;
            }
  
            // by default, lookupPath will not follow a symlink if it is the final path component.
            // setting opts.follow = true will override this behavior.
            if (FS.isLink(current.mode) && (!islast || opts.follow)) {
              if (!current.node_ops.readlink) {
                throw new FS.ErrnoError(52);
              }
              var link = current.node_ops.readlink(current);
              if (!PATH.isAbs(link)) {
                link = PATH.dirname(current_path) + '/' + link;
              }
              path = link + '/' + parts.slice(i + 1).join('/');
              continue linkloop;
            }
          }
          return { path: current_path, node: current };
        }
        throw new FS.ErrnoError(32);
      },
  getPath(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? `${mount}/${path}` : mount + path;
          }
          path = path ? `${node.name}/${path}` : node.name;
          node = node.parent;
        }
      },
  hashName(parentid, name) {
        var hash = 0;
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },
  hashAddNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },
  hashRemoveNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },
  lookupNode(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },
  createNode(parent, name, mode, rdev) {
        assert(typeof parent == 'object')
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },
  destroyNode(node) {
        FS.hashRemoveNode(node);
      },
  isRoot(node) {
        return node === node.parent;
      },
  isMountpoint(node) {
        return !!node.mounted;
      },
  isFile(mode) {
        return (mode & 61440) === 32768;
      },
  isDir(mode) {
        return (mode & 61440) === 16384;
      },
  isLink(mode) {
        return (mode & 61440) === 40960;
      },
  isChrdev(mode) {
        return (mode & 61440) === 8192;
      },
  isBlkdev(mode) {
        return (mode & 61440) === 24576;
      },
  isFIFO(mode) {
        return (mode & 61440) === 4096;
      },
  isSocket(mode) {
        return (mode & 49152) === 49152;
      },
  flagsToPermissionString(flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },
  nodePermissions(node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.includes('r') && !(node.mode & 292)) {
          return 2;
        } else if (perms.includes('w') && !(node.mode & 146)) {
          return 2;
        } else if (perms.includes('x') && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },
  mayLookup(dir) {
        if (!FS.isDir(dir.mode)) return 54;
        var errCode = FS.nodePermissions(dir, 'x');
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },
  mayCreate(dir, name) {
        if (!FS.isDir(dir.mode)) {
          return 54;
        }
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },
  mayDelete(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, 'wx');
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return 31;
          }
        }
        return 0;
      },
  mayOpen(node, flags) {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        } else if (FS.isDir(node.mode)) {
          if (FS.flagsToPermissionString(flags) !== 'r' // opening for write
              || (flags & (512 | 64))) { // TODO: check for O_SEARCH? (== search for dir only)
            return 31;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },
  checkOpExists(op, err) {
        if (!op) {
          throw new FS.ErrnoError(err);
        }
        return op;
      },
  MAX_OPEN_FDS:4096,
  nextfd() {
        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },
  getStreamChecked(fd) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        return stream;
      },
  getStream:(fd) => FS.streams[fd],
  createStream(stream, fd = -1) {
        assert(fd >= -1);
  
        // clone it, so we can return an instance of FSStream
        stream = Object.assign(new FS.FSStream(), stream);
        if (fd == -1) {
          fd = FS.nextfd();
        }
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },
  closeStream(fd) {
        FS.streams[fd] = null;
      },
  dupStream(origStream, fd = -1) {
        var stream = FS.createStream(origStream, fd);
        stream.stream_ops?.dup?.(stream);
        return stream;
      },
  doSetAttr(stream, node, attr) {
        var setattr = stream?.stream_ops.setattr;
        var arg = setattr ? stream : node;
        setattr ??= node.node_ops.setattr;
        FS.checkOpExists(setattr, 63)
        setattr(arg, attr);
      },
  chrdev_stream_ops:{
  open(stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          stream.stream_ops.open?.(stream);
        },
  llseek() {
          throw new FS.ErrnoError(70);
        },
  },
  major:(dev) => ((dev) >> 8),
  minor:(dev) => ((dev) & 0xff),
  makedev:(ma, mi) => ((ma) << 8 | (mi)),
  registerDevice(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },
  getDevice:(dev) => FS.devices[dev],
  getMounts(mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push(...m.mounts);
        }
  
        return mounts;
      },
  syncfs(populate, callback) {
        if (typeof populate == 'function') {
          callback = populate;
          populate = false;
        }
  
        FS.syncFSRequests++;
  
        if (FS.syncFSRequests > 1) {
          err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function doCallback(errCode) {
          assert(FS.syncFSRequests > 0);
          FS.syncFSRequests--;
          return callback(errCode);
        }
  
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        };
  
        // sync all mounts
        for (var mount of mounts) {
          if (mount.type.syncfs) {
            mount.type.syncfs(mount, populate, done);
          } else {
            done(null);
          }
        }
      },
  mount(type, opts, mountpoint) {
        if (typeof type == 'string') {
          // The filesystem was not included, and instead we have an error
          // message stored in the variable.
          throw type;
        }
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
  
        var mount = {
          type,
          opts,
          mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },
  unmount(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        for (var [hash, current] of Object.entries(FS.nameTable)) {
          while (current) {
            var next = current.name_next;
  
            if (mounts.includes(current.mount)) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        }
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },
  lookup(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },
  mknod(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name) {
          throw new FS.ErrnoError(28);
        }
        if (name === '.' || name === '..') {
          throw new FS.ErrnoError(20);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },
  statfs(path) {
        return FS.statfsNode(FS.lookupPath(path, {follow: true}).node);
      },
  statfsStream(stream) {
        // We keep a separate statfsStream function because noderawfs overrides
        // it. In noderawfs, stream.node is sometimes null. Instead, we need to
        // look at stream.path.
        return FS.statfsNode(stream.node);
      },
  statfsNode(node) {
        // NOTE: None of the defaults here are true. We're just returning safe and
        //       sane values. Currently nodefs and rawfs replace these defaults,
        //       other file systems leave them alone.
        var rtn = {
          bsize: 4096,
          frsize: 4096,
          blocks: 1e6,
          bfree: 5e5,
          bavail: 5e5,
          files: FS.nextInode,
          ffree: FS.nextInode - 1,
          fsid: 42,
          flags: 2,
          namelen: 255,
        };
  
        if (node.node_ops.statfs) {
          Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
        }
        return rtn;
      },
  create(path, mode = 0o666) {
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },
  mkdir(path, mode = 0o777) {
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },
  mkdirTree(path, mode) {
        var dirs = path.split('/');
        var d = '';
        for (var dir of dirs) {
          if (!dir) continue;
          if (d || PATH.isAbs(path)) d += '/';
          d += dir;
          try {
            FS.mkdir(d, mode);
          } catch(e) {
            if (e.errno != 20) throw e;
          }
        }
      },
  mkdev(path, mode, dev) {
        if (typeof dev == 'undefined') {
          dev = mode;
          mode = 0o666;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },
  symlink(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },
  rename(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
  
        // let the errors from non existent directories percolate up
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
  
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(28);
        }
        // new path should not be an ancestor of the old path
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(55);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        errCode = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(10);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, 'w');
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
          // update old node (we do this here to avoid each backend
          // needing to)
          old_node.parent = new_dir;
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },
  rmdir(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },
  readdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
        return readdir(node);
      },
  unlink(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          // According to POSIX, we should map EISDIR to EPERM, but
          // we instead do what Linux does (and we must, as we use
          // the musl linux libc).
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },
  readlink(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return link.node_ops.readlink(link);
      },
  stat(path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
        return getattr(node);
      },
  fstat(fd) {
        var stream = FS.getStreamChecked(fd);
        var node = stream.node;
        var getattr = stream.stream_ops.getattr;
        var arg = getattr ? stream : node;
        getattr ??= node.node_ops.getattr;
        FS.checkOpExists(getattr, 63)
        return getattr(arg);
      },
  lstat(path) {
        return FS.stat(path, true);
      },
  doChmod(stream, node, mode, dontFollow) {
        FS.doSetAttr(stream, node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          ctime: Date.now(),
          dontFollow
        });
      },
  chmod(path, mode, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChmod(null, node, mode, dontFollow);
      },
  lchmod(path, mode) {
        FS.chmod(path, mode, true);
      },
  fchmod(fd, mode) {
        var stream = FS.getStreamChecked(fd);
        FS.doChmod(stream, stream.node, mode, false);
      },
  doChown(stream, node, dontFollow) {
        FS.doSetAttr(stream, node, {
          timestamp: Date.now(),
          dontFollow
          // we ignore the uid / gid for now
        });
      },
  chown(path, uid, gid, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChown(null, node, dontFollow);
      },
  lchown(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },
  fchown(fd, uid, gid) {
        var stream = FS.getStreamChecked(fd);
        FS.doChown(stream, stream.node, false);
      },
  doTruncate(stream, node, len) {
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, 'w');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.doSetAttr(stream, node, {
          size: len,
          timestamp: Date.now()
        });
      },
  truncate(path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doTruncate(null, node, len);
      },
  ftruncate(fd, len) {
        var stream = FS.getStreamChecked(fd);
        if (len < 0 || (stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.doTruncate(stream, stream.node, len);
      },
  utime(path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var setattr = FS.checkOpExists(node.node_ops.setattr, 63);
        setattr(node, {
          atime: atime,
          mtime: mtime
        });
      },
  open(path, flags, mode = 0o666) {
        if (path === "") {
          throw new FS.ErrnoError(44);
        }
        flags = typeof flags == 'string' ? FS_modeStringToFlags(flags) : flags;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        var isDirPath;
        if (typeof path == 'object') {
          node = path;
        } else {
          isDirPath = path.endsWith("/");
          // noent_okay makes it so that if the final component of the path
          // doesn't exist, lookupPath returns `node: undefined`. `path` will be
          // updated to point to the target of all symlinks.
          var lookup = FS.lookupPath(path, {
            follow: !(flags & 131072),
            noent_okay: true
          });
          node = lookup.node;
          path = lookup.path;
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(20);
            }
          } else if (isDirPath) {
            throw new FS.ErrnoError(31);
          } else {
            // node doesn't exist, try to create it
            // Ignore the permission bits here to ensure we can `open` this new
            // file below. We use chmod below to apply the permissions once the
            // file is open.
            node = FS.mknod(path, mode | 0o777, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // do truncation if necessary
        if ((flags & 512) && !created) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512 | 131072);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        });
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (created) {
          FS.chmod(node, mode & 0o777);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
          }
        }
        return stream;
      },
  close(stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },
  isClosed(stream) {
        return stream.fd === null;
      },
  llseek(stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },
  read(stream, buffer, offset, length, position) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },
  write(stream, buffer, offset, length, position, canOwn) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },
  mmap(stream, length, position, prot, flags) {
        // User requests writing to file (prot & PROT_WRITE != 0).
        // Checking if we have permissions to write to the file unless
        // MAP_PRIVATE flag is set. According to POSIX spec it is possible
        // to write to file opened in read-only mode with MAP_PRIVATE flag,
        // as all modifications will be visible only in the memory of
        // the current process.
        if ((prot & 2) !== 0
            && (flags & 2) === 0
            && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        if (!length) {
          throw new FS.ErrnoError(28);
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },
  msync(stream, buffer, offset, length, mmapFlags) {
        assert(offset >= 0);
        if (!stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },
  ioctl(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },
  readFile(path, opts = {}) {
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          abort(`Invalid encoding type "${opts.encoding}"`);
        }
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          buf = UTF8ArrayToString(buf);
        }
        FS.close(stream);
        return buf;
      },
  writeFile(path, data, opts = {}) {
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data == 'string') {
          data = new Uint8Array(intArrayFromString(data, true));
        }
        if (ArrayBuffer.isView(data)) {
          FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
        } else {
          abort('Unsupported data type');
        }
        FS.close(stream);
      },
  cwd:() => FS.currentPath,
  chdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, 'x');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },
  createDefaultDirectories() {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },
  createDefaultDevices() {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: () => 0,
          write: (stream, buffer, offset, length, pos) => length,
          llseek: () => 0,
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using err() rather than out()
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        // use a buffer to avoid overhead of individual crypto calls per byte
        var randomBuffer = new Uint8Array(1024), randomLeft = 0;
        var randomByte = () => {
          if (randomLeft === 0) {
            randomFill(randomBuffer);
            randomLeft = randomBuffer.byteLength;
          }
          return randomBuffer[--randomLeft];
        };
        FS.createDevice('/dev', 'random', randomByte);
        FS.createDevice('/dev', 'urandom', randomByte);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },
  createSpecialDirectories() {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
        // name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        var proc_self = FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount() {
            var node = FS.createNode(proc_self, 'fd', 16895, 73);
            node.stream_ops = {
              llseek: MEMFS.stream_ops.llseek,
            };
            node.node_ops = {
              lookup(parent, name) {
                var fd = +name;
                var stream = FS.getStreamChecked(fd);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: () => stream.path },
                  id: fd + 1,
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              },
              readdir() {
                return Array.from(FS.streams.entries())
                  .filter(([k, v]) => v)
                  .map(([k, v]) => k.toString());
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },
  createStandardStreams(input, output, error) {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (input) {
          FS.createDevice('/dev', 'stdin', input);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (output) {
          FS.createDevice('/dev', 'stdout', null, output);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (error) {
          FS.createDevice('/dev', 'stderr', null, error);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 0);
        var stdout = FS.open('/dev/stdout', 1);
        var stderr = FS.open('/dev/stderr', 1);
        assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
        assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
        assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
      },
  staticInit() {
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
        };
      },
  init(input, output, error) {
        assert(!FS.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.initialized = true;
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        input ??= Module['stdin'];
        output ??= Module['stdout'];
        error ??= Module['stderr'];
  
        FS.createStandardStreams(input, output, error);
      },
  quit() {
        FS.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        _fflush(0);
        // close all of our streams
        for (var stream of FS.streams) {
          if (stream) {
            FS.close(stream);
          }
        }
      },
  findObject(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (!ret.exists) {
          return null;
        }
        return ret.object;
      },
  analyzePath(path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },
  createPath(parent, path, canRead, canWrite) {
        parent = typeof parent == 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            if (e.errno != 20) throw e;
          }
          parent = current;
        }
        return current;
      },
  createFile(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(canRead, canWrite);
        return FS.create(path, mode);
      },
  createDataFile(parent, name, data, canRead, canWrite, canOwn) {
        var path = name;
        if (parent) {
          parent = typeof parent == 'string' ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS_getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data == 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
      },
  createDevice(parent, name, input, output) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(!!input, !!output);
        FS.createDevice.major ??= 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open(stream) {
            stream.seekable = false;
          },
          close(stream) {
            // flush any pending line data
            if (output?.buffer?.length) {
              output(10);
            }
          },
          read(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.atime = Date.now();
            }
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.mtime = stream.node.ctime = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },
  forceLoadFile(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (globalThis.XMLHttpRequest) {
          abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else { // Command-line.
          try {
            obj.contents = readBinary(obj.url);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
      },
  createLazyFile(parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array).
        // Actual getting is abstracted away for eventual reuse.
        class LazyUint8Array {
          lengthKnown = false;
          chunks = []; // Loaded chunks. Index is the chunk number
          get(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = (idx / this.chunkSize)|0;
            return this.getter(chunkNum)[chunkOffset];
          }
          setDataGetter(getter) {
            this.getter = getter;
          }
          cacheLength() {
            // Find length
            var xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
  
            var chunkSize = 1024*1024; // Chunk size in bytes
  
            if (!hasByteServing) chunkSize = datalength;
  
            // Function to get a range from the remote URL.
            var doXHR = (from, to) => {
              if (from > to) abort("invalid range (" + from + ", " + to + ") or no bytes requested!");
              if (to > datalength-1) abort("only " + datalength + " bytes available! programmer error!");
  
              // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, false);
              if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
              // Some hints to the browser that we want binary data.
              xhr.responseType = 'arraybuffer';
              if (xhr.overrideMimeType) {
                xhr.overrideMimeType('text/plain; charset=x-user-defined');
              }
  
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr.status);
              if (xhr.response !== undefined) {
                return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
              }
              return intArrayFromString(xhr.responseText || '', true);
            };
            var lazyArray = this;
            lazyArray.setDataGetter((chunkNum) => {
              var start = chunkNum * chunkSize;
              var end = (chunkNum+1) * chunkSize - 1; // including this byte
              end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') {
                lazyArray.chunks[chunkNum] = doXHR(start, end);
              }
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') abort('doXHR failed!');
              return lazyArray.chunks[chunkNum];
            });
  
            if (usesGzip || !datalength) {
              // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
              chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
              datalength = this.getter(0).length;
              chunkSize = datalength;
              out("LazyFiles on gzip forces download of the whole file when length is accessed");
            }
  
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true;
          }
          get length() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._length;
          }
          get chunkSize() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._chunkSize;
          }
        }
  
        if (globalThis.XMLHttpRequest) {
          if (!ENVIRONMENT_IS_WORKER) abort('Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc');
          var lazyArray = new LazyUint8Array();
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: function() { return this.contents.length; }
          }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        for (const [key, fn] of Object.entries(node.stream_ops)) {
          stream_ops[key] = (...args) => {
            FS.forceLoadFile(node);
            return fn(...args);
          };
        }
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        }
        // use a custom read function
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position)
        };
        // use a custom mmap function
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(48);
          }
          writeChunks(stream, HEAP8, ptr, length, position);
          return { ptr, allocated: true };
        };
        node.stream_ops = stream_ops;
        return node;
      },
  absolutePath() {
        abort('FS.absolutePath has been removed; use PATH_FS.resolve instead');
      },
  createFolder() {
        abort('FS.createFolder has been removed; use FS.mkdir instead');
      },
  createLink() {
        abort('FS.createLink has been removed; use FS.symlink instead');
      },
  joinPath() {
        abort('FS.joinPath has been removed; use PATH.join instead');
      },
  mmapAlloc() {
        abort('FS.mmapAlloc has been replaced by the top level function mmapAlloc');
      },
  standardizePath() {
        abort('FS.standardizePath has been removed; use PATH.normalize instead');
      },
  };
  
  var SYSCALLS = {
  calculateAt(dirfd, path, allowEmpty) {
        if (PATH.isAbs(path)) {
          return path;
        }
        // relative path
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd();
        } else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44);;
          }
          return dir;
        }
        return dir + '/' + path;
      },
  writeStat(buf, stat) {
        HEAPU32[((buf)>>2)] = stat.dev;
        HEAPU32[(((buf)+(4))>>2)] = stat.mode;
        HEAPU32[(((buf)+(8))>>2)] = stat.nlink;
        HEAPU32[(((buf)+(12))>>2)] = stat.uid;
        HEAPU32[(((buf)+(16))>>2)] = stat.gid;
        HEAPU32[(((buf)+(20))>>2)] = stat.rdev;
        HEAP64[(((buf)+(24))>>3)] = BigInt(stat.size);
        HEAP32[(((buf)+(32))>>2)] = 4096;
        HEAP32[(((buf)+(36))>>2)] = stat.blocks;
        var atime = stat.atime.getTime();
        var mtime = stat.mtime.getTime();
        var ctime = stat.ctime.getTime();
        HEAP64[(((buf)+(40))>>3)] = BigInt(Math.floor(atime / 1000));
        HEAPU32[(((buf)+(48))>>2)] = (atime % 1000) * 1000 * 1000;
        HEAP64[(((buf)+(56))>>3)] = BigInt(Math.floor(mtime / 1000));
        HEAPU32[(((buf)+(64))>>2)] = (mtime % 1000) * 1000 * 1000;
        HEAP64[(((buf)+(72))>>3)] = BigInt(Math.floor(ctime / 1000));
        HEAPU32[(((buf)+(80))>>2)] = (ctime % 1000) * 1000 * 1000;
        HEAP64[(((buf)+(88))>>3)] = BigInt(stat.ino);
        return 0;
      },
  writeStatFs(buf, stats) {
        HEAPU32[(((buf)+(4))>>2)] = stats.bsize;
        HEAPU32[(((buf)+(60))>>2)] = stats.bsize;
        HEAP64[(((buf)+(8))>>3)] = BigInt(stats.blocks);
        HEAP64[(((buf)+(16))>>3)] = BigInt(stats.bfree);
        HEAP64[(((buf)+(24))>>3)] = BigInt(stats.bavail);
        HEAP64[(((buf)+(32))>>3)] = BigInt(stats.files);
        HEAP64[(((buf)+(40))>>3)] = BigInt(stats.ffree);
        HEAPU32[(((buf)+(48))>>2)] = stats.fsid;
        HEAPU32[(((buf)+(64))>>2)] = stats.flags;  // ST_NOSUID
        HEAPU32[(((buf)+(56))>>2)] = stats.namelen;
      },
  doMsync(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (flags & 2) {
          // MAP_PRIVATE calls need not to be synced back to underlying fs
          return 0;
        }
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },
  getStreamFromFD(fd) {
        var stream = FS.getStreamChecked(fd);
        return stream;
      },
  varargs:undefined,
  getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      },
  };
  function ___syscall_fcntl64(fd, cmd, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0: {
          var arg = syscallGetVarargI();
          if (arg < 0) {
            return -28;
          }
          while (FS.streams[arg]) {
            arg++;
          }
          var newStream;
          newStream = FS.dupStream(stream, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;  // FD_CLOEXEC makes no sense for a single process.
        case 3:
          return stream.flags;
        case 4: {
          var arg = syscallGetVarargI();
          stream.flags |= arg;
          return 0;
        }
        case 12: {
          var arg = syscallGetVarargP();
          var offset = 0;
          // We're always unlocked.
          HEAP16[(((arg)+(offset))>>1)] = 2;
          return 0;
        }
        case 13:
        case 14:
          // Pretend that the locking is successful. These are process-level locks,
          // and Emscripten programs are a single process. If we supported linking a
          // filesystem between programs, we'd need to do more here.
          // See https://github.com/emscripten-core/emscripten/issues/23697
          return 0;
      }
      return -28;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  var INT53_MAX = 9007199254740992;
  
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = (num) => (num < INT53_MIN || num > INT53_MAX) ? NaN : Number(num);
  function ___syscall_ftruncate64(fd, length) {
    length = bigintToI53Checked(length);
  
  
  try {
  
      if (isNaN(length)) return -61;
      FS.ftruncate(fd, length);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  ;
  }

  
  function ___syscall_ioctl(fd, op, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21505: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = syscallGetVarargP();
            HEAP32[((argp)>>2)] = termios.c_iflag || 0;
            HEAP32[(((argp)+(4))>>2)] = termios.c_oflag || 0;
            HEAP32[(((argp)+(8))>>2)] = termios.c_cflag || 0;
            HEAP32[(((argp)+(12))>>2)] = termios.c_lflag || 0;
            for (var i = 0; i < 32; i++) {
              HEAP8[(argp + i)+(17)] = termios.c_cc[i] || 0;
            }
            return 0;
          }
          return 0;
        }
        case 21510:
        case 21511:
        case 21512: {
          if (!stream.tty) return -59;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21506:
        case 21507:
        case 21508: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = syscallGetVarargP();
            var c_iflag = HEAP32[((argp)>>2)];
            var c_oflag = HEAP32[(((argp)+(4))>>2)];
            var c_cflag = HEAP32[(((argp)+(8))>>2)];
            var c_lflag = HEAP32[(((argp)+(12))>>2)];
            var c_cc = []
            for (var i = 0; i < 32; i++) {
              c_cc.push(HEAP8[(argp + i)+(17)]);
            }
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
          }
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -59;
          var argp = syscallGetVarargP();
          HEAP32[((argp)>>2)] = 0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -59;
          return -28; // not supported
        }
        case 21537:
        case 21531: {
          var argp = syscallGetVarargP();
          return FS.ioctl(stream, op, argp);
        }
        case 21523: {
          // TODO: in theory we should write to the winsize struct that gets
          // passed in, but for now musl doesn't read anything on it
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = syscallGetVarargP();
            HEAP16[((argp)>>1)] = winsize[0];
            HEAP16[(((argp)+(2))>>1)] = winsize[1];
          }
          return 0;
        }
        case 21524: {
          // TODO: technically, this ioctl call should change the window size.
          // but, since emscripten doesn't have any concept of a terminal window
          // yet, we'll just silently throw it away as we do TIOCGWINSZ
          if (!stream.tty) return -59;
          return 0;
        }
        case 21515: {
          if (!stream.tty) return -59;
          return 0;
        }
        default: return -28; // not supported
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  function ___syscall_mkdirat(dirfd, path, mode) {
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      FS.mkdir(path, mode, 0);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  
  function ___syscall_openat(dirfd, path, flags, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode = varargs ? syscallGetVarargI() : 0;
      return FS.open(path, flags, mode).fd;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  var __abort_js = () =>
      abort('native code called abort()');

  var getExecutableName = () => thisProgram || './this.program';
  
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
      assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
  var __emscripten_get_progname = (str, len) => stringToUTF8(getExecutableName(), str, len);

  var runtimeKeepaliveCounter = 0;
  var __emscripten_runtime_keepalive_clear = () => {
      noExitRuntime = false;
      runtimeKeepaliveCounter = 0;
    };

  
  
  
  
  
  function __mmap_js(len, prot, flags, fd, offset, allocated, addr) {
    offset = bigintToI53Checked(offset);
  
  
  try {
  
      // musl's mmap doesn't allow values over a certain limit
      // see OFF_MASK in mmap.c.
      assert(!isNaN(offset));
      var stream = SYSCALLS.getStreamFromFD(fd);
      var res = FS.mmap(stream, len, offset, prot, flags);
      var ptr = res.ptr;
      HEAP32[((allocated)>>2)] = res.allocated;
      HEAPU32[((addr)>>2)] = ptr;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  ;
  }

  
  function __munmap_js(addr, len, prot, flags, fd, offset) {
    offset = bigintToI53Checked(offset);
  
  
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      if (prot & 2) {
        SYSCALLS.doMsync(addr, stream, len, flags, offset);
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  ;
  }

  var timers = {
  };
  
  var handleException = (e) => {
      // Certain exception types we do not treat as errors since they are used for
      // internal control flow.
      // 1. ExitStatus, which is thrown by exit()
      // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
      //    that wish to return to JS event loop.
      if (e instanceof ExitStatus || e == 'unwind') {
        return EXITSTATUS;
      }
      checkStackCookie();
      if (e instanceof WebAssembly.RuntimeError) {
        if (_emscripten_stack_get_current() <= 0) {
          err('Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)');
        }
      }
      quit_(1, e);
    };
  
  
  var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
  var _proc_exit = (code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        Module['onExit']?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
  
  
  /** @param {boolean|number=} implicit */
  var exitJS = (status, implicit) => {
      EXITSTATUS = status;
  
      checkUnflushedContent();
  
      // if exit() was called explicitly, warn the user if the runtime isn't actually being shut down
      if (keepRuntimeAlive() && !implicit) {
        var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
        err(msg);
      }
  
      _proc_exit(status);
    };
  var _exit = exitJS;
  
  
  var maybeExit = () => {
      if (!keepRuntimeAlive()) {
        try {
          _exit(EXITSTATUS);
        } catch (e) {
          handleException(e);
        }
      }
    };
  var callUserCallback = (func) => {
      if (ABORT) {
        err('user callback triggered after runtime exited or application aborted.  Ignoring.');
        return;
      }
      try {
        func();
        maybeExit();
      } catch (e) {
        handleException(e);
      }
    };
  
  
  var _emscripten_get_now = () => performance.now();
  var __setitimer_js = (which, timeout_ms) => {
      // First, clear any existing timer.
      if (timers[which]) {
        clearTimeout(timers[which].id);
        delete timers[which];
      }
  
      // A timeout of zero simply cancels the current timeout so we have nothing
      // more to do.
      if (!timeout_ms) return 0;
  
      var id = setTimeout(() => {
        assert(which in timers);
        delete timers[which];
        callUserCallback(() => __emscripten_timeout(which, _emscripten_get_now()));
      }, timeout_ms);
      timers[which] = { id, timeout_ms };
      return 0;
    };

  
  var __tzset_js = (timezone, daylight, std_name, dst_name) => {
      // TODO: Use (malleable) environment variables instead of system settings.
      var currentYear = new Date().getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
  
      // Local standard timezone offset. Local standard time is not adjusted for
      // daylight savings.  This code uses the fact that getTimezoneOffset returns
      // a greater value during Standard Time versus Daylight Saving Time (DST).
      // Thus it determines the expected output during Standard Time, and it
      // compares whether the output of the given date the same (Standard) or less
      // (DST).
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
  
      // timezone is specified as seconds west of UTC ("The external variable
      // `timezone` shall be set to the difference, in seconds, between
      // Coordinated Universal Time (UTC) and local standard time."), the same
      // as returned by stdTimezoneOffset.
      // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
      HEAPU32[((timezone)>>2)] = stdTimezoneOffset * 60;
  
      HEAP32[((daylight)>>2)] = Number(winterOffset != summerOffset);
  
      var extractZone = (timezoneOffset) => {
        // Why inverse sign?
        // Read here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
        var sign = timezoneOffset >= 0 ? "-" : "+";
  
        var absOffset = Math.abs(timezoneOffset)
        var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
        var minutes = String(absOffset % 60).padStart(2, "0");
  
        return `UTC${sign}${hours}${minutes}`;
      }
  
      var winterName = extractZone(winterOffset);
      var summerName = extractZone(summerOffset);
      assert(winterName);
      assert(summerName);
      assert(lengthBytesUTF8(winterName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${winterName})`);
      assert(lengthBytesUTF8(summerName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${summerName})`);
      if (summerOffset < winterOffset) {
        // Northern hemisphere
        stringToUTF8(winterName, std_name, 17);
        stringToUTF8(summerName, dst_name, 17);
      } else {
        stringToUTF8(winterName, dst_name, 17);
        stringToUTF8(summerName, std_name, 17);
      }
    };

  var abortOnCannotGrowMemory = (requestedSize) => {
      abort(`Cannot enlarge memory arrays to size ${requestedSize} bytes (OOM). Either (1) compile with -sINITIAL_MEMORY=X with X higher than the current value ${HEAP8.length}, (2) compile with -sALLOW_MEMORY_GROWTH which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with -sABORTING_MALLOC=0`);
    };
  var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      requestedSize >>>= 0;
      abortOnCannotGrowMemory(requestedSize);
    };

  var ENV = {
  };
  
  var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        // Default values.
        // Browser language detection #8751
        var lang = (globalThis.navigator?.language ?? 'C').replace('-', '_') + '.UTF-8';
        var env = {
          'USER': 'web_user',
          'LOGNAME': 'web_user',
          'PATH': '/',
          'PWD': '/',
          'HOME': '/home/web_user',
          'LANG': lang,
          '_': getExecutableName()
        };
        // Apply the user-provided values, if any.
        for (var x in ENV) {
          // x is a key in ENV; if ENV[x] is undefined, that means it was
          // explicitly set to be so. We allow user code to do that to
          // force variables with default values to remain unset.
          if (ENV[x] === undefined) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(`${x}=${env[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
  
  var _environ_get = (__environ, environ_buf) => {
      var bufSize = 0;
      var envp = 0;
      for (var string of getEnvStrings()) {
        var ptr = environ_buf + bufSize;
        HEAPU32[(((__environ)+(envp))>>2)] = ptr;
        bufSize += stringToUTF8(string, ptr, Infinity) + 1;
        envp += 4;
      }
      return 0;
    };

  
  var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[((penviron_count)>>2)] = strings.length;
      var bufSize = 0;
      for (var string of strings) {
        bufSize += lengthBytesUTF8(string) + 1;
      }
      HEAPU32[((penviron_buf_size)>>2)] = bufSize;
      return 0;
    };

  function _fd_close(fd) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  /** @param {number=} offset */
  var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break; // nothing more to read
        if (typeof offset != 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  function _fd_read(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doReadv(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  
  function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
  
  
  try {
  
      if (isNaN(offset)) return 61;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      HEAP64[((newOffset)>>3)] = BigInt(stream.position);
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  ;
  }

  /** @param {number=} offset */
  var doWritev = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) {
          // No more space to write.
          break;
        }
        if (typeof offset != 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  function _fd_write(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }




  var getCFunc = (ident) => {
      var func = Module['_' + ident]; // closure exported function
      assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
      return func;
    };
  
  var writeArrayToMemory = (array, buffer) => {
      assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
      HEAP8.set(array, buffer);
    };
  
  
  
  var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
  var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };
  
  
  
  
  
    /**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Array=} args
     * @param {Object=} opts
     */
  var ccall = (ident, returnType, argTypes, args, opts) => {
      // For fast lookup of conversion functions
      var toC = {
        'string': (str) => {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) { // null string
            ret = stringToUTF8OnStack(str);
          }
          return ret;
        },
        'array': (arr) => {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };
  
      function convertReturnValue(ret) {
        if (returnType === 'string') {
          return UTF8ToString(ret);
        }
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }
  
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== 'array', 'Return type should not be "array".');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func(...cArgs);
      function onDone(ret) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret);
      }
  
      ret = onDone(ret);
      return ret;
    };
  
    /**
     * @param {string=} returnType
     * @param {Array=} argTypes
     * @param {Object=} opts
     */
  var cwrap = (ident, returnType, argTypes, opts) => {
      return (...args) => ccall(ident, returnType, argTypes, args, opts);
    };







  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.preloadFile = FS_preloadFile;
  FS.staticInit();;
// End JS library code

// include: postlibrary.js
// This file is included after the automatically-generated JS library code
// but before the wasm module is created.

{

  // Begin ATMODULES hooks
  if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];
if (Module['preloadPlugins']) preloadPlugins = Module['preloadPlugins'];
if (Module['print']) out = Module['print'];
if (Module['printErr']) err = Module['printErr'];
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];
  // End ATMODULES hooks

  checkIncomingModuleAPI();

  if (Module['arguments']) arguments_ = Module['arguments'];
  if (Module['thisProgram']) thisProgram = Module['thisProgram'];

  // Assertions on removed incoming Module JS APIs.
  assert(typeof Module['memoryInitializerPrefixURL'] == 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['pthreadMainPrefixURL'] == 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['cdInitializerPrefixURL'] == 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['filePackagePrefixURL'] == 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['read'] == 'undefined', 'Module.read option was removed');
  assert(typeof Module['readAsync'] == 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
  assert(typeof Module['readBinary'] == 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
  assert(typeof Module['setWindowTitle'] == 'undefined', 'Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)');
  assert(typeof Module['TOTAL_MEMORY'] == 'undefined', 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY');
  assert(typeof Module['ENVIRONMENT'] == 'undefined', 'Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)');
  assert(typeof Module['STACK_SIZE'] == 'undefined', 'STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time')
  // If memory is defined in wasm, the user can't provide it, or set INITIAL_MEMORY
  assert(typeof Module['wasmMemory'] == 'undefined', 'Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally');
  assert(typeof Module['INITIAL_MEMORY'] == 'undefined', 'Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically');

  if (Module['preInit']) {
    if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
    while (Module['preInit'].length > 0) {
      Module['preInit'].shift()();
    }
  }
  consumedModuleProp('preInit');
}

// Begin runtime exports
  Module['ccall'] = ccall;
  Module['cwrap'] = cwrap;
  // End runtime exports
  // Begin JS library exports
  Module['ExitStatus'] = ExitStatus;
  Module['addOnPostRun'] = addOnPostRun;
  Module['onPostRuns'] = onPostRuns;
  Module['callRuntimeCallbacks'] = callRuntimeCallbacks;
  Module['addOnPreRun'] = addOnPreRun;
  Module['onPreRuns'] = onPreRuns;
  Module['addRunDependency'] = addRunDependency;
  Module['runDependencies'] = runDependencies;
  Module['removeRunDependency'] = removeRunDependency;
  Module['dependenciesFulfilled'] = dependenciesFulfilled;
  Module['runDependencyTracking'] = runDependencyTracking;
  Module['runDependencyWatcher'] = runDependencyWatcher;
  Module['getValue'] = getValue;
  Module['noExitRuntime'] = noExitRuntime;
  Module['ptrToString'] = ptrToString;
  Module['setValue'] = setValue;
  Module['stackRestore'] = stackRestore;
  Module['stackSave'] = stackSave;
  Module['warnOnce'] = warnOnce;
  Module['___call_sighandler'] = ___call_sighandler;
  Module['getWasmTableEntry'] = getWasmTableEntry;
  Module['wasmTableMirror'] = wasmTableMirror;
  Module['___syscall_fcntl64'] = ___syscall_fcntl64;
  Module['syscallGetVarargP'] = syscallGetVarargP;
  Module['syscallGetVarargI'] = syscallGetVarargI;
  Module['SYSCALLS'] = SYSCALLS;
  Module['PATH'] = PATH;
  Module['FS'] = FS;
  Module['randomFill'] = randomFill;
  Module['initRandomFill'] = initRandomFill;
  Module['PATH_FS'] = PATH_FS;
  Module['TTY'] = TTY;
  Module['UTF8ArrayToString'] = UTF8ArrayToString;
  Module['UTF8Decoder'] = UTF8Decoder;
  Module['findStringEnd'] = findStringEnd;
  Module['FS_stdin_getChar'] = FS_stdin_getChar;
  Module['FS_stdin_getChar_buffer'] = FS_stdin_getChar_buffer;
  Module['intArrayFromString'] = intArrayFromString;
  Module['lengthBytesUTF8'] = lengthBytesUTF8;
  Module['stringToUTF8Array'] = stringToUTF8Array;
  Module['MEMFS'] = MEMFS;
  Module['mmapAlloc'] = mmapAlloc;
  Module['zeroMemory'] = zeroMemory;
  Module['alignMemory'] = alignMemory;
  Module['FS_modeStringToFlags'] = FS_modeStringToFlags;
  Module['FS_getMode'] = FS_getMode;
  Module['strError'] = strError;
  Module['UTF8ToString'] = UTF8ToString;
  Module['ERRNO_CODES'] = ERRNO_CODES;
  Module['FS_createPreloadedFile'] = FS_createPreloadedFile;
  Module['FS_preloadFile'] = FS_preloadFile;
  Module['asyncLoad'] = asyncLoad;
  Module['FS_createDataFile'] = FS_createDataFile;
  Module['getUniqueRunDependency'] = getUniqueRunDependency;
  Module['FS_handledByPreloadPlugin'] = FS_handledByPreloadPlugin;
  Module['preloadPlugins'] = preloadPlugins;
  Module['___syscall_ftruncate64'] = ___syscall_ftruncate64;
  Module['bigintToI53Checked'] = bigintToI53Checked;
  Module['INT53_MAX'] = INT53_MAX;
  Module['INT53_MIN'] = INT53_MIN;
  Module['___syscall_ioctl'] = ___syscall_ioctl;
  Module['___syscall_mkdirat'] = ___syscall_mkdirat;
  Module['___syscall_openat'] = ___syscall_openat;
  Module['__abort_js'] = __abort_js;
  Module['__emscripten_get_progname'] = __emscripten_get_progname;
  Module['getExecutableName'] = getExecutableName;
  Module['stringToUTF8'] = stringToUTF8;
  Module['__emscripten_runtime_keepalive_clear'] = __emscripten_runtime_keepalive_clear;
  Module['runtimeKeepaliveCounter'] = runtimeKeepaliveCounter;
  Module['__mmap_js'] = __mmap_js;
  Module['__munmap_js'] = __munmap_js;
  Module['__setitimer_js'] = __setitimer_js;
  Module['timers'] = timers;
  Module['callUserCallback'] = callUserCallback;
  Module['handleException'] = handleException;
  Module['maybeExit'] = maybeExit;
  Module['_exit'] = _exit;
  Module['exitJS'] = exitJS;
  Module['_proc_exit'] = _proc_exit;
  Module['keepRuntimeAlive'] = keepRuntimeAlive;
  Module['_emscripten_get_now'] = _emscripten_get_now;
  Module['__tzset_js'] = __tzset_js;
  Module['_emscripten_resize_heap'] = _emscripten_resize_heap;
  Module['abortOnCannotGrowMemory'] = abortOnCannotGrowMemory;
  Module['_environ_get'] = _environ_get;
  Module['getEnvStrings'] = getEnvStrings;
  Module['ENV'] = ENV;
  Module['_environ_sizes_get'] = _environ_sizes_get;
  Module['_fd_close'] = _fd_close;
  Module['_fd_read'] = _fd_read;
  Module['doReadv'] = doReadv;
  Module['_fd_seek'] = _fd_seek;
  Module['_fd_write'] = _fd_write;
  Module['doWritev'] = doWritev;
  Module['cwrap'] = cwrap;
  Module['ccall'] = ccall;
  Module['getCFunc'] = getCFunc;
  Module['writeArrayToMemory'] = writeArrayToMemory;
  Module['stringToUTF8OnStack'] = stringToUTF8OnStack;
  Module['stackAlloc'] = stackAlloc;
  // End JS library exports

// end include: postlibrary.js

function checkIncomingModuleAPI() {
  ignoredModuleProp('fetchSettings');
}

// Imports from the Wasm binary.
var __Z6squarei = Module['__Z6squarei'] = makeInvalidEarlyAccess('__Z6squarei');
var ___original_main = Module['___original_main'] = makeInvalidEarlyAccess('___original_main');
var _main = Module['_main'] = makeInvalidEarlyAccess('_main');
var _malloc = Module['_malloc'] = makeInvalidEarlyAccess('_malloc');
var _free = Module['_free'] = makeInvalidEarlyAccess('_free');
var _emscripten_stack_get_end = Module['_emscripten_stack_get_end'] = makeInvalidEarlyAccess('_emscripten_stack_get_end');
var _emscripten_stack_get_base = Module['_emscripten_stack_get_base'] = makeInvalidEarlyAccess('_emscripten_stack_get_base');
var _memcpy = Module['_memcpy'] = makeInvalidEarlyAccess('_memcpy');
var _memcmp = Module['_memcmp'] = makeInvalidEarlyAccess('_memcmp');
var __emscripten_memcpy_bulkmem = Module['__emscripten_memcpy_bulkmem'] = makeInvalidEarlyAccess('__emscripten_memcpy_bulkmem');
var __emscripten_memset_bulkmem = Module['__emscripten_memset_bulkmem'] = makeInvalidEarlyAccess('__emscripten_memset_bulkmem');
var _emscripten_builtin_memalign = Module['_emscripten_builtin_memalign'] = makeInvalidEarlyAccess('_emscripten_builtin_memalign');
var _emscripten_stack_get_current = Module['_emscripten_stack_get_current'] = makeInvalidEarlyAccess('_emscripten_stack_get_current');
var _fflush = Module['_fflush'] = makeInvalidEarlyAccess('_fflush');
var _calloc = Module['_calloc'] = makeInvalidEarlyAccess('_calloc');
var _fileno = Module['_fileno'] = makeInvalidEarlyAccess('_fileno');
var _realloc = Module['_realloc'] = makeInvalidEarlyAccess('_realloc');
var _htons = Module['_htons'] = makeInvalidEarlyAccess('_htons');
var _ntohs = Module['_ntohs'] = makeInvalidEarlyAccess('_ntohs');
var _htonl = Module['_htonl'] = makeInvalidEarlyAccess('_htonl');
var _strerror = Module['_strerror'] = makeInvalidEarlyAccess('_strerror');
var __emscripten_timeout = Module['__emscripten_timeout'] = makeInvalidEarlyAccess('__emscripten_timeout');
var _setThrew = Module['_setThrew'] = makeInvalidEarlyAccess('_setThrew');
var __emscripten_tempret_set = Module['__emscripten_tempret_set'] = makeInvalidEarlyAccess('__emscripten_tempret_set');
var __emscripten_tempret_get = Module['__emscripten_tempret_get'] = makeInvalidEarlyAccess('__emscripten_tempret_get');
var ___get_temp_ret = Module['___get_temp_ret'] = makeInvalidEarlyAccess('___get_temp_ret');
var ___set_temp_ret = Module['___set_temp_ret'] = makeInvalidEarlyAccess('___set_temp_ret');
var _getTempRet0 = Module['_getTempRet0'] = makeInvalidEarlyAccess('_getTempRet0');
var _setTempRet0 = Module['_setTempRet0'] = makeInvalidEarlyAccess('_setTempRet0');
var ___emutls_get_address = Module['___emutls_get_address'] = makeInvalidEarlyAccess('___emutls_get_address');
var _emscripten_stack_init = Module['_emscripten_stack_init'] = makeInvalidEarlyAccess('_emscripten_stack_init');
var _emscripten_stack_set_limits = Module['_emscripten_stack_set_limits'] = makeInvalidEarlyAccess('_emscripten_stack_set_limits');
var _emscripten_stack_get_free = Module['_emscripten_stack_get_free'] = makeInvalidEarlyAccess('_emscripten_stack_get_free');
var __emscripten_stack_restore = Module['__emscripten_stack_restore'] = makeInvalidEarlyAccess('__emscripten_stack_restore');
var __emscripten_stack_alloc = Module['__emscripten_stack_alloc'] = makeInvalidEarlyAccess('__emscripten_stack_alloc');
var __ZNSt8bad_castD2Ev = Module['__ZNSt8bad_castD2Ev'] = makeInvalidEarlyAccess('__ZNSt8bad_castD2Ev');
var __ZdlPvm = Module['__ZdlPvm'] = makeInvalidEarlyAccess('__ZdlPvm');
var __Znwm = Module['__Znwm'] = makeInvalidEarlyAccess('__Znwm');
var __ZnamSt11align_val_t = Module['__ZnamSt11align_val_t'] = makeInvalidEarlyAccess('__ZnamSt11align_val_t');
var __ZdaPvSt11align_val_t = Module['__ZdaPvSt11align_val_t'] = makeInvalidEarlyAccess('__ZdaPvSt11align_val_t');
var __ZNSt13runtime_errorD2Ev = Module['__ZNSt13runtime_errorD2Ev'] = makeInvalidEarlyAccess('__ZNSt13runtime_errorD2Ev');
var __ZNKSt13runtime_error4whatEv = Module['__ZNKSt13runtime_error4whatEv'] = makeInvalidEarlyAccess('__ZNKSt13runtime_error4whatEv');
var __ZnwmSt11align_val_t = Module['__ZnwmSt11align_val_t'] = makeInvalidEarlyAccess('__ZnwmSt11align_val_t');
var __ZdlPvmSt11align_val_t = Module['__ZdlPvmSt11align_val_t'] = makeInvalidEarlyAccess('__ZdlPvmSt11align_val_t');
var ___cxa_pure_virtual = Module['___cxa_pure_virtual'] = makeInvalidEarlyAccess('___cxa_pure_virtual');
var ___cxa_uncaught_exceptions = Module['___cxa_uncaught_exceptions'] = makeInvalidEarlyAccess('___cxa_uncaught_exceptions');
var ___cxa_decrement_exception_refcount = Module['___cxa_decrement_exception_refcount'] = makeInvalidEarlyAccess('___cxa_decrement_exception_refcount');
var ___cxa_increment_exception_refcount = Module['___cxa_increment_exception_refcount'] = makeInvalidEarlyAccess('___cxa_increment_exception_refcount');
var ___cxa_current_primary_exception = Module['___cxa_current_primary_exception'] = makeInvalidEarlyAccess('___cxa_current_primary_exception');
var __ZSt9terminatev = Module['__ZSt9terminatev'] = makeInvalidEarlyAccess('__ZSt9terminatev');
var ___cxa_rethrow_primary_exception = Module['___cxa_rethrow_primary_exception'] = makeInvalidEarlyAccess('___cxa_rethrow_primary_exception');
var __ZNSt9exceptionD2Ev = Module['__ZNSt9exceptionD2Ev'] = makeInvalidEarlyAccess('__ZNSt9exceptionD2Ev');
var __ZNSt11logic_errorD2Ev = Module['__ZNSt11logic_errorD2Ev'] = makeInvalidEarlyAccess('__ZNSt11logic_errorD2Ev');
var __ZNKSt11logic_error4whatEv = Module['__ZNKSt11logic_error4whatEv'] = makeInvalidEarlyAccess('__ZNKSt11logic_error4whatEv');
var __ZdaPv = Module['__ZdaPv'] = makeInvalidEarlyAccess('__ZdaPv');
var __Znam = Module['__Znam'] = makeInvalidEarlyAccess('__Znam');
var __ZSt15get_new_handlerv = Module['__ZSt15get_new_handlerv'] = makeInvalidEarlyAccess('__ZSt15get_new_handlerv');
var __ZdlPv = Module['__ZdlPv'] = makeInvalidEarlyAccess('__ZdlPv');
var __ZdaPvm = Module['__ZdaPvm'] = makeInvalidEarlyAccess('__ZdaPvm');
var __ZdlPvSt11align_val_t = Module['__ZdlPvSt11align_val_t'] = makeInvalidEarlyAccess('__ZdlPvSt11align_val_t');
var __ZdaPvmSt11align_val_t = Module['__ZdaPvmSt11align_val_t'] = makeInvalidEarlyAccess('__ZdaPvmSt11align_val_t');
var ___dynamic_cast = Module['___dynamic_cast'] = makeInvalidEarlyAccess('___dynamic_cast');
var ___cxa_bad_cast = Module['___cxa_bad_cast'] = makeInvalidEarlyAccess('___cxa_bad_cast');
var ___cxa_bad_typeid = Module['___cxa_bad_typeid'] = makeInvalidEarlyAccess('___cxa_bad_typeid');
var ___cxa_throw_bad_array_new_length = Module['___cxa_throw_bad_array_new_length'] = makeInvalidEarlyAccess('___cxa_throw_bad_array_new_length');
var __ZSt14set_unexpectedPFvvE = Module['__ZSt14set_unexpectedPFvvE'] = makeInvalidEarlyAccess('__ZSt14set_unexpectedPFvvE');
var __ZSt13set_terminatePFvvE = Module['__ZSt13set_terminatePFvvE'] = makeInvalidEarlyAccess('__ZSt13set_terminatePFvvE');
var __ZSt15set_new_handlerPFvvE = Module['__ZSt15set_new_handlerPFvvE'] = makeInvalidEarlyAccess('__ZSt15set_new_handlerPFvvE');
var ___cxa_demangle = Module['___cxa_demangle'] = makeInvalidEarlyAccess('___cxa_demangle');
var ___cxa_guard_acquire = Module['___cxa_guard_acquire'] = makeInvalidEarlyAccess('___cxa_guard_acquire');
var ___cxa_guard_release = Module['___cxa_guard_release'] = makeInvalidEarlyAccess('___cxa_guard_release');
var ___cxa_guard_abort = Module['___cxa_guard_abort'] = makeInvalidEarlyAccess('___cxa_guard_abort');
var __ZSt14get_unexpectedv = Module['__ZSt14get_unexpectedv'] = makeInvalidEarlyAccess('__ZSt14get_unexpectedv');
var __ZSt10unexpectedv = Module['__ZSt10unexpectedv'] = makeInvalidEarlyAccess('__ZSt10unexpectedv');
var __ZSt13get_terminatev = Module['__ZSt13get_terminatev'] = makeInvalidEarlyAccess('__ZSt13get_terminatev');
var ___cxa_uncaught_exception = Module['___cxa_uncaught_exception'] = makeInvalidEarlyAccess('___cxa_uncaught_exception');
var ___cxa_allocate_exception = Module['___cxa_allocate_exception'] = makeInvalidEarlyAccess('___cxa_allocate_exception');
var ___cxa_free_exception = Module['___cxa_free_exception'] = makeInvalidEarlyAccess('___cxa_free_exception');
var ___cxa_init_primary_exception = Module['___cxa_init_primary_exception'] = makeInvalidEarlyAccess('___cxa_init_primary_exception');
var ___cxa_thread_atexit = Module['___cxa_thread_atexit'] = makeInvalidEarlyAccess('___cxa_thread_atexit');
var ___cxa_deleted_virtual = Module['___cxa_deleted_virtual'] = makeInvalidEarlyAccess('___cxa_deleted_virtual');
var __ZNSt9type_infoD2Ev = Module['__ZNSt9type_infoD2Ev'] = makeInvalidEarlyAccess('__ZNSt9type_infoD2Ev');
var ___cxa_can_catch = Module['___cxa_can_catch'] = makeInvalidEarlyAccess('___cxa_can_catch');
var ___cxa_get_exception_ptr = Module['___cxa_get_exception_ptr'] = makeInvalidEarlyAccess('___cxa_get_exception_ptr');
var __ZNSt9exceptionD0Ev = Module['__ZNSt9exceptionD0Ev'] = makeInvalidEarlyAccess('__ZNSt9exceptionD0Ev');
var __ZNSt9exceptionD1Ev = Module['__ZNSt9exceptionD1Ev'] = makeInvalidEarlyAccess('__ZNSt9exceptionD1Ev');
var __ZNKSt9exception4whatEv = Module['__ZNKSt9exception4whatEv'] = makeInvalidEarlyAccess('__ZNKSt9exception4whatEv');
var __ZNSt13bad_exceptionD0Ev = Module['__ZNSt13bad_exceptionD0Ev'] = makeInvalidEarlyAccess('__ZNSt13bad_exceptionD0Ev');
var __ZNSt13bad_exceptionD1Ev = Module['__ZNSt13bad_exceptionD1Ev'] = makeInvalidEarlyAccess('__ZNSt13bad_exceptionD1Ev');
var __ZNKSt13bad_exception4whatEv = Module['__ZNKSt13bad_exception4whatEv'] = makeInvalidEarlyAccess('__ZNKSt13bad_exception4whatEv');
var __ZNSt9bad_allocC2Ev = Module['__ZNSt9bad_allocC2Ev'] = makeInvalidEarlyAccess('__ZNSt9bad_allocC2Ev');
var __ZNSt9bad_allocD0Ev = Module['__ZNSt9bad_allocD0Ev'] = makeInvalidEarlyAccess('__ZNSt9bad_allocD0Ev');
var __ZNSt9bad_allocD1Ev = Module['__ZNSt9bad_allocD1Ev'] = makeInvalidEarlyAccess('__ZNSt9bad_allocD1Ev');
var __ZNKSt9bad_alloc4whatEv = Module['__ZNKSt9bad_alloc4whatEv'] = makeInvalidEarlyAccess('__ZNKSt9bad_alloc4whatEv');
var __ZNSt20bad_array_new_lengthC2Ev = Module['__ZNSt20bad_array_new_lengthC2Ev'] = makeInvalidEarlyAccess('__ZNSt20bad_array_new_lengthC2Ev');
var __ZNSt20bad_array_new_lengthD0Ev = Module['__ZNSt20bad_array_new_lengthD0Ev'] = makeInvalidEarlyAccess('__ZNSt20bad_array_new_lengthD0Ev');
var __ZNSt20bad_array_new_lengthD1Ev = Module['__ZNSt20bad_array_new_lengthD1Ev'] = makeInvalidEarlyAccess('__ZNSt20bad_array_new_lengthD1Ev');
var __ZNKSt20bad_array_new_length4whatEv = Module['__ZNKSt20bad_array_new_length4whatEv'] = makeInvalidEarlyAccess('__ZNKSt20bad_array_new_length4whatEv');
var __ZNSt13bad_exceptionD2Ev = Module['__ZNSt13bad_exceptionD2Ev'] = makeInvalidEarlyAccess('__ZNSt13bad_exceptionD2Ev');
var __ZNSt9bad_allocC1Ev = Module['__ZNSt9bad_allocC1Ev'] = makeInvalidEarlyAccess('__ZNSt9bad_allocC1Ev');
var __ZNSt9bad_allocD2Ev = Module['__ZNSt9bad_allocD2Ev'] = makeInvalidEarlyAccess('__ZNSt9bad_allocD2Ev');
var __ZNSt20bad_array_new_lengthC1Ev = Module['__ZNSt20bad_array_new_lengthC1Ev'] = makeInvalidEarlyAccess('__ZNSt20bad_array_new_lengthC1Ev');
var __ZNSt20bad_array_new_lengthD2Ev = Module['__ZNSt20bad_array_new_lengthD2Ev'] = makeInvalidEarlyAccess('__ZNSt20bad_array_new_lengthD2Ev');
var __ZNSt11logic_errorD0Ev = Module['__ZNSt11logic_errorD0Ev'] = makeInvalidEarlyAccess('__ZNSt11logic_errorD0Ev');
var __ZNSt11logic_errorD1Ev = Module['__ZNSt11logic_errorD1Ev'] = makeInvalidEarlyAccess('__ZNSt11logic_errorD1Ev');
var __ZNSt13runtime_errorD0Ev = Module['__ZNSt13runtime_errorD0Ev'] = makeInvalidEarlyAccess('__ZNSt13runtime_errorD0Ev');
var __ZNSt13runtime_errorD1Ev = Module['__ZNSt13runtime_errorD1Ev'] = makeInvalidEarlyAccess('__ZNSt13runtime_errorD1Ev');
var __ZNSt12domain_errorD0Ev = Module['__ZNSt12domain_errorD0Ev'] = makeInvalidEarlyAccess('__ZNSt12domain_errorD0Ev');
var __ZNSt12domain_errorD1Ev = Module['__ZNSt12domain_errorD1Ev'] = makeInvalidEarlyAccess('__ZNSt12domain_errorD1Ev');
var __ZNSt16invalid_argumentD0Ev = Module['__ZNSt16invalid_argumentD0Ev'] = makeInvalidEarlyAccess('__ZNSt16invalid_argumentD0Ev');
var __ZNSt16invalid_argumentD1Ev = Module['__ZNSt16invalid_argumentD1Ev'] = makeInvalidEarlyAccess('__ZNSt16invalid_argumentD1Ev');
var __ZNSt12length_errorD0Ev = Module['__ZNSt12length_errorD0Ev'] = makeInvalidEarlyAccess('__ZNSt12length_errorD0Ev');
var __ZNSt12length_errorD1Ev = Module['__ZNSt12length_errorD1Ev'] = makeInvalidEarlyAccess('__ZNSt12length_errorD1Ev');
var __ZNSt12out_of_rangeD0Ev = Module['__ZNSt12out_of_rangeD0Ev'] = makeInvalidEarlyAccess('__ZNSt12out_of_rangeD0Ev');
var __ZNSt12out_of_rangeD1Ev = Module['__ZNSt12out_of_rangeD1Ev'] = makeInvalidEarlyAccess('__ZNSt12out_of_rangeD1Ev');
var __ZNSt11range_errorD0Ev = Module['__ZNSt11range_errorD0Ev'] = makeInvalidEarlyAccess('__ZNSt11range_errorD0Ev');
var __ZNSt11range_errorD1Ev = Module['__ZNSt11range_errorD1Ev'] = makeInvalidEarlyAccess('__ZNSt11range_errorD1Ev');
var __ZNSt14overflow_errorD0Ev = Module['__ZNSt14overflow_errorD0Ev'] = makeInvalidEarlyAccess('__ZNSt14overflow_errorD0Ev');
var __ZNSt14overflow_errorD1Ev = Module['__ZNSt14overflow_errorD1Ev'] = makeInvalidEarlyAccess('__ZNSt14overflow_errorD1Ev');
var __ZNSt15underflow_errorD0Ev = Module['__ZNSt15underflow_errorD0Ev'] = makeInvalidEarlyAccess('__ZNSt15underflow_errorD0Ev');
var __ZNSt15underflow_errorD1Ev = Module['__ZNSt15underflow_errorD1Ev'] = makeInvalidEarlyAccess('__ZNSt15underflow_errorD1Ev');
var __ZNSt12domain_errorD2Ev = Module['__ZNSt12domain_errorD2Ev'] = makeInvalidEarlyAccess('__ZNSt12domain_errorD2Ev');
var __ZNSt16invalid_argumentD2Ev = Module['__ZNSt16invalid_argumentD2Ev'] = makeInvalidEarlyAccess('__ZNSt16invalid_argumentD2Ev');
var __ZNSt12length_errorD2Ev = Module['__ZNSt12length_errorD2Ev'] = makeInvalidEarlyAccess('__ZNSt12length_errorD2Ev');
var __ZNSt12out_of_rangeD2Ev = Module['__ZNSt12out_of_rangeD2Ev'] = makeInvalidEarlyAccess('__ZNSt12out_of_rangeD2Ev');
var __ZNSt11range_errorD2Ev = Module['__ZNSt11range_errorD2Ev'] = makeInvalidEarlyAccess('__ZNSt11range_errorD2Ev');
var __ZNSt14overflow_errorD2Ev = Module['__ZNSt14overflow_errorD2Ev'] = makeInvalidEarlyAccess('__ZNSt14overflow_errorD2Ev');
var __ZNSt15underflow_errorD2Ev = Module['__ZNSt15underflow_errorD2Ev'] = makeInvalidEarlyAccess('__ZNSt15underflow_errorD2Ev');
var __ZNSt9type_infoD0Ev = Module['__ZNSt9type_infoD0Ev'] = makeInvalidEarlyAccess('__ZNSt9type_infoD0Ev');
var __ZNSt9type_infoD1Ev = Module['__ZNSt9type_infoD1Ev'] = makeInvalidEarlyAccess('__ZNSt9type_infoD1Ev');
var __ZNSt8bad_castC2Ev = Module['__ZNSt8bad_castC2Ev'] = makeInvalidEarlyAccess('__ZNSt8bad_castC2Ev');
var __ZNSt8bad_castD0Ev = Module['__ZNSt8bad_castD0Ev'] = makeInvalidEarlyAccess('__ZNSt8bad_castD0Ev');
var __ZNSt8bad_castD1Ev = Module['__ZNSt8bad_castD1Ev'] = makeInvalidEarlyAccess('__ZNSt8bad_castD1Ev');
var __ZNKSt8bad_cast4whatEv = Module['__ZNKSt8bad_cast4whatEv'] = makeInvalidEarlyAccess('__ZNKSt8bad_cast4whatEv');
var __ZNSt10bad_typeidC2Ev = Module['__ZNSt10bad_typeidC2Ev'] = makeInvalidEarlyAccess('__ZNSt10bad_typeidC2Ev');
var __ZNSt10bad_typeidD2Ev = Module['__ZNSt10bad_typeidD2Ev'] = makeInvalidEarlyAccess('__ZNSt10bad_typeidD2Ev');
var __ZNSt10bad_typeidD0Ev = Module['__ZNSt10bad_typeidD0Ev'] = makeInvalidEarlyAccess('__ZNSt10bad_typeidD0Ev');
var __ZNSt10bad_typeidD1Ev = Module['__ZNSt10bad_typeidD1Ev'] = makeInvalidEarlyAccess('__ZNSt10bad_typeidD1Ev');
var __ZNKSt10bad_typeid4whatEv = Module['__ZNKSt10bad_typeid4whatEv'] = makeInvalidEarlyAccess('__ZNKSt10bad_typeid4whatEv');
var __ZNSt8bad_castC1Ev = Module['__ZNSt8bad_castC1Ev'] = makeInvalidEarlyAccess('__ZNSt8bad_castC1Ev');
var __ZNSt10bad_typeidC1Ev = Module['__ZNSt10bad_typeidC1Ev'] = makeInvalidEarlyAccess('__ZNSt10bad_typeidC1Ev');
var memory = Module['memory'] = makeInvalidEarlyAccess('memory');
var ___stack_pointer = Module['___stack_pointer'] = makeInvalidEarlyAccess('___stack_pointer');
var __indirect_function_table = Module['__indirect_function_table'] = makeInvalidEarlyAccess('__indirect_function_table');
var __ZTVN10__cxxabiv120__si_class_type_infoE = Module['__ZTVN10__cxxabiv120__si_class_type_infoE'] = makeInvalidEarlyAccess('__ZTVN10__cxxabiv120__si_class_type_infoE');
var __ZTISt8bad_cast = Module['__ZTISt8bad_cast'] = makeInvalidEarlyAccess('__ZTISt8bad_cast');
var __ZTISt13runtime_error = Module['__ZTISt13runtime_error'] = makeInvalidEarlyAccess('__ZTISt13runtime_error');
var __ZTVN10__cxxabiv117__class_type_infoE = Module['__ZTVN10__cxxabiv117__class_type_infoE'] = makeInvalidEarlyAccess('__ZTVN10__cxxabiv117__class_type_infoE');
var __ZTISt9exception = Module['__ZTISt9exception'] = makeInvalidEarlyAccess('__ZTISt9exception');
var __ZTISt11logic_error = Module['__ZTISt11logic_error'] = makeInvalidEarlyAccess('__ZTISt11logic_error');
var __ZTVN10__cxxabiv121__vmi_class_type_infoE = Module['__ZTVN10__cxxabiv121__vmi_class_type_infoE'] = makeInvalidEarlyAccess('__ZTVN10__cxxabiv121__vmi_class_type_infoE');
var __ZTVSt11logic_error = Module['__ZTVSt11logic_error'] = makeInvalidEarlyAccess('__ZTVSt11logic_error');
var __ZTVSt9exception = Module['__ZTVSt9exception'] = makeInvalidEarlyAccess('__ZTVSt9exception');
var __ZTVSt13runtime_error = Module['__ZTVSt13runtime_error'] = makeInvalidEarlyAccess('__ZTVSt13runtime_error');
var ___cxa_unexpected_handler = Module['___cxa_unexpected_handler'] = makeInvalidEarlyAccess('___cxa_unexpected_handler');
var ___cxa_terminate_handler = Module['___cxa_terminate_handler'] = makeInvalidEarlyAccess('___cxa_terminate_handler');
var ___cxa_new_handler = Module['___cxa_new_handler'] = makeInvalidEarlyAccess('___cxa_new_handler');
var __ZTIN10__cxxabiv116__shim_type_infoE = Module['__ZTIN10__cxxabiv116__shim_type_infoE'] = makeInvalidEarlyAccess('__ZTIN10__cxxabiv116__shim_type_infoE');
var __ZTIN10__cxxabiv117__class_type_infoE = Module['__ZTIN10__cxxabiv117__class_type_infoE'] = makeInvalidEarlyAccess('__ZTIN10__cxxabiv117__class_type_infoE');
var __ZTIN10__cxxabiv117__pbase_type_infoE = Module['__ZTIN10__cxxabiv117__pbase_type_infoE'] = makeInvalidEarlyAccess('__ZTIN10__cxxabiv117__pbase_type_infoE');
var __ZTIDn = Module['__ZTIDn'] = makeInvalidEarlyAccess('__ZTIDn');
var __ZTIN10__cxxabiv119__pointer_type_infoE = Module['__ZTIN10__cxxabiv119__pointer_type_infoE'] = makeInvalidEarlyAccess('__ZTIN10__cxxabiv119__pointer_type_infoE');
var __ZTIv = Module['__ZTIv'] = makeInvalidEarlyAccess('__ZTIv');
var __ZTIN10__cxxabiv120__function_type_infoE = Module['__ZTIN10__cxxabiv120__function_type_infoE'] = makeInvalidEarlyAccess('__ZTIN10__cxxabiv120__function_type_infoE');
var __ZTIN10__cxxabiv129__pointer_to_member_type_infoE = Module['__ZTIN10__cxxabiv129__pointer_to_member_type_infoE'] = makeInvalidEarlyAccess('__ZTIN10__cxxabiv129__pointer_to_member_type_infoE');
var __ZTISt9type_info = Module['__ZTISt9type_info'] = makeInvalidEarlyAccess('__ZTISt9type_info');
var __ZTSN10__cxxabiv116__shim_type_infoE = Module['__ZTSN10__cxxabiv116__shim_type_infoE'] = makeInvalidEarlyAccess('__ZTSN10__cxxabiv116__shim_type_infoE');
var __ZTSN10__cxxabiv117__class_type_infoE = Module['__ZTSN10__cxxabiv117__class_type_infoE'] = makeInvalidEarlyAccess('__ZTSN10__cxxabiv117__class_type_infoE');
var __ZTSN10__cxxabiv117__pbase_type_infoE = Module['__ZTSN10__cxxabiv117__pbase_type_infoE'] = makeInvalidEarlyAccess('__ZTSN10__cxxabiv117__pbase_type_infoE');
var __ZTSN10__cxxabiv119__pointer_type_infoE = Module['__ZTSN10__cxxabiv119__pointer_type_infoE'] = makeInvalidEarlyAccess('__ZTSN10__cxxabiv119__pointer_type_infoE');
var __ZTSN10__cxxabiv120__function_type_infoE = Module['__ZTSN10__cxxabiv120__function_type_infoE'] = makeInvalidEarlyAccess('__ZTSN10__cxxabiv120__function_type_infoE');
var __ZTSN10__cxxabiv129__pointer_to_member_type_infoE = Module['__ZTSN10__cxxabiv129__pointer_to_member_type_infoE'] = makeInvalidEarlyAccess('__ZTSN10__cxxabiv129__pointer_to_member_type_infoE');
var __ZTVN10__cxxabiv116__shim_type_infoE = Module['__ZTVN10__cxxabiv116__shim_type_infoE'] = makeInvalidEarlyAccess('__ZTVN10__cxxabiv116__shim_type_infoE');
var __ZTVN10__cxxabiv123__fundamental_type_infoE = Module['__ZTVN10__cxxabiv123__fundamental_type_infoE'] = makeInvalidEarlyAccess('__ZTVN10__cxxabiv123__fundamental_type_infoE');
var __ZTIN10__cxxabiv123__fundamental_type_infoE = Module['__ZTIN10__cxxabiv123__fundamental_type_infoE'] = makeInvalidEarlyAccess('__ZTIN10__cxxabiv123__fundamental_type_infoE');
var __ZTSN10__cxxabiv123__fundamental_type_infoE = Module['__ZTSN10__cxxabiv123__fundamental_type_infoE'] = makeInvalidEarlyAccess('__ZTSN10__cxxabiv123__fundamental_type_infoE');
var __ZTSv = Module['__ZTSv'] = makeInvalidEarlyAccess('__ZTSv');
var __ZTIPv = Module['__ZTIPv'] = makeInvalidEarlyAccess('__ZTIPv');
var __ZTVN10__cxxabiv119__pointer_type_infoE = Module['__ZTVN10__cxxabiv119__pointer_type_infoE'] = makeInvalidEarlyAccess('__ZTVN10__cxxabiv119__pointer_type_infoE');
var __ZTSPv = Module['__ZTSPv'] = makeInvalidEarlyAccess('__ZTSPv');
var __ZTIPKv = Module['__ZTIPKv'] = makeInvalidEarlyAccess('__ZTIPKv');
var __ZTSPKv = Module['__ZTSPKv'] = makeInvalidEarlyAccess('__ZTSPKv');
var __ZTSDn = Module['__ZTSDn'] = makeInvalidEarlyAccess('__ZTSDn');
var __ZTIPDn = Module['__ZTIPDn'] = makeInvalidEarlyAccess('__ZTIPDn');
var __ZTSPDn = Module['__ZTSPDn'] = makeInvalidEarlyAccess('__ZTSPDn');
var __ZTIPKDn = Module['__ZTIPKDn'] = makeInvalidEarlyAccess('__ZTIPKDn');
var __ZTSPKDn = Module['__ZTSPKDn'] = makeInvalidEarlyAccess('__ZTSPKDn');
var __ZTIb = Module['__ZTIb'] = makeInvalidEarlyAccess('__ZTIb');
var __ZTSb = Module['__ZTSb'] = makeInvalidEarlyAccess('__ZTSb');
var __ZTIPb = Module['__ZTIPb'] = makeInvalidEarlyAccess('__ZTIPb');
var __ZTSPb = Module['__ZTSPb'] = makeInvalidEarlyAccess('__ZTSPb');
var __ZTIPKb = Module['__ZTIPKb'] = makeInvalidEarlyAccess('__ZTIPKb');
var __ZTSPKb = Module['__ZTSPKb'] = makeInvalidEarlyAccess('__ZTSPKb');
var __ZTIw = Module['__ZTIw'] = makeInvalidEarlyAccess('__ZTIw');
var __ZTSw = Module['__ZTSw'] = makeInvalidEarlyAccess('__ZTSw');
var __ZTIPw = Module['__ZTIPw'] = makeInvalidEarlyAccess('__ZTIPw');
var __ZTSPw = Module['__ZTSPw'] = makeInvalidEarlyAccess('__ZTSPw');
var __ZTIPKw = Module['__ZTIPKw'] = makeInvalidEarlyAccess('__ZTIPKw');
var __ZTSPKw = Module['__ZTSPKw'] = makeInvalidEarlyAccess('__ZTSPKw');
var __ZTIc = Module['__ZTIc'] = makeInvalidEarlyAccess('__ZTIc');
var __ZTSc = Module['__ZTSc'] = makeInvalidEarlyAccess('__ZTSc');
var __ZTIPc = Module['__ZTIPc'] = makeInvalidEarlyAccess('__ZTIPc');
var __ZTSPc = Module['__ZTSPc'] = makeInvalidEarlyAccess('__ZTSPc');
var __ZTIPKc = Module['__ZTIPKc'] = makeInvalidEarlyAccess('__ZTIPKc');
var __ZTSPKc = Module['__ZTSPKc'] = makeInvalidEarlyAccess('__ZTSPKc');
var __ZTIh = Module['__ZTIh'] = makeInvalidEarlyAccess('__ZTIh');
var __ZTSh = Module['__ZTSh'] = makeInvalidEarlyAccess('__ZTSh');
var __ZTIPh = Module['__ZTIPh'] = makeInvalidEarlyAccess('__ZTIPh');
var __ZTSPh = Module['__ZTSPh'] = makeInvalidEarlyAccess('__ZTSPh');
var __ZTIPKh = Module['__ZTIPKh'] = makeInvalidEarlyAccess('__ZTIPKh');
var __ZTSPKh = Module['__ZTSPKh'] = makeInvalidEarlyAccess('__ZTSPKh');
var __ZTIa = Module['__ZTIa'] = makeInvalidEarlyAccess('__ZTIa');
var __ZTSa = Module['__ZTSa'] = makeInvalidEarlyAccess('__ZTSa');
var __ZTIPa = Module['__ZTIPa'] = makeInvalidEarlyAccess('__ZTIPa');
var __ZTSPa = Module['__ZTSPa'] = makeInvalidEarlyAccess('__ZTSPa');
var __ZTIPKa = Module['__ZTIPKa'] = makeInvalidEarlyAccess('__ZTIPKa');
var __ZTSPKa = Module['__ZTSPKa'] = makeInvalidEarlyAccess('__ZTSPKa');
var __ZTIs = Module['__ZTIs'] = makeInvalidEarlyAccess('__ZTIs');
var __ZTSs = Module['__ZTSs'] = makeInvalidEarlyAccess('__ZTSs');
var __ZTIPs = Module['__ZTIPs'] = makeInvalidEarlyAccess('__ZTIPs');
var __ZTSPs = Module['__ZTSPs'] = makeInvalidEarlyAccess('__ZTSPs');
var __ZTIPKs = Module['__ZTIPKs'] = makeInvalidEarlyAccess('__ZTIPKs');
var __ZTSPKs = Module['__ZTSPKs'] = makeInvalidEarlyAccess('__ZTSPKs');
var __ZTIt = Module['__ZTIt'] = makeInvalidEarlyAccess('__ZTIt');
var __ZTSt = Module['__ZTSt'] = makeInvalidEarlyAccess('__ZTSt');
var __ZTIPt = Module['__ZTIPt'] = makeInvalidEarlyAccess('__ZTIPt');
var __ZTSPt = Module['__ZTSPt'] = makeInvalidEarlyAccess('__ZTSPt');
var __ZTIPKt = Module['__ZTIPKt'] = makeInvalidEarlyAccess('__ZTIPKt');
var __ZTSPKt = Module['__ZTSPKt'] = makeInvalidEarlyAccess('__ZTSPKt');
var __ZTIi = Module['__ZTIi'] = makeInvalidEarlyAccess('__ZTIi');
var __ZTSi = Module['__ZTSi'] = makeInvalidEarlyAccess('__ZTSi');
var __ZTIPi = Module['__ZTIPi'] = makeInvalidEarlyAccess('__ZTIPi');
var __ZTSPi = Module['__ZTSPi'] = makeInvalidEarlyAccess('__ZTSPi');
var __ZTIPKi = Module['__ZTIPKi'] = makeInvalidEarlyAccess('__ZTIPKi');
var __ZTSPKi = Module['__ZTSPKi'] = makeInvalidEarlyAccess('__ZTSPKi');
var __ZTIj = Module['__ZTIj'] = makeInvalidEarlyAccess('__ZTIj');
var __ZTSj = Module['__ZTSj'] = makeInvalidEarlyAccess('__ZTSj');
var __ZTIPj = Module['__ZTIPj'] = makeInvalidEarlyAccess('__ZTIPj');
var __ZTSPj = Module['__ZTSPj'] = makeInvalidEarlyAccess('__ZTSPj');
var __ZTIPKj = Module['__ZTIPKj'] = makeInvalidEarlyAccess('__ZTIPKj');
var __ZTSPKj = Module['__ZTSPKj'] = makeInvalidEarlyAccess('__ZTSPKj');
var __ZTIl = Module['__ZTIl'] = makeInvalidEarlyAccess('__ZTIl');
var __ZTSl = Module['__ZTSl'] = makeInvalidEarlyAccess('__ZTSl');
var __ZTIPl = Module['__ZTIPl'] = makeInvalidEarlyAccess('__ZTIPl');
var __ZTSPl = Module['__ZTSPl'] = makeInvalidEarlyAccess('__ZTSPl');
var __ZTIPKl = Module['__ZTIPKl'] = makeInvalidEarlyAccess('__ZTIPKl');
var __ZTSPKl = Module['__ZTSPKl'] = makeInvalidEarlyAccess('__ZTSPKl');
var __ZTIm = Module['__ZTIm'] = makeInvalidEarlyAccess('__ZTIm');
var __ZTSm = Module['__ZTSm'] = makeInvalidEarlyAccess('__ZTSm');
var __ZTIPm = Module['__ZTIPm'] = makeInvalidEarlyAccess('__ZTIPm');
var __ZTSPm = Module['__ZTSPm'] = makeInvalidEarlyAccess('__ZTSPm');
var __ZTIPKm = Module['__ZTIPKm'] = makeInvalidEarlyAccess('__ZTIPKm');
var __ZTSPKm = Module['__ZTSPKm'] = makeInvalidEarlyAccess('__ZTSPKm');
var __ZTIx = Module['__ZTIx'] = makeInvalidEarlyAccess('__ZTIx');
var __ZTSx = Module['__ZTSx'] = makeInvalidEarlyAccess('__ZTSx');
var __ZTIPx = Module['__ZTIPx'] = makeInvalidEarlyAccess('__ZTIPx');
var __ZTSPx = Module['__ZTSPx'] = makeInvalidEarlyAccess('__ZTSPx');
var __ZTIPKx = Module['__ZTIPKx'] = makeInvalidEarlyAccess('__ZTIPKx');
var __ZTSPKx = Module['__ZTSPKx'] = makeInvalidEarlyAccess('__ZTSPKx');
var __ZTIy = Module['__ZTIy'] = makeInvalidEarlyAccess('__ZTIy');
var __ZTSy = Module['__ZTSy'] = makeInvalidEarlyAccess('__ZTSy');
var __ZTIPy = Module['__ZTIPy'] = makeInvalidEarlyAccess('__ZTIPy');
var __ZTSPy = Module['__ZTSPy'] = makeInvalidEarlyAccess('__ZTSPy');
var __ZTIPKy = Module['__ZTIPKy'] = makeInvalidEarlyAccess('__ZTIPKy');
var __ZTSPKy = Module['__ZTSPKy'] = makeInvalidEarlyAccess('__ZTSPKy');
var __ZTIn = Module['__ZTIn'] = makeInvalidEarlyAccess('__ZTIn');
var __ZTSn = Module['__ZTSn'] = makeInvalidEarlyAccess('__ZTSn');
var __ZTIPn = Module['__ZTIPn'] = makeInvalidEarlyAccess('__ZTIPn');
var __ZTSPn = Module['__ZTSPn'] = makeInvalidEarlyAccess('__ZTSPn');
var __ZTIPKn = Module['__ZTIPKn'] = makeInvalidEarlyAccess('__ZTIPKn');
var __ZTSPKn = Module['__ZTSPKn'] = makeInvalidEarlyAccess('__ZTSPKn');
var __ZTIo = Module['__ZTIo'] = makeInvalidEarlyAccess('__ZTIo');
var __ZTSo = Module['__ZTSo'] = makeInvalidEarlyAccess('__ZTSo');
var __ZTIPo = Module['__ZTIPo'] = makeInvalidEarlyAccess('__ZTIPo');
var __ZTSPo = Module['__ZTSPo'] = makeInvalidEarlyAccess('__ZTSPo');
var __ZTIPKo = Module['__ZTIPKo'] = makeInvalidEarlyAccess('__ZTIPKo');
var __ZTSPKo = Module['__ZTSPKo'] = makeInvalidEarlyAccess('__ZTSPKo');
var __ZTIDh = Module['__ZTIDh'] = makeInvalidEarlyAccess('__ZTIDh');
var __ZTSDh = Module['__ZTSDh'] = makeInvalidEarlyAccess('__ZTSDh');
var __ZTIPDh = Module['__ZTIPDh'] = makeInvalidEarlyAccess('__ZTIPDh');
var __ZTSPDh = Module['__ZTSPDh'] = makeInvalidEarlyAccess('__ZTSPDh');
var __ZTIPKDh = Module['__ZTIPKDh'] = makeInvalidEarlyAccess('__ZTIPKDh');
var __ZTSPKDh = Module['__ZTSPKDh'] = makeInvalidEarlyAccess('__ZTSPKDh');
var __ZTIf = Module['__ZTIf'] = makeInvalidEarlyAccess('__ZTIf');
var __ZTSf = Module['__ZTSf'] = makeInvalidEarlyAccess('__ZTSf');
var __ZTIPf = Module['__ZTIPf'] = makeInvalidEarlyAccess('__ZTIPf');
var __ZTSPf = Module['__ZTSPf'] = makeInvalidEarlyAccess('__ZTSPf');
var __ZTIPKf = Module['__ZTIPKf'] = makeInvalidEarlyAccess('__ZTIPKf');
var __ZTSPKf = Module['__ZTSPKf'] = makeInvalidEarlyAccess('__ZTSPKf');
var __ZTId = Module['__ZTId'] = makeInvalidEarlyAccess('__ZTId');
var __ZTSd = Module['__ZTSd'] = makeInvalidEarlyAccess('__ZTSd');
var __ZTIPd = Module['__ZTIPd'] = makeInvalidEarlyAccess('__ZTIPd');
var __ZTSPd = Module['__ZTSPd'] = makeInvalidEarlyAccess('__ZTSPd');
var __ZTIPKd = Module['__ZTIPKd'] = makeInvalidEarlyAccess('__ZTIPKd');
var __ZTSPKd = Module['__ZTSPKd'] = makeInvalidEarlyAccess('__ZTSPKd');
var __ZTIe = Module['__ZTIe'] = makeInvalidEarlyAccess('__ZTIe');
var __ZTSe = Module['__ZTSe'] = makeInvalidEarlyAccess('__ZTSe');
var __ZTIPe = Module['__ZTIPe'] = makeInvalidEarlyAccess('__ZTIPe');
var __ZTSPe = Module['__ZTSPe'] = makeInvalidEarlyAccess('__ZTSPe');
var __ZTIPKe = Module['__ZTIPKe'] = makeInvalidEarlyAccess('__ZTIPKe');
var __ZTSPKe = Module['__ZTSPKe'] = makeInvalidEarlyAccess('__ZTSPKe');
var __ZTIg = Module['__ZTIg'] = makeInvalidEarlyAccess('__ZTIg');
var __ZTSg = Module['__ZTSg'] = makeInvalidEarlyAccess('__ZTSg');
var __ZTIPg = Module['__ZTIPg'] = makeInvalidEarlyAccess('__ZTIPg');
var __ZTSPg = Module['__ZTSPg'] = makeInvalidEarlyAccess('__ZTSPg');
var __ZTIPKg = Module['__ZTIPKg'] = makeInvalidEarlyAccess('__ZTIPKg');
var __ZTSPKg = Module['__ZTSPKg'] = makeInvalidEarlyAccess('__ZTSPKg');
var __ZTIDu = Module['__ZTIDu'] = makeInvalidEarlyAccess('__ZTIDu');
var __ZTSDu = Module['__ZTSDu'] = makeInvalidEarlyAccess('__ZTSDu');
var __ZTIPDu = Module['__ZTIPDu'] = makeInvalidEarlyAccess('__ZTIPDu');
var __ZTSPDu = Module['__ZTSPDu'] = makeInvalidEarlyAccess('__ZTSPDu');
var __ZTIPKDu = Module['__ZTIPKDu'] = makeInvalidEarlyAccess('__ZTIPKDu');
var __ZTSPKDu = Module['__ZTSPKDu'] = makeInvalidEarlyAccess('__ZTSPKDu');
var __ZTIDs = Module['__ZTIDs'] = makeInvalidEarlyAccess('__ZTIDs');
var __ZTSDs = Module['__ZTSDs'] = makeInvalidEarlyAccess('__ZTSDs');
var __ZTIPDs = Module['__ZTIPDs'] = makeInvalidEarlyAccess('__ZTIPDs');
var __ZTSPDs = Module['__ZTSPDs'] = makeInvalidEarlyAccess('__ZTSPDs');
var __ZTIPKDs = Module['__ZTIPKDs'] = makeInvalidEarlyAccess('__ZTIPKDs');
var __ZTSPKDs = Module['__ZTSPKDs'] = makeInvalidEarlyAccess('__ZTSPKDs');
var __ZTIDi = Module['__ZTIDi'] = makeInvalidEarlyAccess('__ZTIDi');
var __ZTSDi = Module['__ZTSDi'] = makeInvalidEarlyAccess('__ZTSDi');
var __ZTIPDi = Module['__ZTIPDi'] = makeInvalidEarlyAccess('__ZTIPDi');
var __ZTSPDi = Module['__ZTSPDi'] = makeInvalidEarlyAccess('__ZTSPDi');
var __ZTIPKDi = Module['__ZTIPKDi'] = makeInvalidEarlyAccess('__ZTIPKDi');
var __ZTSPKDi = Module['__ZTSPKDi'] = makeInvalidEarlyAccess('__ZTSPKDi');
var __ZTVN10__cxxabiv117__array_type_infoE = Module['__ZTVN10__cxxabiv117__array_type_infoE'] = makeInvalidEarlyAccess('__ZTVN10__cxxabiv117__array_type_infoE');
var __ZTIN10__cxxabiv117__array_type_infoE = Module['__ZTIN10__cxxabiv117__array_type_infoE'] = makeInvalidEarlyAccess('__ZTIN10__cxxabiv117__array_type_infoE');
var __ZTSN10__cxxabiv117__array_type_infoE = Module['__ZTSN10__cxxabiv117__array_type_infoE'] = makeInvalidEarlyAccess('__ZTSN10__cxxabiv117__array_type_infoE');
var __ZTVN10__cxxabiv120__function_type_infoE = Module['__ZTVN10__cxxabiv120__function_type_infoE'] = makeInvalidEarlyAccess('__ZTVN10__cxxabiv120__function_type_infoE');
var __ZTVN10__cxxabiv116__enum_type_infoE = Module['__ZTVN10__cxxabiv116__enum_type_infoE'] = makeInvalidEarlyAccess('__ZTVN10__cxxabiv116__enum_type_infoE');
var __ZTIN10__cxxabiv116__enum_type_infoE = Module['__ZTIN10__cxxabiv116__enum_type_infoE'] = makeInvalidEarlyAccess('__ZTIN10__cxxabiv116__enum_type_infoE');
var __ZTSN10__cxxabiv116__enum_type_infoE = Module['__ZTSN10__cxxabiv116__enum_type_infoE'] = makeInvalidEarlyAccess('__ZTSN10__cxxabiv116__enum_type_infoE');
var __ZTIN10__cxxabiv120__si_class_type_infoE = Module['__ZTIN10__cxxabiv120__si_class_type_infoE'] = makeInvalidEarlyAccess('__ZTIN10__cxxabiv120__si_class_type_infoE');
var __ZTSN10__cxxabiv120__si_class_type_infoE = Module['__ZTSN10__cxxabiv120__si_class_type_infoE'] = makeInvalidEarlyAccess('__ZTSN10__cxxabiv120__si_class_type_infoE');
var __ZTIN10__cxxabiv121__vmi_class_type_infoE = Module['__ZTIN10__cxxabiv121__vmi_class_type_infoE'] = makeInvalidEarlyAccess('__ZTIN10__cxxabiv121__vmi_class_type_infoE');
var __ZTSN10__cxxabiv121__vmi_class_type_infoE = Module['__ZTSN10__cxxabiv121__vmi_class_type_infoE'] = makeInvalidEarlyAccess('__ZTSN10__cxxabiv121__vmi_class_type_infoE');
var __ZTVN10__cxxabiv117__pbase_type_infoE = Module['__ZTVN10__cxxabiv117__pbase_type_infoE'] = makeInvalidEarlyAccess('__ZTVN10__cxxabiv117__pbase_type_infoE');
var __ZTVN10__cxxabiv129__pointer_to_member_type_infoE = Module['__ZTVN10__cxxabiv129__pointer_to_member_type_infoE'] = makeInvalidEarlyAccess('__ZTVN10__cxxabiv129__pointer_to_member_type_infoE');
var __ZTVSt9bad_alloc = Module['__ZTVSt9bad_alloc'] = makeInvalidEarlyAccess('__ZTVSt9bad_alloc');
var __ZTVSt20bad_array_new_length = Module['__ZTVSt20bad_array_new_length'] = makeInvalidEarlyAccess('__ZTVSt20bad_array_new_length');
var __ZTISt9bad_alloc = Module['__ZTISt9bad_alloc'] = makeInvalidEarlyAccess('__ZTISt9bad_alloc');
var __ZTISt20bad_array_new_length = Module['__ZTISt20bad_array_new_length'] = makeInvalidEarlyAccess('__ZTISt20bad_array_new_length');
var __ZTSSt9exception = Module['__ZTSSt9exception'] = makeInvalidEarlyAccess('__ZTSSt9exception');
var __ZTVSt13bad_exception = Module['__ZTVSt13bad_exception'] = makeInvalidEarlyAccess('__ZTVSt13bad_exception');
var __ZTISt13bad_exception = Module['__ZTISt13bad_exception'] = makeInvalidEarlyAccess('__ZTISt13bad_exception');
var __ZTSSt13bad_exception = Module['__ZTSSt13bad_exception'] = makeInvalidEarlyAccess('__ZTSSt13bad_exception');
var __ZTSSt9bad_alloc = Module['__ZTSSt9bad_alloc'] = makeInvalidEarlyAccess('__ZTSSt9bad_alloc');
var __ZTSSt20bad_array_new_length = Module['__ZTSSt20bad_array_new_length'] = makeInvalidEarlyAccess('__ZTSSt20bad_array_new_length');
var __ZTVSt12domain_error = Module['__ZTVSt12domain_error'] = makeInvalidEarlyAccess('__ZTVSt12domain_error');
var __ZTISt12domain_error = Module['__ZTISt12domain_error'] = makeInvalidEarlyAccess('__ZTISt12domain_error');
var __ZTSSt12domain_error = Module['__ZTSSt12domain_error'] = makeInvalidEarlyAccess('__ZTSSt12domain_error');
var __ZTSSt11logic_error = Module['__ZTSSt11logic_error'] = makeInvalidEarlyAccess('__ZTSSt11logic_error');
var __ZTVSt16invalid_argument = Module['__ZTVSt16invalid_argument'] = makeInvalidEarlyAccess('__ZTVSt16invalid_argument');
var __ZTISt16invalid_argument = Module['__ZTISt16invalid_argument'] = makeInvalidEarlyAccess('__ZTISt16invalid_argument');
var __ZTSSt16invalid_argument = Module['__ZTSSt16invalid_argument'] = makeInvalidEarlyAccess('__ZTSSt16invalid_argument');
var __ZTVSt12length_error = Module['__ZTVSt12length_error'] = makeInvalidEarlyAccess('__ZTVSt12length_error');
var __ZTISt12length_error = Module['__ZTISt12length_error'] = makeInvalidEarlyAccess('__ZTISt12length_error');
var __ZTSSt12length_error = Module['__ZTSSt12length_error'] = makeInvalidEarlyAccess('__ZTSSt12length_error');
var __ZTVSt12out_of_range = Module['__ZTVSt12out_of_range'] = makeInvalidEarlyAccess('__ZTVSt12out_of_range');
var __ZTISt12out_of_range = Module['__ZTISt12out_of_range'] = makeInvalidEarlyAccess('__ZTISt12out_of_range');
var __ZTSSt12out_of_range = Module['__ZTSSt12out_of_range'] = makeInvalidEarlyAccess('__ZTSSt12out_of_range');
var __ZTVSt11range_error = Module['__ZTVSt11range_error'] = makeInvalidEarlyAccess('__ZTVSt11range_error');
var __ZTISt11range_error = Module['__ZTISt11range_error'] = makeInvalidEarlyAccess('__ZTISt11range_error');
var __ZTSSt11range_error = Module['__ZTSSt11range_error'] = makeInvalidEarlyAccess('__ZTSSt11range_error');
var __ZTSSt13runtime_error = Module['__ZTSSt13runtime_error'] = makeInvalidEarlyAccess('__ZTSSt13runtime_error');
var __ZTVSt14overflow_error = Module['__ZTVSt14overflow_error'] = makeInvalidEarlyAccess('__ZTVSt14overflow_error');
var __ZTISt14overflow_error = Module['__ZTISt14overflow_error'] = makeInvalidEarlyAccess('__ZTISt14overflow_error');
var __ZTSSt14overflow_error = Module['__ZTSSt14overflow_error'] = makeInvalidEarlyAccess('__ZTSSt14overflow_error');
var __ZTVSt15underflow_error = Module['__ZTVSt15underflow_error'] = makeInvalidEarlyAccess('__ZTVSt15underflow_error');
var __ZTISt15underflow_error = Module['__ZTISt15underflow_error'] = makeInvalidEarlyAccess('__ZTISt15underflow_error');
var __ZTSSt15underflow_error = Module['__ZTSSt15underflow_error'] = makeInvalidEarlyAccess('__ZTSSt15underflow_error');
var __ZTVSt8bad_cast = Module['__ZTVSt8bad_cast'] = makeInvalidEarlyAccess('__ZTVSt8bad_cast');
var __ZTVSt10bad_typeid = Module['__ZTVSt10bad_typeid'] = makeInvalidEarlyAccess('__ZTVSt10bad_typeid');
var __ZTISt10bad_typeid = Module['__ZTISt10bad_typeid'] = makeInvalidEarlyAccess('__ZTISt10bad_typeid');
var __ZTVSt9type_info = Module['__ZTVSt9type_info'] = makeInvalidEarlyAccess('__ZTVSt9type_info');
var __ZTSSt9type_info = Module['__ZTSSt9type_info'] = makeInvalidEarlyAccess('__ZTSSt9type_info');
var __ZTSSt8bad_cast = Module['__ZTSSt8bad_cast'] = makeInvalidEarlyAccess('__ZTSSt8bad_cast');
var __ZTSSt10bad_typeid = Module['__ZTSSt10bad_typeid'] = makeInvalidEarlyAccess('__ZTSSt10bad_typeid');
var wasmMemory = Module['wasmMemory'] = makeInvalidEarlyAccess('wasmMemory');
var wasmTable = Module['wasmTable'] = makeInvalidEarlyAccess('wasmTable');

function assignWasmExports(wasmExports) {
  assert(typeof wasmExports['_Z6squarei'] != 'undefined', 'missing Wasm export: _Z6squarei');
  assert(typeof wasmExports['__original_main'] != 'undefined', 'missing Wasm export: __original_main');
  assert(typeof wasmExports['main'] != 'undefined', 'missing Wasm export: main');
  assert(typeof wasmExports['malloc'] != 'undefined', 'missing Wasm export: malloc');
  assert(typeof wasmExports['free'] != 'undefined', 'missing Wasm export: free');
  assert(typeof wasmExports['emscripten_stack_get_end'] != 'undefined', 'missing Wasm export: emscripten_stack_get_end');
  assert(typeof wasmExports['emscripten_stack_get_base'] != 'undefined', 'missing Wasm export: emscripten_stack_get_base');
  assert(typeof wasmExports['memcpy'] != 'undefined', 'missing Wasm export: memcpy');
  assert(typeof wasmExports['memcmp'] != 'undefined', 'missing Wasm export: memcmp');
  assert(typeof wasmExports['_emscripten_memcpy_bulkmem'] != 'undefined', 'missing Wasm export: _emscripten_memcpy_bulkmem');
  assert(typeof wasmExports['_emscripten_memset_bulkmem'] != 'undefined', 'missing Wasm export: _emscripten_memset_bulkmem');
  assert(typeof wasmExports['emscripten_builtin_memalign'] != 'undefined', 'missing Wasm export: emscripten_builtin_memalign');
  assert(typeof wasmExports['emscripten_stack_get_current'] != 'undefined', 'missing Wasm export: emscripten_stack_get_current');
  assert(typeof wasmExports['fflush'] != 'undefined', 'missing Wasm export: fflush');
  assert(typeof wasmExports['calloc'] != 'undefined', 'missing Wasm export: calloc');
  assert(typeof wasmExports['fileno'] != 'undefined', 'missing Wasm export: fileno');
  assert(typeof wasmExports['realloc'] != 'undefined', 'missing Wasm export: realloc');
  assert(typeof wasmExports['htons'] != 'undefined', 'missing Wasm export: htons');
  assert(typeof wasmExports['ntohs'] != 'undefined', 'missing Wasm export: ntohs');
  assert(typeof wasmExports['htonl'] != 'undefined', 'missing Wasm export: htonl');
  assert(typeof wasmExports['strerror'] != 'undefined', 'missing Wasm export: strerror');
  assert(typeof wasmExports['_emscripten_timeout'] != 'undefined', 'missing Wasm export: _emscripten_timeout');
  assert(typeof wasmExports['setThrew'] != 'undefined', 'missing Wasm export: setThrew');
  assert(typeof wasmExports['_emscripten_tempret_set'] != 'undefined', 'missing Wasm export: _emscripten_tempret_set');
  assert(typeof wasmExports['_emscripten_tempret_get'] != 'undefined', 'missing Wasm export: _emscripten_tempret_get');
  assert(typeof wasmExports['__get_temp_ret'] != 'undefined', 'missing Wasm export: __get_temp_ret');
  assert(typeof wasmExports['__set_temp_ret'] != 'undefined', 'missing Wasm export: __set_temp_ret');
  assert(typeof wasmExports['getTempRet0'] != 'undefined', 'missing Wasm export: getTempRet0');
  assert(typeof wasmExports['setTempRet0'] != 'undefined', 'missing Wasm export: setTempRet0');
  assert(typeof wasmExports['__emutls_get_address'] != 'undefined', 'missing Wasm export: __emutls_get_address');
  assert(typeof wasmExports['emscripten_stack_init'] != 'undefined', 'missing Wasm export: emscripten_stack_init');
  assert(typeof wasmExports['emscripten_stack_set_limits'] != 'undefined', 'missing Wasm export: emscripten_stack_set_limits');
  assert(typeof wasmExports['emscripten_stack_get_free'] != 'undefined', 'missing Wasm export: emscripten_stack_get_free');
  assert(typeof wasmExports['_emscripten_stack_restore'] != 'undefined', 'missing Wasm export: _emscripten_stack_restore');
  assert(typeof wasmExports['_emscripten_stack_alloc'] != 'undefined', 'missing Wasm export: _emscripten_stack_alloc');
  assert(typeof wasmExports['_ZNSt8bad_castD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt8bad_castD2Ev');
  assert(typeof wasmExports['_ZdlPvm'] != 'undefined', 'missing Wasm export: _ZdlPvm');
  assert(typeof wasmExports['_Znwm'] != 'undefined', 'missing Wasm export: _Znwm');
  assert(typeof wasmExports['_ZnamSt11align_val_t'] != 'undefined', 'missing Wasm export: _ZnamSt11align_val_t');
  assert(typeof wasmExports['_ZdaPvSt11align_val_t'] != 'undefined', 'missing Wasm export: _ZdaPvSt11align_val_t');
  assert(typeof wasmExports['_ZNSt13runtime_errorD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt13runtime_errorD2Ev');
  assert(typeof wasmExports['_ZNKSt13runtime_error4whatEv'] != 'undefined', 'missing Wasm export: _ZNKSt13runtime_error4whatEv');
  assert(typeof wasmExports['_ZnwmSt11align_val_t'] != 'undefined', 'missing Wasm export: _ZnwmSt11align_val_t');
  assert(typeof wasmExports['_ZdlPvmSt11align_val_t'] != 'undefined', 'missing Wasm export: _ZdlPvmSt11align_val_t');
  assert(typeof wasmExports['__cxa_pure_virtual'] != 'undefined', 'missing Wasm export: __cxa_pure_virtual');
  assert(typeof wasmExports['__cxa_uncaught_exceptions'] != 'undefined', 'missing Wasm export: __cxa_uncaught_exceptions');
  assert(typeof wasmExports['__cxa_decrement_exception_refcount'] != 'undefined', 'missing Wasm export: __cxa_decrement_exception_refcount');
  assert(typeof wasmExports['__cxa_increment_exception_refcount'] != 'undefined', 'missing Wasm export: __cxa_increment_exception_refcount');
  assert(typeof wasmExports['__cxa_current_primary_exception'] != 'undefined', 'missing Wasm export: __cxa_current_primary_exception');
  assert(typeof wasmExports['_ZSt9terminatev'] != 'undefined', 'missing Wasm export: _ZSt9terminatev');
  assert(typeof wasmExports['__cxa_rethrow_primary_exception'] != 'undefined', 'missing Wasm export: __cxa_rethrow_primary_exception');
  assert(typeof wasmExports['_ZNSt9exceptionD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt9exceptionD2Ev');
  assert(typeof wasmExports['_ZNSt11logic_errorD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt11logic_errorD2Ev');
  assert(typeof wasmExports['_ZNKSt11logic_error4whatEv'] != 'undefined', 'missing Wasm export: _ZNKSt11logic_error4whatEv');
  assert(typeof wasmExports['_ZdaPv'] != 'undefined', 'missing Wasm export: _ZdaPv');
  assert(typeof wasmExports['_Znam'] != 'undefined', 'missing Wasm export: _Znam');
  assert(typeof wasmExports['_ZSt15get_new_handlerv'] != 'undefined', 'missing Wasm export: _ZSt15get_new_handlerv');
  assert(typeof wasmExports['_ZdlPv'] != 'undefined', 'missing Wasm export: _ZdlPv');
  assert(typeof wasmExports['_ZdaPvm'] != 'undefined', 'missing Wasm export: _ZdaPvm');
  assert(typeof wasmExports['_ZdlPvSt11align_val_t'] != 'undefined', 'missing Wasm export: _ZdlPvSt11align_val_t');
  assert(typeof wasmExports['_ZdaPvmSt11align_val_t'] != 'undefined', 'missing Wasm export: _ZdaPvmSt11align_val_t');
  assert(typeof wasmExports['__dynamic_cast'] != 'undefined', 'missing Wasm export: __dynamic_cast');
  assert(typeof wasmExports['__cxa_bad_cast'] != 'undefined', 'missing Wasm export: __cxa_bad_cast');
  assert(typeof wasmExports['__cxa_bad_typeid'] != 'undefined', 'missing Wasm export: __cxa_bad_typeid');
  assert(typeof wasmExports['__cxa_throw_bad_array_new_length'] != 'undefined', 'missing Wasm export: __cxa_throw_bad_array_new_length');
  assert(typeof wasmExports['_ZSt14set_unexpectedPFvvE'] != 'undefined', 'missing Wasm export: _ZSt14set_unexpectedPFvvE');
  assert(typeof wasmExports['_ZSt13set_terminatePFvvE'] != 'undefined', 'missing Wasm export: _ZSt13set_terminatePFvvE');
  assert(typeof wasmExports['_ZSt15set_new_handlerPFvvE'] != 'undefined', 'missing Wasm export: _ZSt15set_new_handlerPFvvE');
  assert(typeof wasmExports['__cxa_demangle'] != 'undefined', 'missing Wasm export: __cxa_demangle');
  assert(typeof wasmExports['__cxa_guard_acquire'] != 'undefined', 'missing Wasm export: __cxa_guard_acquire');
  assert(typeof wasmExports['__cxa_guard_release'] != 'undefined', 'missing Wasm export: __cxa_guard_release');
  assert(typeof wasmExports['__cxa_guard_abort'] != 'undefined', 'missing Wasm export: __cxa_guard_abort');
  assert(typeof wasmExports['_ZSt14get_unexpectedv'] != 'undefined', 'missing Wasm export: _ZSt14get_unexpectedv');
  assert(typeof wasmExports['_ZSt10unexpectedv'] != 'undefined', 'missing Wasm export: _ZSt10unexpectedv');
  assert(typeof wasmExports['_ZSt13get_terminatev'] != 'undefined', 'missing Wasm export: _ZSt13get_terminatev');
  assert(typeof wasmExports['__cxa_uncaught_exception'] != 'undefined', 'missing Wasm export: __cxa_uncaught_exception');
  assert(typeof wasmExports['__cxa_allocate_exception'] != 'undefined', 'missing Wasm export: __cxa_allocate_exception');
  assert(typeof wasmExports['__cxa_free_exception'] != 'undefined', 'missing Wasm export: __cxa_free_exception');
  assert(typeof wasmExports['__cxa_init_primary_exception'] != 'undefined', 'missing Wasm export: __cxa_init_primary_exception');
  assert(typeof wasmExports['__cxa_thread_atexit'] != 'undefined', 'missing Wasm export: __cxa_thread_atexit');
  assert(typeof wasmExports['__cxa_deleted_virtual'] != 'undefined', 'missing Wasm export: __cxa_deleted_virtual');
  assert(typeof wasmExports['_ZNSt9type_infoD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt9type_infoD2Ev');
  assert(typeof wasmExports['__cxa_can_catch'] != 'undefined', 'missing Wasm export: __cxa_can_catch');
  assert(typeof wasmExports['__cxa_get_exception_ptr'] != 'undefined', 'missing Wasm export: __cxa_get_exception_ptr');
  assert(typeof wasmExports['_ZNSt9exceptionD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt9exceptionD0Ev');
  assert(typeof wasmExports['_ZNSt9exceptionD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt9exceptionD1Ev');
  assert(typeof wasmExports['_ZNKSt9exception4whatEv'] != 'undefined', 'missing Wasm export: _ZNKSt9exception4whatEv');
  assert(typeof wasmExports['_ZNSt13bad_exceptionD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt13bad_exceptionD0Ev');
  assert(typeof wasmExports['_ZNSt13bad_exceptionD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt13bad_exceptionD1Ev');
  assert(typeof wasmExports['_ZNKSt13bad_exception4whatEv'] != 'undefined', 'missing Wasm export: _ZNKSt13bad_exception4whatEv');
  assert(typeof wasmExports['_ZNSt9bad_allocC2Ev'] != 'undefined', 'missing Wasm export: _ZNSt9bad_allocC2Ev');
  assert(typeof wasmExports['_ZNSt9bad_allocD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt9bad_allocD0Ev');
  assert(typeof wasmExports['_ZNSt9bad_allocD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt9bad_allocD1Ev');
  assert(typeof wasmExports['_ZNKSt9bad_alloc4whatEv'] != 'undefined', 'missing Wasm export: _ZNKSt9bad_alloc4whatEv');
  assert(typeof wasmExports['_ZNSt20bad_array_new_lengthC2Ev'] != 'undefined', 'missing Wasm export: _ZNSt20bad_array_new_lengthC2Ev');
  assert(typeof wasmExports['_ZNSt20bad_array_new_lengthD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt20bad_array_new_lengthD0Ev');
  assert(typeof wasmExports['_ZNSt20bad_array_new_lengthD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt20bad_array_new_lengthD1Ev');
  assert(typeof wasmExports['_ZNKSt20bad_array_new_length4whatEv'] != 'undefined', 'missing Wasm export: _ZNKSt20bad_array_new_length4whatEv');
  assert(typeof wasmExports['_ZNSt13bad_exceptionD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt13bad_exceptionD2Ev');
  assert(typeof wasmExports['_ZNSt9bad_allocC1Ev'] != 'undefined', 'missing Wasm export: _ZNSt9bad_allocC1Ev');
  assert(typeof wasmExports['_ZNSt9bad_allocD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt9bad_allocD2Ev');
  assert(typeof wasmExports['_ZNSt20bad_array_new_lengthC1Ev'] != 'undefined', 'missing Wasm export: _ZNSt20bad_array_new_lengthC1Ev');
  assert(typeof wasmExports['_ZNSt20bad_array_new_lengthD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt20bad_array_new_lengthD2Ev');
  assert(typeof wasmExports['_ZNSt11logic_errorD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt11logic_errorD0Ev');
  assert(typeof wasmExports['_ZNSt11logic_errorD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt11logic_errorD1Ev');
  assert(typeof wasmExports['_ZNSt13runtime_errorD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt13runtime_errorD0Ev');
  assert(typeof wasmExports['_ZNSt13runtime_errorD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt13runtime_errorD1Ev');
  assert(typeof wasmExports['_ZNSt12domain_errorD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt12domain_errorD0Ev');
  assert(typeof wasmExports['_ZNSt12domain_errorD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt12domain_errorD1Ev');
  assert(typeof wasmExports['_ZNSt16invalid_argumentD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt16invalid_argumentD0Ev');
  assert(typeof wasmExports['_ZNSt16invalid_argumentD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt16invalid_argumentD1Ev');
  assert(typeof wasmExports['_ZNSt12length_errorD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt12length_errorD0Ev');
  assert(typeof wasmExports['_ZNSt12length_errorD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt12length_errorD1Ev');
  assert(typeof wasmExports['_ZNSt12out_of_rangeD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt12out_of_rangeD0Ev');
  assert(typeof wasmExports['_ZNSt12out_of_rangeD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt12out_of_rangeD1Ev');
  assert(typeof wasmExports['_ZNSt11range_errorD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt11range_errorD0Ev');
  assert(typeof wasmExports['_ZNSt11range_errorD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt11range_errorD1Ev');
  assert(typeof wasmExports['_ZNSt14overflow_errorD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt14overflow_errorD0Ev');
  assert(typeof wasmExports['_ZNSt14overflow_errorD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt14overflow_errorD1Ev');
  assert(typeof wasmExports['_ZNSt15underflow_errorD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt15underflow_errorD0Ev');
  assert(typeof wasmExports['_ZNSt15underflow_errorD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt15underflow_errorD1Ev');
  assert(typeof wasmExports['_ZNSt12domain_errorD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt12domain_errorD2Ev');
  assert(typeof wasmExports['_ZNSt16invalid_argumentD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt16invalid_argumentD2Ev');
  assert(typeof wasmExports['_ZNSt12length_errorD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt12length_errorD2Ev');
  assert(typeof wasmExports['_ZNSt12out_of_rangeD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt12out_of_rangeD2Ev');
  assert(typeof wasmExports['_ZNSt11range_errorD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt11range_errorD2Ev');
  assert(typeof wasmExports['_ZNSt14overflow_errorD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt14overflow_errorD2Ev');
  assert(typeof wasmExports['_ZNSt15underflow_errorD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt15underflow_errorD2Ev');
  assert(typeof wasmExports['_ZNSt9type_infoD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt9type_infoD0Ev');
  assert(typeof wasmExports['_ZNSt9type_infoD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt9type_infoD1Ev');
  assert(typeof wasmExports['_ZNSt8bad_castC2Ev'] != 'undefined', 'missing Wasm export: _ZNSt8bad_castC2Ev');
  assert(typeof wasmExports['_ZNSt8bad_castD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt8bad_castD0Ev');
  assert(typeof wasmExports['_ZNSt8bad_castD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt8bad_castD1Ev');
  assert(typeof wasmExports['_ZNKSt8bad_cast4whatEv'] != 'undefined', 'missing Wasm export: _ZNKSt8bad_cast4whatEv');
  assert(typeof wasmExports['_ZNSt10bad_typeidC2Ev'] != 'undefined', 'missing Wasm export: _ZNSt10bad_typeidC2Ev');
  assert(typeof wasmExports['_ZNSt10bad_typeidD2Ev'] != 'undefined', 'missing Wasm export: _ZNSt10bad_typeidD2Ev');
  assert(typeof wasmExports['_ZNSt10bad_typeidD0Ev'] != 'undefined', 'missing Wasm export: _ZNSt10bad_typeidD0Ev');
  assert(typeof wasmExports['_ZNSt10bad_typeidD1Ev'] != 'undefined', 'missing Wasm export: _ZNSt10bad_typeidD1Ev');
  assert(typeof wasmExports['_ZNKSt10bad_typeid4whatEv'] != 'undefined', 'missing Wasm export: _ZNKSt10bad_typeid4whatEv');
  assert(typeof wasmExports['_ZNSt8bad_castC1Ev'] != 'undefined', 'missing Wasm export: _ZNSt8bad_castC1Ev');
  assert(typeof wasmExports['_ZNSt10bad_typeidC1Ev'] != 'undefined', 'missing Wasm export: _ZNSt10bad_typeidC1Ev');
  assert(typeof wasmExports['memory'] != 'undefined', 'missing Wasm export: memory');
  assert(typeof wasmExports['__stack_pointer'] != 'undefined', 'missing Wasm export: __stack_pointer');
  assert(typeof wasmExports['__indirect_function_table'] != 'undefined', 'missing Wasm export: __indirect_function_table');
  assert(typeof wasmExports['_ZTVN10__cxxabiv120__si_class_type_infoE'] != 'undefined', 'missing Wasm export: _ZTVN10__cxxabiv120__si_class_type_infoE');
  assert(typeof wasmExports['_ZTISt8bad_cast'] != 'undefined', 'missing Wasm export: _ZTISt8bad_cast');
  assert(typeof wasmExports['_ZTISt13runtime_error'] != 'undefined', 'missing Wasm export: _ZTISt13runtime_error');
  assert(typeof wasmExports['_ZTVN10__cxxabiv117__class_type_infoE'] != 'undefined', 'missing Wasm export: _ZTVN10__cxxabiv117__class_type_infoE');
  assert(typeof wasmExports['_ZTISt9exception'] != 'undefined', 'missing Wasm export: _ZTISt9exception');
  assert(typeof wasmExports['_ZTISt11logic_error'] != 'undefined', 'missing Wasm export: _ZTISt11logic_error');
  assert(typeof wasmExports['_ZTVN10__cxxabiv121__vmi_class_type_infoE'] != 'undefined', 'missing Wasm export: _ZTVN10__cxxabiv121__vmi_class_type_infoE');
  assert(typeof wasmExports['_ZTVSt11logic_error'] != 'undefined', 'missing Wasm export: _ZTVSt11logic_error');
  assert(typeof wasmExports['_ZTVSt9exception'] != 'undefined', 'missing Wasm export: _ZTVSt9exception');
  assert(typeof wasmExports['_ZTVSt13runtime_error'] != 'undefined', 'missing Wasm export: _ZTVSt13runtime_error');
  assert(typeof wasmExports['__cxa_unexpected_handler'] != 'undefined', 'missing Wasm export: __cxa_unexpected_handler');
  assert(typeof wasmExports['__cxa_terminate_handler'] != 'undefined', 'missing Wasm export: __cxa_terminate_handler');
  assert(typeof wasmExports['__cxa_new_handler'] != 'undefined', 'missing Wasm export: __cxa_new_handler');
  assert(typeof wasmExports['_ZTIN10__cxxabiv116__shim_type_infoE'] != 'undefined', 'missing Wasm export: _ZTIN10__cxxabiv116__shim_type_infoE');
  assert(typeof wasmExports['_ZTIN10__cxxabiv117__class_type_infoE'] != 'undefined', 'missing Wasm export: _ZTIN10__cxxabiv117__class_type_infoE');
  assert(typeof wasmExports['_ZTIN10__cxxabiv117__pbase_type_infoE'] != 'undefined', 'missing Wasm export: _ZTIN10__cxxabiv117__pbase_type_infoE');
  assert(typeof wasmExports['_ZTIDn'] != 'undefined', 'missing Wasm export: _ZTIDn');
  assert(typeof wasmExports['_ZTIN10__cxxabiv119__pointer_type_infoE'] != 'undefined', 'missing Wasm export: _ZTIN10__cxxabiv119__pointer_type_infoE');
  assert(typeof wasmExports['_ZTIv'] != 'undefined', 'missing Wasm export: _ZTIv');
  assert(typeof wasmExports['_ZTIN10__cxxabiv120__function_type_infoE'] != 'undefined', 'missing Wasm export: _ZTIN10__cxxabiv120__function_type_infoE');
  assert(typeof wasmExports['_ZTIN10__cxxabiv129__pointer_to_member_type_infoE'] != 'undefined', 'missing Wasm export: _ZTIN10__cxxabiv129__pointer_to_member_type_infoE');
  assert(typeof wasmExports['_ZTISt9type_info'] != 'undefined', 'missing Wasm export: _ZTISt9type_info');
  assert(typeof wasmExports['_ZTSN10__cxxabiv116__shim_type_infoE'] != 'undefined', 'missing Wasm export: _ZTSN10__cxxabiv116__shim_type_infoE');
  assert(typeof wasmExports['_ZTSN10__cxxabiv117__class_type_infoE'] != 'undefined', 'missing Wasm export: _ZTSN10__cxxabiv117__class_type_infoE');
  assert(typeof wasmExports['_ZTSN10__cxxabiv117__pbase_type_infoE'] != 'undefined', 'missing Wasm export: _ZTSN10__cxxabiv117__pbase_type_infoE');
  assert(typeof wasmExports['_ZTSN10__cxxabiv119__pointer_type_infoE'] != 'undefined', 'missing Wasm export: _ZTSN10__cxxabiv119__pointer_type_infoE');
  assert(typeof wasmExports['_ZTSN10__cxxabiv120__function_type_infoE'] != 'undefined', 'missing Wasm export: _ZTSN10__cxxabiv120__function_type_infoE');
  assert(typeof wasmExports['_ZTSN10__cxxabiv129__pointer_to_member_type_infoE'] != 'undefined', 'missing Wasm export: _ZTSN10__cxxabiv129__pointer_to_member_type_infoE');
  assert(typeof wasmExports['_ZTVN10__cxxabiv116__shim_type_infoE'] != 'undefined', 'missing Wasm export: _ZTVN10__cxxabiv116__shim_type_infoE');
  assert(typeof wasmExports['_ZTVN10__cxxabiv123__fundamental_type_infoE'] != 'undefined', 'missing Wasm export: _ZTVN10__cxxabiv123__fundamental_type_infoE');
  assert(typeof wasmExports['_ZTIN10__cxxabiv123__fundamental_type_infoE'] != 'undefined', 'missing Wasm export: _ZTIN10__cxxabiv123__fundamental_type_infoE');
  assert(typeof wasmExports['_ZTSN10__cxxabiv123__fundamental_type_infoE'] != 'undefined', 'missing Wasm export: _ZTSN10__cxxabiv123__fundamental_type_infoE');
  assert(typeof wasmExports['_ZTSv'] != 'undefined', 'missing Wasm export: _ZTSv');
  assert(typeof wasmExports['_ZTIPv'] != 'undefined', 'missing Wasm export: _ZTIPv');
  assert(typeof wasmExports['_ZTVN10__cxxabiv119__pointer_type_infoE'] != 'undefined', 'missing Wasm export: _ZTVN10__cxxabiv119__pointer_type_infoE');
  assert(typeof wasmExports['_ZTSPv'] != 'undefined', 'missing Wasm export: _ZTSPv');
  assert(typeof wasmExports['_ZTIPKv'] != 'undefined', 'missing Wasm export: _ZTIPKv');
  assert(typeof wasmExports['_ZTSPKv'] != 'undefined', 'missing Wasm export: _ZTSPKv');
  assert(typeof wasmExports['_ZTSDn'] != 'undefined', 'missing Wasm export: _ZTSDn');
  assert(typeof wasmExports['_ZTIPDn'] != 'undefined', 'missing Wasm export: _ZTIPDn');
  assert(typeof wasmExports['_ZTSPDn'] != 'undefined', 'missing Wasm export: _ZTSPDn');
  assert(typeof wasmExports['_ZTIPKDn'] != 'undefined', 'missing Wasm export: _ZTIPKDn');
  assert(typeof wasmExports['_ZTSPKDn'] != 'undefined', 'missing Wasm export: _ZTSPKDn');
  assert(typeof wasmExports['_ZTIb'] != 'undefined', 'missing Wasm export: _ZTIb');
  assert(typeof wasmExports['_ZTSb'] != 'undefined', 'missing Wasm export: _ZTSb');
  assert(typeof wasmExports['_ZTIPb'] != 'undefined', 'missing Wasm export: _ZTIPb');
  assert(typeof wasmExports['_ZTSPb'] != 'undefined', 'missing Wasm export: _ZTSPb');
  assert(typeof wasmExports['_ZTIPKb'] != 'undefined', 'missing Wasm export: _ZTIPKb');
  assert(typeof wasmExports['_ZTSPKb'] != 'undefined', 'missing Wasm export: _ZTSPKb');
  assert(typeof wasmExports['_ZTIw'] != 'undefined', 'missing Wasm export: _ZTIw');
  assert(typeof wasmExports['_ZTSw'] != 'undefined', 'missing Wasm export: _ZTSw');
  assert(typeof wasmExports['_ZTIPw'] != 'undefined', 'missing Wasm export: _ZTIPw');
  assert(typeof wasmExports['_ZTSPw'] != 'undefined', 'missing Wasm export: _ZTSPw');
  assert(typeof wasmExports['_ZTIPKw'] != 'undefined', 'missing Wasm export: _ZTIPKw');
  assert(typeof wasmExports['_ZTSPKw'] != 'undefined', 'missing Wasm export: _ZTSPKw');
  assert(typeof wasmExports['_ZTIc'] != 'undefined', 'missing Wasm export: _ZTIc');
  assert(typeof wasmExports['_ZTSc'] != 'undefined', 'missing Wasm export: _ZTSc');
  assert(typeof wasmExports['_ZTIPc'] != 'undefined', 'missing Wasm export: _ZTIPc');
  assert(typeof wasmExports['_ZTSPc'] != 'undefined', 'missing Wasm export: _ZTSPc');
  assert(typeof wasmExports['_ZTIPKc'] != 'undefined', 'missing Wasm export: _ZTIPKc');
  assert(typeof wasmExports['_ZTSPKc'] != 'undefined', 'missing Wasm export: _ZTSPKc');
  assert(typeof wasmExports['_ZTIh'] != 'undefined', 'missing Wasm export: _ZTIh');
  assert(typeof wasmExports['_ZTSh'] != 'undefined', 'missing Wasm export: _ZTSh');
  assert(typeof wasmExports['_ZTIPh'] != 'undefined', 'missing Wasm export: _ZTIPh');
  assert(typeof wasmExports['_ZTSPh'] != 'undefined', 'missing Wasm export: _ZTSPh');
  assert(typeof wasmExports['_ZTIPKh'] != 'undefined', 'missing Wasm export: _ZTIPKh');
  assert(typeof wasmExports['_ZTSPKh'] != 'undefined', 'missing Wasm export: _ZTSPKh');
  assert(typeof wasmExports['_ZTIa'] != 'undefined', 'missing Wasm export: _ZTIa');
  assert(typeof wasmExports['_ZTSa'] != 'undefined', 'missing Wasm export: _ZTSa');
  assert(typeof wasmExports['_ZTIPa'] != 'undefined', 'missing Wasm export: _ZTIPa');
  assert(typeof wasmExports['_ZTSPa'] != 'undefined', 'missing Wasm export: _ZTSPa');
  assert(typeof wasmExports['_ZTIPKa'] != 'undefined', 'missing Wasm export: _ZTIPKa');
  assert(typeof wasmExports['_ZTSPKa'] != 'undefined', 'missing Wasm export: _ZTSPKa');
  assert(typeof wasmExports['_ZTIs'] != 'undefined', 'missing Wasm export: _ZTIs');
  assert(typeof wasmExports['_ZTSs'] != 'undefined', 'missing Wasm export: _ZTSs');
  assert(typeof wasmExports['_ZTIPs'] != 'undefined', 'missing Wasm export: _ZTIPs');
  assert(typeof wasmExports['_ZTSPs'] != 'undefined', 'missing Wasm export: _ZTSPs');
  assert(typeof wasmExports['_ZTIPKs'] != 'undefined', 'missing Wasm export: _ZTIPKs');
  assert(typeof wasmExports['_ZTSPKs'] != 'undefined', 'missing Wasm export: _ZTSPKs');
  assert(typeof wasmExports['_ZTIt'] != 'undefined', 'missing Wasm export: _ZTIt');
  assert(typeof wasmExports['_ZTSt'] != 'undefined', 'missing Wasm export: _ZTSt');
  assert(typeof wasmExports['_ZTIPt'] != 'undefined', 'missing Wasm export: _ZTIPt');
  assert(typeof wasmExports['_ZTSPt'] != 'undefined', 'missing Wasm export: _ZTSPt');
  assert(typeof wasmExports['_ZTIPKt'] != 'undefined', 'missing Wasm export: _ZTIPKt');
  assert(typeof wasmExports['_ZTSPKt'] != 'undefined', 'missing Wasm export: _ZTSPKt');
  assert(typeof wasmExports['_ZTIi'] != 'undefined', 'missing Wasm export: _ZTIi');
  assert(typeof wasmExports['_ZTSi'] != 'undefined', 'missing Wasm export: _ZTSi');
  assert(typeof wasmExports['_ZTIPi'] != 'undefined', 'missing Wasm export: _ZTIPi');
  assert(typeof wasmExports['_ZTSPi'] != 'undefined', 'missing Wasm export: _ZTSPi');
  assert(typeof wasmExports['_ZTIPKi'] != 'undefined', 'missing Wasm export: _ZTIPKi');
  assert(typeof wasmExports['_ZTSPKi'] != 'undefined', 'missing Wasm export: _ZTSPKi');
  assert(typeof wasmExports['_ZTIj'] != 'undefined', 'missing Wasm export: _ZTIj');
  assert(typeof wasmExports['_ZTSj'] != 'undefined', 'missing Wasm export: _ZTSj');
  assert(typeof wasmExports['_ZTIPj'] != 'undefined', 'missing Wasm export: _ZTIPj');
  assert(typeof wasmExports['_ZTSPj'] != 'undefined', 'missing Wasm export: _ZTSPj');
  assert(typeof wasmExports['_ZTIPKj'] != 'undefined', 'missing Wasm export: _ZTIPKj');
  assert(typeof wasmExports['_ZTSPKj'] != 'undefined', 'missing Wasm export: _ZTSPKj');
  assert(typeof wasmExports['_ZTIl'] != 'undefined', 'missing Wasm export: _ZTIl');
  assert(typeof wasmExports['_ZTSl'] != 'undefined', 'missing Wasm export: _ZTSl');
  assert(typeof wasmExports['_ZTIPl'] != 'undefined', 'missing Wasm export: _ZTIPl');
  assert(typeof wasmExports['_ZTSPl'] != 'undefined', 'missing Wasm export: _ZTSPl');
  assert(typeof wasmExports['_ZTIPKl'] != 'undefined', 'missing Wasm export: _ZTIPKl');
  assert(typeof wasmExports['_ZTSPKl'] != 'undefined', 'missing Wasm export: _ZTSPKl');
  assert(typeof wasmExports['_ZTIm'] != 'undefined', 'missing Wasm export: _ZTIm');
  assert(typeof wasmExports['_ZTSm'] != 'undefined', 'missing Wasm export: _ZTSm');
  assert(typeof wasmExports['_ZTIPm'] != 'undefined', 'missing Wasm export: _ZTIPm');
  assert(typeof wasmExports['_ZTSPm'] != 'undefined', 'missing Wasm export: _ZTSPm');
  assert(typeof wasmExports['_ZTIPKm'] != 'undefined', 'missing Wasm export: _ZTIPKm');
  assert(typeof wasmExports['_ZTSPKm'] != 'undefined', 'missing Wasm export: _ZTSPKm');
  assert(typeof wasmExports['_ZTIx'] != 'undefined', 'missing Wasm export: _ZTIx');
  assert(typeof wasmExports['_ZTSx'] != 'undefined', 'missing Wasm export: _ZTSx');
  assert(typeof wasmExports['_ZTIPx'] != 'undefined', 'missing Wasm export: _ZTIPx');
  assert(typeof wasmExports['_ZTSPx'] != 'undefined', 'missing Wasm export: _ZTSPx');
  assert(typeof wasmExports['_ZTIPKx'] != 'undefined', 'missing Wasm export: _ZTIPKx');
  assert(typeof wasmExports['_ZTSPKx'] != 'undefined', 'missing Wasm export: _ZTSPKx');
  assert(typeof wasmExports['_ZTIy'] != 'undefined', 'missing Wasm export: _ZTIy');
  assert(typeof wasmExports['_ZTSy'] != 'undefined', 'missing Wasm export: _ZTSy');
  assert(typeof wasmExports['_ZTIPy'] != 'undefined', 'missing Wasm export: _ZTIPy');
  assert(typeof wasmExports['_ZTSPy'] != 'undefined', 'missing Wasm export: _ZTSPy');
  assert(typeof wasmExports['_ZTIPKy'] != 'undefined', 'missing Wasm export: _ZTIPKy');
  assert(typeof wasmExports['_ZTSPKy'] != 'undefined', 'missing Wasm export: _ZTSPKy');
  assert(typeof wasmExports['_ZTIn'] != 'undefined', 'missing Wasm export: _ZTIn');
  assert(typeof wasmExports['_ZTSn'] != 'undefined', 'missing Wasm export: _ZTSn');
  assert(typeof wasmExports['_ZTIPn'] != 'undefined', 'missing Wasm export: _ZTIPn');
  assert(typeof wasmExports['_ZTSPn'] != 'undefined', 'missing Wasm export: _ZTSPn');
  assert(typeof wasmExports['_ZTIPKn'] != 'undefined', 'missing Wasm export: _ZTIPKn');
  assert(typeof wasmExports['_ZTSPKn'] != 'undefined', 'missing Wasm export: _ZTSPKn');
  assert(typeof wasmExports['_ZTIo'] != 'undefined', 'missing Wasm export: _ZTIo');
  assert(typeof wasmExports['_ZTSo'] != 'undefined', 'missing Wasm export: _ZTSo');
  assert(typeof wasmExports['_ZTIPo'] != 'undefined', 'missing Wasm export: _ZTIPo');
  assert(typeof wasmExports['_ZTSPo'] != 'undefined', 'missing Wasm export: _ZTSPo');
  assert(typeof wasmExports['_ZTIPKo'] != 'undefined', 'missing Wasm export: _ZTIPKo');
  assert(typeof wasmExports['_ZTSPKo'] != 'undefined', 'missing Wasm export: _ZTSPKo');
  assert(typeof wasmExports['_ZTIDh'] != 'undefined', 'missing Wasm export: _ZTIDh');
  assert(typeof wasmExports['_ZTSDh'] != 'undefined', 'missing Wasm export: _ZTSDh');
  assert(typeof wasmExports['_ZTIPDh'] != 'undefined', 'missing Wasm export: _ZTIPDh');
  assert(typeof wasmExports['_ZTSPDh'] != 'undefined', 'missing Wasm export: _ZTSPDh');
  assert(typeof wasmExports['_ZTIPKDh'] != 'undefined', 'missing Wasm export: _ZTIPKDh');
  assert(typeof wasmExports['_ZTSPKDh'] != 'undefined', 'missing Wasm export: _ZTSPKDh');
  assert(typeof wasmExports['_ZTIf'] != 'undefined', 'missing Wasm export: _ZTIf');
  assert(typeof wasmExports['_ZTSf'] != 'undefined', 'missing Wasm export: _ZTSf');
  assert(typeof wasmExports['_ZTIPf'] != 'undefined', 'missing Wasm export: _ZTIPf');
  assert(typeof wasmExports['_ZTSPf'] != 'undefined', 'missing Wasm export: _ZTSPf');
  assert(typeof wasmExports['_ZTIPKf'] != 'undefined', 'missing Wasm export: _ZTIPKf');
  assert(typeof wasmExports['_ZTSPKf'] != 'undefined', 'missing Wasm export: _ZTSPKf');
  assert(typeof wasmExports['_ZTId'] != 'undefined', 'missing Wasm export: _ZTId');
  assert(typeof wasmExports['_ZTSd'] != 'undefined', 'missing Wasm export: _ZTSd');
  assert(typeof wasmExports['_ZTIPd'] != 'undefined', 'missing Wasm export: _ZTIPd');
  assert(typeof wasmExports['_ZTSPd'] != 'undefined', 'missing Wasm export: _ZTSPd');
  assert(typeof wasmExports['_ZTIPKd'] != 'undefined', 'missing Wasm export: _ZTIPKd');
  assert(typeof wasmExports['_ZTSPKd'] != 'undefined', 'missing Wasm export: _ZTSPKd');
  assert(typeof wasmExports['_ZTIe'] != 'undefined', 'missing Wasm export: _ZTIe');
  assert(typeof wasmExports['_ZTSe'] != 'undefined', 'missing Wasm export: _ZTSe');
  assert(typeof wasmExports['_ZTIPe'] != 'undefined', 'missing Wasm export: _ZTIPe');
  assert(typeof wasmExports['_ZTSPe'] != 'undefined', 'missing Wasm export: _ZTSPe');
  assert(typeof wasmExports['_ZTIPKe'] != 'undefined', 'missing Wasm export: _ZTIPKe');
  assert(typeof wasmExports['_ZTSPKe'] != 'undefined', 'missing Wasm export: _ZTSPKe');
  assert(typeof wasmExports['_ZTIg'] != 'undefined', 'missing Wasm export: _ZTIg');
  assert(typeof wasmExports['_ZTSg'] != 'undefined', 'missing Wasm export: _ZTSg');
  assert(typeof wasmExports['_ZTIPg'] != 'undefined', 'missing Wasm export: _ZTIPg');
  assert(typeof wasmExports['_ZTSPg'] != 'undefined', 'missing Wasm export: _ZTSPg');
  assert(typeof wasmExports['_ZTIPKg'] != 'undefined', 'missing Wasm export: _ZTIPKg');
  assert(typeof wasmExports['_ZTSPKg'] != 'undefined', 'missing Wasm export: _ZTSPKg');
  assert(typeof wasmExports['_ZTIDu'] != 'undefined', 'missing Wasm export: _ZTIDu');
  assert(typeof wasmExports['_ZTSDu'] != 'undefined', 'missing Wasm export: _ZTSDu');
  assert(typeof wasmExports['_ZTIPDu'] != 'undefined', 'missing Wasm export: _ZTIPDu');
  assert(typeof wasmExports['_ZTSPDu'] != 'undefined', 'missing Wasm export: _ZTSPDu');
  assert(typeof wasmExports['_ZTIPKDu'] != 'undefined', 'missing Wasm export: _ZTIPKDu');
  assert(typeof wasmExports['_ZTSPKDu'] != 'undefined', 'missing Wasm export: _ZTSPKDu');
  assert(typeof wasmExports['_ZTIDs'] != 'undefined', 'missing Wasm export: _ZTIDs');
  assert(typeof wasmExports['_ZTSDs'] != 'undefined', 'missing Wasm export: _ZTSDs');
  assert(typeof wasmExports['_ZTIPDs'] != 'undefined', 'missing Wasm export: _ZTIPDs');
  assert(typeof wasmExports['_ZTSPDs'] != 'undefined', 'missing Wasm export: _ZTSPDs');
  assert(typeof wasmExports['_ZTIPKDs'] != 'undefined', 'missing Wasm export: _ZTIPKDs');
  assert(typeof wasmExports['_ZTSPKDs'] != 'undefined', 'missing Wasm export: _ZTSPKDs');
  assert(typeof wasmExports['_ZTIDi'] != 'undefined', 'missing Wasm export: _ZTIDi');
  assert(typeof wasmExports['_ZTSDi'] != 'undefined', 'missing Wasm export: _ZTSDi');
  assert(typeof wasmExports['_ZTIPDi'] != 'undefined', 'missing Wasm export: _ZTIPDi');
  assert(typeof wasmExports['_ZTSPDi'] != 'undefined', 'missing Wasm export: _ZTSPDi');
  assert(typeof wasmExports['_ZTIPKDi'] != 'undefined', 'missing Wasm export: _ZTIPKDi');
  assert(typeof wasmExports['_ZTSPKDi'] != 'undefined', 'missing Wasm export: _ZTSPKDi');
  assert(typeof wasmExports['_ZTVN10__cxxabiv117__array_type_infoE'] != 'undefined', 'missing Wasm export: _ZTVN10__cxxabiv117__array_type_infoE');
  assert(typeof wasmExports['_ZTIN10__cxxabiv117__array_type_infoE'] != 'undefined', 'missing Wasm export: _ZTIN10__cxxabiv117__array_type_infoE');
  assert(typeof wasmExports['_ZTSN10__cxxabiv117__array_type_infoE'] != 'undefined', 'missing Wasm export: _ZTSN10__cxxabiv117__array_type_infoE');
  assert(typeof wasmExports['_ZTVN10__cxxabiv120__function_type_infoE'] != 'undefined', 'missing Wasm export: _ZTVN10__cxxabiv120__function_type_infoE');
  assert(typeof wasmExports['_ZTVN10__cxxabiv116__enum_type_infoE'] != 'undefined', 'missing Wasm export: _ZTVN10__cxxabiv116__enum_type_infoE');
  assert(typeof wasmExports['_ZTIN10__cxxabiv116__enum_type_infoE'] != 'undefined', 'missing Wasm export: _ZTIN10__cxxabiv116__enum_type_infoE');
  assert(typeof wasmExports['_ZTSN10__cxxabiv116__enum_type_infoE'] != 'undefined', 'missing Wasm export: _ZTSN10__cxxabiv116__enum_type_infoE');
  assert(typeof wasmExports['_ZTIN10__cxxabiv120__si_class_type_infoE'] != 'undefined', 'missing Wasm export: _ZTIN10__cxxabiv120__si_class_type_infoE');
  assert(typeof wasmExports['_ZTSN10__cxxabiv120__si_class_type_infoE'] != 'undefined', 'missing Wasm export: _ZTSN10__cxxabiv120__si_class_type_infoE');
  assert(typeof wasmExports['_ZTIN10__cxxabiv121__vmi_class_type_infoE'] != 'undefined', 'missing Wasm export: _ZTIN10__cxxabiv121__vmi_class_type_infoE');
  assert(typeof wasmExports['_ZTSN10__cxxabiv121__vmi_class_type_infoE'] != 'undefined', 'missing Wasm export: _ZTSN10__cxxabiv121__vmi_class_type_infoE');
  assert(typeof wasmExports['_ZTVN10__cxxabiv117__pbase_type_infoE'] != 'undefined', 'missing Wasm export: _ZTVN10__cxxabiv117__pbase_type_infoE');
  assert(typeof wasmExports['_ZTVN10__cxxabiv129__pointer_to_member_type_infoE'] != 'undefined', 'missing Wasm export: _ZTVN10__cxxabiv129__pointer_to_member_type_infoE');
  assert(typeof wasmExports['_ZTVSt9bad_alloc'] != 'undefined', 'missing Wasm export: _ZTVSt9bad_alloc');
  assert(typeof wasmExports['_ZTVSt20bad_array_new_length'] != 'undefined', 'missing Wasm export: _ZTVSt20bad_array_new_length');
  assert(typeof wasmExports['_ZTISt9bad_alloc'] != 'undefined', 'missing Wasm export: _ZTISt9bad_alloc');
  assert(typeof wasmExports['_ZTISt20bad_array_new_length'] != 'undefined', 'missing Wasm export: _ZTISt20bad_array_new_length');
  assert(typeof wasmExports['_ZTSSt9exception'] != 'undefined', 'missing Wasm export: _ZTSSt9exception');
  assert(typeof wasmExports['_ZTVSt13bad_exception'] != 'undefined', 'missing Wasm export: _ZTVSt13bad_exception');
  assert(typeof wasmExports['_ZTISt13bad_exception'] != 'undefined', 'missing Wasm export: _ZTISt13bad_exception');
  assert(typeof wasmExports['_ZTSSt13bad_exception'] != 'undefined', 'missing Wasm export: _ZTSSt13bad_exception');
  assert(typeof wasmExports['_ZTSSt9bad_alloc'] != 'undefined', 'missing Wasm export: _ZTSSt9bad_alloc');
  assert(typeof wasmExports['_ZTSSt20bad_array_new_length'] != 'undefined', 'missing Wasm export: _ZTSSt20bad_array_new_length');
  assert(typeof wasmExports['_ZTVSt12domain_error'] != 'undefined', 'missing Wasm export: _ZTVSt12domain_error');
  assert(typeof wasmExports['_ZTISt12domain_error'] != 'undefined', 'missing Wasm export: _ZTISt12domain_error');
  assert(typeof wasmExports['_ZTSSt12domain_error'] != 'undefined', 'missing Wasm export: _ZTSSt12domain_error');
  assert(typeof wasmExports['_ZTSSt11logic_error'] != 'undefined', 'missing Wasm export: _ZTSSt11logic_error');
  assert(typeof wasmExports['_ZTVSt16invalid_argument'] != 'undefined', 'missing Wasm export: _ZTVSt16invalid_argument');
  assert(typeof wasmExports['_ZTISt16invalid_argument'] != 'undefined', 'missing Wasm export: _ZTISt16invalid_argument');
  assert(typeof wasmExports['_ZTSSt16invalid_argument'] != 'undefined', 'missing Wasm export: _ZTSSt16invalid_argument');
  assert(typeof wasmExports['_ZTVSt12length_error'] != 'undefined', 'missing Wasm export: _ZTVSt12length_error');
  assert(typeof wasmExports['_ZTISt12length_error'] != 'undefined', 'missing Wasm export: _ZTISt12length_error');
  assert(typeof wasmExports['_ZTSSt12length_error'] != 'undefined', 'missing Wasm export: _ZTSSt12length_error');
  assert(typeof wasmExports['_ZTVSt12out_of_range'] != 'undefined', 'missing Wasm export: _ZTVSt12out_of_range');
  assert(typeof wasmExports['_ZTISt12out_of_range'] != 'undefined', 'missing Wasm export: _ZTISt12out_of_range');
  assert(typeof wasmExports['_ZTSSt12out_of_range'] != 'undefined', 'missing Wasm export: _ZTSSt12out_of_range');
  assert(typeof wasmExports['_ZTVSt11range_error'] != 'undefined', 'missing Wasm export: _ZTVSt11range_error');
  assert(typeof wasmExports['_ZTISt11range_error'] != 'undefined', 'missing Wasm export: _ZTISt11range_error');
  assert(typeof wasmExports['_ZTSSt11range_error'] != 'undefined', 'missing Wasm export: _ZTSSt11range_error');
  assert(typeof wasmExports['_ZTSSt13runtime_error'] != 'undefined', 'missing Wasm export: _ZTSSt13runtime_error');
  assert(typeof wasmExports['_ZTVSt14overflow_error'] != 'undefined', 'missing Wasm export: _ZTVSt14overflow_error');
  assert(typeof wasmExports['_ZTISt14overflow_error'] != 'undefined', 'missing Wasm export: _ZTISt14overflow_error');
  assert(typeof wasmExports['_ZTSSt14overflow_error'] != 'undefined', 'missing Wasm export: _ZTSSt14overflow_error');
  assert(typeof wasmExports['_ZTVSt15underflow_error'] != 'undefined', 'missing Wasm export: _ZTVSt15underflow_error');
  assert(typeof wasmExports['_ZTISt15underflow_error'] != 'undefined', 'missing Wasm export: _ZTISt15underflow_error');
  assert(typeof wasmExports['_ZTSSt15underflow_error'] != 'undefined', 'missing Wasm export: _ZTSSt15underflow_error');
  assert(typeof wasmExports['_ZTVSt8bad_cast'] != 'undefined', 'missing Wasm export: _ZTVSt8bad_cast');
  assert(typeof wasmExports['_ZTVSt10bad_typeid'] != 'undefined', 'missing Wasm export: _ZTVSt10bad_typeid');
  assert(typeof wasmExports['_ZTISt10bad_typeid'] != 'undefined', 'missing Wasm export: _ZTISt10bad_typeid');
  assert(typeof wasmExports['_ZTVSt9type_info'] != 'undefined', 'missing Wasm export: _ZTVSt9type_info');
  assert(typeof wasmExports['_ZTSSt9type_info'] != 'undefined', 'missing Wasm export: _ZTSSt9type_info');
  assert(typeof wasmExports['_ZTSSt8bad_cast'] != 'undefined', 'missing Wasm export: _ZTSSt8bad_cast');
  assert(typeof wasmExports['_ZTSSt10bad_typeid'] != 'undefined', 'missing Wasm export: _ZTSSt10bad_typeid');
  __Z6squarei = Module['__Z6squarei'] = createExportWrapper('_Z6squarei', 1);
  ___original_main = Module['___original_main'] = createExportWrapper('__original_main', 0);
  _main = Module['_main'] = createExportWrapper('main', 2);
  _malloc = Module['_malloc'] = createExportWrapper('malloc', 1);
  _free = Module['_free'] = createExportWrapper('free', 1);
  _emscripten_stack_get_end = Module['_emscripten_stack_get_end'] = wasmExports['emscripten_stack_get_end'];
  _emscripten_stack_get_base = Module['_emscripten_stack_get_base'] = wasmExports['emscripten_stack_get_base'];
  _memcpy = Module['_memcpy'] = createExportWrapper('memcpy', 3);
  _memcmp = Module['_memcmp'] = createExportWrapper('memcmp', 3);
  __emscripten_memcpy_bulkmem = Module['__emscripten_memcpy_bulkmem'] = createExportWrapper('_emscripten_memcpy_bulkmem', 3);
  __emscripten_memset_bulkmem = Module['__emscripten_memset_bulkmem'] = createExportWrapper('_emscripten_memset_bulkmem', 3);
  _emscripten_builtin_memalign = Module['_emscripten_builtin_memalign'] = createExportWrapper('emscripten_builtin_memalign', 2);
  _emscripten_stack_get_current = Module['_emscripten_stack_get_current'] = wasmExports['emscripten_stack_get_current'];
  _fflush = Module['_fflush'] = createExportWrapper('fflush', 1);
  _calloc = Module['_calloc'] = createExportWrapper('calloc', 2);
  _fileno = Module['_fileno'] = createExportWrapper('fileno', 1);
  _realloc = Module['_realloc'] = createExportWrapper('realloc', 2);
  _htons = Module['_htons'] = createExportWrapper('htons', 1);
  _ntohs = Module['_ntohs'] = createExportWrapper('ntohs', 1);
  _htonl = Module['_htonl'] = createExportWrapper('htonl', 1);
  _strerror = Module['_strerror'] = createExportWrapper('strerror', 1);
  __emscripten_timeout = Module['__emscripten_timeout'] = createExportWrapper('_emscripten_timeout', 2);
  _setThrew = Module['_setThrew'] = createExportWrapper('setThrew', 2);
  __emscripten_tempret_set = Module['__emscripten_tempret_set'] = createExportWrapper('_emscripten_tempret_set', 1);
  __emscripten_tempret_get = Module['__emscripten_tempret_get'] = createExportWrapper('_emscripten_tempret_get', 0);
  ___get_temp_ret = Module['___get_temp_ret'] = createExportWrapper('__get_temp_ret', 0);
  ___set_temp_ret = Module['___set_temp_ret'] = createExportWrapper('__set_temp_ret', 1);
  _getTempRet0 = Module['_getTempRet0'] = createExportWrapper('getTempRet0', 0);
  _setTempRet0 = Module['_setTempRet0'] = createExportWrapper('setTempRet0', 1);
  ___emutls_get_address = Module['___emutls_get_address'] = createExportWrapper('__emutls_get_address', 1);
  _emscripten_stack_init = Module['_emscripten_stack_init'] = wasmExports['emscripten_stack_init'];
  _emscripten_stack_set_limits = Module['_emscripten_stack_set_limits'] = wasmExports['emscripten_stack_set_limits'];
  _emscripten_stack_get_free = Module['_emscripten_stack_get_free'] = wasmExports['emscripten_stack_get_free'];
  __emscripten_stack_restore = Module['__emscripten_stack_restore'] = wasmExports['_emscripten_stack_restore'];
  __emscripten_stack_alloc = Module['__emscripten_stack_alloc'] = wasmExports['_emscripten_stack_alloc'];
  __ZNSt8bad_castD2Ev = Module['__ZNSt8bad_castD2Ev'] = createExportWrapper('_ZNSt8bad_castD2Ev', 1);
  __ZdlPvm = Module['__ZdlPvm'] = createExportWrapper('_ZdlPvm', 2);
  __Znwm = Module['__Znwm'] = createExportWrapper('_Znwm', 1);
  __ZnamSt11align_val_t = Module['__ZnamSt11align_val_t'] = createExportWrapper('_ZnamSt11align_val_t', 2);
  __ZdaPvSt11align_val_t = Module['__ZdaPvSt11align_val_t'] = createExportWrapper('_ZdaPvSt11align_val_t', 2);
  __ZNSt13runtime_errorD2Ev = Module['__ZNSt13runtime_errorD2Ev'] = createExportWrapper('_ZNSt13runtime_errorD2Ev', 1);
  __ZNKSt13runtime_error4whatEv = Module['__ZNKSt13runtime_error4whatEv'] = createExportWrapper('_ZNKSt13runtime_error4whatEv', 1);
  __ZnwmSt11align_val_t = Module['__ZnwmSt11align_val_t'] = createExportWrapper('_ZnwmSt11align_val_t', 2);
  __ZdlPvmSt11align_val_t = Module['__ZdlPvmSt11align_val_t'] = createExportWrapper('_ZdlPvmSt11align_val_t', 3);
  ___cxa_pure_virtual = Module['___cxa_pure_virtual'] = createExportWrapper('__cxa_pure_virtual', 0);
  ___cxa_uncaught_exceptions = Module['___cxa_uncaught_exceptions'] = createExportWrapper('__cxa_uncaught_exceptions', 0);
  ___cxa_decrement_exception_refcount = Module['___cxa_decrement_exception_refcount'] = createExportWrapper('__cxa_decrement_exception_refcount', 1);
  ___cxa_increment_exception_refcount = Module['___cxa_increment_exception_refcount'] = createExportWrapper('__cxa_increment_exception_refcount', 1);
  ___cxa_current_primary_exception = Module['___cxa_current_primary_exception'] = createExportWrapper('__cxa_current_primary_exception', 0);
  __ZSt9terminatev = Module['__ZSt9terminatev'] = createExportWrapper('_ZSt9terminatev', 0);
  ___cxa_rethrow_primary_exception = Module['___cxa_rethrow_primary_exception'] = createExportWrapper('__cxa_rethrow_primary_exception', 1);
  __ZNSt9exceptionD2Ev = Module['__ZNSt9exceptionD2Ev'] = createExportWrapper('_ZNSt9exceptionD2Ev', 1);
  __ZNSt11logic_errorD2Ev = Module['__ZNSt11logic_errorD2Ev'] = createExportWrapper('_ZNSt11logic_errorD2Ev', 1);
  __ZNKSt11logic_error4whatEv = Module['__ZNKSt11logic_error4whatEv'] = createExportWrapper('_ZNKSt11logic_error4whatEv', 1);
  __ZdaPv = Module['__ZdaPv'] = createExportWrapper('_ZdaPv', 1);
  __Znam = Module['__Znam'] = createExportWrapper('_Znam', 1);
  __ZSt15get_new_handlerv = Module['__ZSt15get_new_handlerv'] = createExportWrapper('_ZSt15get_new_handlerv', 0);
  __ZdlPv = Module['__ZdlPv'] = createExportWrapper('_ZdlPv', 1);
  __ZdaPvm = Module['__ZdaPvm'] = createExportWrapper('_ZdaPvm', 2);
  __ZdlPvSt11align_val_t = Module['__ZdlPvSt11align_val_t'] = createExportWrapper('_ZdlPvSt11align_val_t', 2);
  __ZdaPvmSt11align_val_t = Module['__ZdaPvmSt11align_val_t'] = createExportWrapper('_ZdaPvmSt11align_val_t', 3);
  ___dynamic_cast = Module['___dynamic_cast'] = createExportWrapper('__dynamic_cast', 4);
  ___cxa_bad_cast = Module['___cxa_bad_cast'] = createExportWrapper('__cxa_bad_cast', 0);
  ___cxa_bad_typeid = Module['___cxa_bad_typeid'] = createExportWrapper('__cxa_bad_typeid', 0);
  ___cxa_throw_bad_array_new_length = Module['___cxa_throw_bad_array_new_length'] = createExportWrapper('__cxa_throw_bad_array_new_length', 0);
  __ZSt14set_unexpectedPFvvE = Module['__ZSt14set_unexpectedPFvvE'] = createExportWrapper('_ZSt14set_unexpectedPFvvE', 1);
  __ZSt13set_terminatePFvvE = Module['__ZSt13set_terminatePFvvE'] = createExportWrapper('_ZSt13set_terminatePFvvE', 1);
  __ZSt15set_new_handlerPFvvE = Module['__ZSt15set_new_handlerPFvvE'] = createExportWrapper('_ZSt15set_new_handlerPFvvE', 1);
  ___cxa_demangle = Module['___cxa_demangle'] = createExportWrapper('__cxa_demangle', 4);
  ___cxa_guard_acquire = Module['___cxa_guard_acquire'] = createExportWrapper('__cxa_guard_acquire', 1);
  ___cxa_guard_release = Module['___cxa_guard_release'] = createExportWrapper('__cxa_guard_release', 1);
  ___cxa_guard_abort = Module['___cxa_guard_abort'] = createExportWrapper('__cxa_guard_abort', 1);
  __ZSt14get_unexpectedv = Module['__ZSt14get_unexpectedv'] = createExportWrapper('_ZSt14get_unexpectedv', 0);
  __ZSt10unexpectedv = Module['__ZSt10unexpectedv'] = createExportWrapper('_ZSt10unexpectedv', 0);
  __ZSt13get_terminatev = Module['__ZSt13get_terminatev'] = createExportWrapper('_ZSt13get_terminatev', 0);
  ___cxa_uncaught_exception = Module['___cxa_uncaught_exception'] = createExportWrapper('__cxa_uncaught_exception', 0);
  ___cxa_allocate_exception = Module['___cxa_allocate_exception'] = createExportWrapper('__cxa_allocate_exception', 1);
  ___cxa_free_exception = Module['___cxa_free_exception'] = createExportWrapper('__cxa_free_exception', 1);
  ___cxa_init_primary_exception = Module['___cxa_init_primary_exception'] = createExportWrapper('__cxa_init_primary_exception', 3);
  ___cxa_thread_atexit = Module['___cxa_thread_atexit'] = createExportWrapper('__cxa_thread_atexit', 3);
  ___cxa_deleted_virtual = Module['___cxa_deleted_virtual'] = createExportWrapper('__cxa_deleted_virtual', 0);
  __ZNSt9type_infoD2Ev = Module['__ZNSt9type_infoD2Ev'] = createExportWrapper('_ZNSt9type_infoD2Ev', 1);
  ___cxa_can_catch = Module['___cxa_can_catch'] = createExportWrapper('__cxa_can_catch', 3);
  ___cxa_get_exception_ptr = Module['___cxa_get_exception_ptr'] = createExportWrapper('__cxa_get_exception_ptr', 1);
  __ZNSt9exceptionD0Ev = Module['__ZNSt9exceptionD0Ev'] = createExportWrapper('_ZNSt9exceptionD0Ev', 1);
  __ZNSt9exceptionD1Ev = Module['__ZNSt9exceptionD1Ev'] = createExportWrapper('_ZNSt9exceptionD1Ev', 1);
  __ZNKSt9exception4whatEv = Module['__ZNKSt9exception4whatEv'] = createExportWrapper('_ZNKSt9exception4whatEv', 1);
  __ZNSt13bad_exceptionD0Ev = Module['__ZNSt13bad_exceptionD0Ev'] = createExportWrapper('_ZNSt13bad_exceptionD0Ev', 1);
  __ZNSt13bad_exceptionD1Ev = Module['__ZNSt13bad_exceptionD1Ev'] = createExportWrapper('_ZNSt13bad_exceptionD1Ev', 1);
  __ZNKSt13bad_exception4whatEv = Module['__ZNKSt13bad_exception4whatEv'] = createExportWrapper('_ZNKSt13bad_exception4whatEv', 1);
  __ZNSt9bad_allocC2Ev = Module['__ZNSt9bad_allocC2Ev'] = createExportWrapper('_ZNSt9bad_allocC2Ev', 1);
  __ZNSt9bad_allocD0Ev = Module['__ZNSt9bad_allocD0Ev'] = createExportWrapper('_ZNSt9bad_allocD0Ev', 1);
  __ZNSt9bad_allocD1Ev = Module['__ZNSt9bad_allocD1Ev'] = createExportWrapper('_ZNSt9bad_allocD1Ev', 1);
  __ZNKSt9bad_alloc4whatEv = Module['__ZNKSt9bad_alloc4whatEv'] = createExportWrapper('_ZNKSt9bad_alloc4whatEv', 1);
  __ZNSt20bad_array_new_lengthC2Ev = Module['__ZNSt20bad_array_new_lengthC2Ev'] = createExportWrapper('_ZNSt20bad_array_new_lengthC2Ev', 1);
  __ZNSt20bad_array_new_lengthD0Ev = Module['__ZNSt20bad_array_new_lengthD0Ev'] = createExportWrapper('_ZNSt20bad_array_new_lengthD0Ev', 1);
  __ZNSt20bad_array_new_lengthD1Ev = Module['__ZNSt20bad_array_new_lengthD1Ev'] = createExportWrapper('_ZNSt20bad_array_new_lengthD1Ev', 1);
  __ZNKSt20bad_array_new_length4whatEv = Module['__ZNKSt20bad_array_new_length4whatEv'] = createExportWrapper('_ZNKSt20bad_array_new_length4whatEv', 1);
  __ZNSt13bad_exceptionD2Ev = Module['__ZNSt13bad_exceptionD2Ev'] = createExportWrapper('_ZNSt13bad_exceptionD2Ev', 1);
  __ZNSt9bad_allocC1Ev = Module['__ZNSt9bad_allocC1Ev'] = createExportWrapper('_ZNSt9bad_allocC1Ev', 1);
  __ZNSt9bad_allocD2Ev = Module['__ZNSt9bad_allocD2Ev'] = createExportWrapper('_ZNSt9bad_allocD2Ev', 1);
  __ZNSt20bad_array_new_lengthC1Ev = Module['__ZNSt20bad_array_new_lengthC1Ev'] = createExportWrapper('_ZNSt20bad_array_new_lengthC1Ev', 1);
  __ZNSt20bad_array_new_lengthD2Ev = Module['__ZNSt20bad_array_new_lengthD2Ev'] = createExportWrapper('_ZNSt20bad_array_new_lengthD2Ev', 1);
  __ZNSt11logic_errorD0Ev = Module['__ZNSt11logic_errorD0Ev'] = createExportWrapper('_ZNSt11logic_errorD0Ev', 1);
  __ZNSt11logic_errorD1Ev = Module['__ZNSt11logic_errorD1Ev'] = createExportWrapper('_ZNSt11logic_errorD1Ev', 1);
  __ZNSt13runtime_errorD0Ev = Module['__ZNSt13runtime_errorD0Ev'] = createExportWrapper('_ZNSt13runtime_errorD0Ev', 1);
  __ZNSt13runtime_errorD1Ev = Module['__ZNSt13runtime_errorD1Ev'] = createExportWrapper('_ZNSt13runtime_errorD1Ev', 1);
  __ZNSt12domain_errorD0Ev = Module['__ZNSt12domain_errorD0Ev'] = createExportWrapper('_ZNSt12domain_errorD0Ev', 1);
  __ZNSt12domain_errorD1Ev = Module['__ZNSt12domain_errorD1Ev'] = createExportWrapper('_ZNSt12domain_errorD1Ev', 1);
  __ZNSt16invalid_argumentD0Ev = Module['__ZNSt16invalid_argumentD0Ev'] = createExportWrapper('_ZNSt16invalid_argumentD0Ev', 1);
  __ZNSt16invalid_argumentD1Ev = Module['__ZNSt16invalid_argumentD1Ev'] = createExportWrapper('_ZNSt16invalid_argumentD1Ev', 1);
  __ZNSt12length_errorD0Ev = Module['__ZNSt12length_errorD0Ev'] = createExportWrapper('_ZNSt12length_errorD0Ev', 1);
  __ZNSt12length_errorD1Ev = Module['__ZNSt12length_errorD1Ev'] = createExportWrapper('_ZNSt12length_errorD1Ev', 1);
  __ZNSt12out_of_rangeD0Ev = Module['__ZNSt12out_of_rangeD0Ev'] = createExportWrapper('_ZNSt12out_of_rangeD0Ev', 1);
  __ZNSt12out_of_rangeD1Ev = Module['__ZNSt12out_of_rangeD1Ev'] = createExportWrapper('_ZNSt12out_of_rangeD1Ev', 1);
  __ZNSt11range_errorD0Ev = Module['__ZNSt11range_errorD0Ev'] = createExportWrapper('_ZNSt11range_errorD0Ev', 1);
  __ZNSt11range_errorD1Ev = Module['__ZNSt11range_errorD1Ev'] = createExportWrapper('_ZNSt11range_errorD1Ev', 1);
  __ZNSt14overflow_errorD0Ev = Module['__ZNSt14overflow_errorD0Ev'] = createExportWrapper('_ZNSt14overflow_errorD0Ev', 1);
  __ZNSt14overflow_errorD1Ev = Module['__ZNSt14overflow_errorD1Ev'] = createExportWrapper('_ZNSt14overflow_errorD1Ev', 1);
  __ZNSt15underflow_errorD0Ev = Module['__ZNSt15underflow_errorD0Ev'] = createExportWrapper('_ZNSt15underflow_errorD0Ev', 1);
  __ZNSt15underflow_errorD1Ev = Module['__ZNSt15underflow_errorD1Ev'] = createExportWrapper('_ZNSt15underflow_errorD1Ev', 1);
  __ZNSt12domain_errorD2Ev = Module['__ZNSt12domain_errorD2Ev'] = createExportWrapper('_ZNSt12domain_errorD2Ev', 1);
  __ZNSt16invalid_argumentD2Ev = Module['__ZNSt16invalid_argumentD2Ev'] = createExportWrapper('_ZNSt16invalid_argumentD2Ev', 1);
  __ZNSt12length_errorD2Ev = Module['__ZNSt12length_errorD2Ev'] = createExportWrapper('_ZNSt12length_errorD2Ev', 1);
  __ZNSt12out_of_rangeD2Ev = Module['__ZNSt12out_of_rangeD2Ev'] = createExportWrapper('_ZNSt12out_of_rangeD2Ev', 1);
  __ZNSt11range_errorD2Ev = Module['__ZNSt11range_errorD2Ev'] = createExportWrapper('_ZNSt11range_errorD2Ev', 1);
  __ZNSt14overflow_errorD2Ev = Module['__ZNSt14overflow_errorD2Ev'] = createExportWrapper('_ZNSt14overflow_errorD2Ev', 1);
  __ZNSt15underflow_errorD2Ev = Module['__ZNSt15underflow_errorD2Ev'] = createExportWrapper('_ZNSt15underflow_errorD2Ev', 1);
  __ZNSt9type_infoD0Ev = Module['__ZNSt9type_infoD0Ev'] = createExportWrapper('_ZNSt9type_infoD0Ev', 1);
  __ZNSt9type_infoD1Ev = Module['__ZNSt9type_infoD1Ev'] = createExportWrapper('_ZNSt9type_infoD1Ev', 1);
  __ZNSt8bad_castC2Ev = Module['__ZNSt8bad_castC2Ev'] = createExportWrapper('_ZNSt8bad_castC2Ev', 1);
  __ZNSt8bad_castD0Ev = Module['__ZNSt8bad_castD0Ev'] = createExportWrapper('_ZNSt8bad_castD0Ev', 1);
  __ZNSt8bad_castD1Ev = Module['__ZNSt8bad_castD1Ev'] = createExportWrapper('_ZNSt8bad_castD1Ev', 1);
  __ZNKSt8bad_cast4whatEv = Module['__ZNKSt8bad_cast4whatEv'] = createExportWrapper('_ZNKSt8bad_cast4whatEv', 1);
  __ZNSt10bad_typeidC2Ev = Module['__ZNSt10bad_typeidC2Ev'] = createExportWrapper('_ZNSt10bad_typeidC2Ev', 1);
  __ZNSt10bad_typeidD2Ev = Module['__ZNSt10bad_typeidD2Ev'] = createExportWrapper('_ZNSt10bad_typeidD2Ev', 1);
  __ZNSt10bad_typeidD0Ev = Module['__ZNSt10bad_typeidD0Ev'] = createExportWrapper('_ZNSt10bad_typeidD0Ev', 1);
  __ZNSt10bad_typeidD1Ev = Module['__ZNSt10bad_typeidD1Ev'] = createExportWrapper('_ZNSt10bad_typeidD1Ev', 1);
  __ZNKSt10bad_typeid4whatEv = Module['__ZNKSt10bad_typeid4whatEv'] = createExportWrapper('_ZNKSt10bad_typeid4whatEv', 1);
  __ZNSt8bad_castC1Ev = Module['__ZNSt8bad_castC1Ev'] = createExportWrapper('_ZNSt8bad_castC1Ev', 1);
  __ZNSt10bad_typeidC1Ev = Module['__ZNSt10bad_typeidC1Ev'] = createExportWrapper('_ZNSt10bad_typeidC1Ev', 1);
  memory = Module['memory'] = wasmMemory = wasmExports['memory'];
  ___stack_pointer = Module['___stack_pointer'] = wasmExports['__stack_pointer'];
  __indirect_function_table = Module['__indirect_function_table'] = wasmTable = wasmExports['__indirect_function_table'];
  __ZTVN10__cxxabiv120__si_class_type_infoE = Module['__ZTVN10__cxxabiv120__si_class_type_infoE'] = wasmExports['_ZTVN10__cxxabiv120__si_class_type_infoE'].value;
  __ZTISt8bad_cast = Module['__ZTISt8bad_cast'] = wasmExports['_ZTISt8bad_cast'].value;
  __ZTISt13runtime_error = Module['__ZTISt13runtime_error'] = wasmExports['_ZTISt13runtime_error'].value;
  __ZTVN10__cxxabiv117__class_type_infoE = Module['__ZTVN10__cxxabiv117__class_type_infoE'] = wasmExports['_ZTVN10__cxxabiv117__class_type_infoE'].value;
  __ZTISt9exception = Module['__ZTISt9exception'] = wasmExports['_ZTISt9exception'].value;
  __ZTISt11logic_error = Module['__ZTISt11logic_error'] = wasmExports['_ZTISt11logic_error'].value;
  __ZTVN10__cxxabiv121__vmi_class_type_infoE = Module['__ZTVN10__cxxabiv121__vmi_class_type_infoE'] = wasmExports['_ZTVN10__cxxabiv121__vmi_class_type_infoE'].value;
  __ZTVSt11logic_error = Module['__ZTVSt11logic_error'] = wasmExports['_ZTVSt11logic_error'].value;
  __ZTVSt9exception = Module['__ZTVSt9exception'] = wasmExports['_ZTVSt9exception'].value;
  __ZTVSt13runtime_error = Module['__ZTVSt13runtime_error'] = wasmExports['_ZTVSt13runtime_error'].value;
  ___cxa_unexpected_handler = Module['___cxa_unexpected_handler'] = wasmExports['__cxa_unexpected_handler'].value;
  ___cxa_terminate_handler = Module['___cxa_terminate_handler'] = wasmExports['__cxa_terminate_handler'].value;
  ___cxa_new_handler = Module['___cxa_new_handler'] = wasmExports['__cxa_new_handler'].value;
  __ZTIN10__cxxabiv116__shim_type_infoE = Module['__ZTIN10__cxxabiv116__shim_type_infoE'] = wasmExports['_ZTIN10__cxxabiv116__shim_type_infoE'].value;
  __ZTIN10__cxxabiv117__class_type_infoE = Module['__ZTIN10__cxxabiv117__class_type_infoE'] = wasmExports['_ZTIN10__cxxabiv117__class_type_infoE'].value;
  __ZTIN10__cxxabiv117__pbase_type_infoE = Module['__ZTIN10__cxxabiv117__pbase_type_infoE'] = wasmExports['_ZTIN10__cxxabiv117__pbase_type_infoE'].value;
  __ZTIDn = Module['__ZTIDn'] = wasmExports['_ZTIDn'].value;
  __ZTIN10__cxxabiv119__pointer_type_infoE = Module['__ZTIN10__cxxabiv119__pointer_type_infoE'] = wasmExports['_ZTIN10__cxxabiv119__pointer_type_infoE'].value;
  __ZTIv = Module['__ZTIv'] = wasmExports['_ZTIv'].value;
  __ZTIN10__cxxabiv120__function_type_infoE = Module['__ZTIN10__cxxabiv120__function_type_infoE'] = wasmExports['_ZTIN10__cxxabiv120__function_type_infoE'].value;
  __ZTIN10__cxxabiv129__pointer_to_member_type_infoE = Module['__ZTIN10__cxxabiv129__pointer_to_member_type_infoE'] = wasmExports['_ZTIN10__cxxabiv129__pointer_to_member_type_infoE'].value;
  __ZTISt9type_info = Module['__ZTISt9type_info'] = wasmExports['_ZTISt9type_info'].value;
  __ZTSN10__cxxabiv116__shim_type_infoE = Module['__ZTSN10__cxxabiv116__shim_type_infoE'] = wasmExports['_ZTSN10__cxxabiv116__shim_type_infoE'].value;
  __ZTSN10__cxxabiv117__class_type_infoE = Module['__ZTSN10__cxxabiv117__class_type_infoE'] = wasmExports['_ZTSN10__cxxabiv117__class_type_infoE'].value;
  __ZTSN10__cxxabiv117__pbase_type_infoE = Module['__ZTSN10__cxxabiv117__pbase_type_infoE'] = wasmExports['_ZTSN10__cxxabiv117__pbase_type_infoE'].value;
  __ZTSN10__cxxabiv119__pointer_type_infoE = Module['__ZTSN10__cxxabiv119__pointer_type_infoE'] = wasmExports['_ZTSN10__cxxabiv119__pointer_type_infoE'].value;
  __ZTSN10__cxxabiv120__function_type_infoE = Module['__ZTSN10__cxxabiv120__function_type_infoE'] = wasmExports['_ZTSN10__cxxabiv120__function_type_infoE'].value;
  __ZTSN10__cxxabiv129__pointer_to_member_type_infoE = Module['__ZTSN10__cxxabiv129__pointer_to_member_type_infoE'] = wasmExports['_ZTSN10__cxxabiv129__pointer_to_member_type_infoE'].value;
  __ZTVN10__cxxabiv116__shim_type_infoE = Module['__ZTVN10__cxxabiv116__shim_type_infoE'] = wasmExports['_ZTVN10__cxxabiv116__shim_type_infoE'].value;
  __ZTVN10__cxxabiv123__fundamental_type_infoE = Module['__ZTVN10__cxxabiv123__fundamental_type_infoE'] = wasmExports['_ZTVN10__cxxabiv123__fundamental_type_infoE'].value;
  __ZTIN10__cxxabiv123__fundamental_type_infoE = Module['__ZTIN10__cxxabiv123__fundamental_type_infoE'] = wasmExports['_ZTIN10__cxxabiv123__fundamental_type_infoE'].value;
  __ZTSN10__cxxabiv123__fundamental_type_infoE = Module['__ZTSN10__cxxabiv123__fundamental_type_infoE'] = wasmExports['_ZTSN10__cxxabiv123__fundamental_type_infoE'].value;
  __ZTSv = Module['__ZTSv'] = wasmExports['_ZTSv'].value;
  __ZTIPv = Module['__ZTIPv'] = wasmExports['_ZTIPv'].value;
  __ZTVN10__cxxabiv119__pointer_type_infoE = Module['__ZTVN10__cxxabiv119__pointer_type_infoE'] = wasmExports['_ZTVN10__cxxabiv119__pointer_type_infoE'].value;
  __ZTSPv = Module['__ZTSPv'] = wasmExports['_ZTSPv'].value;
  __ZTIPKv = Module['__ZTIPKv'] = wasmExports['_ZTIPKv'].value;
  __ZTSPKv = Module['__ZTSPKv'] = wasmExports['_ZTSPKv'].value;
  __ZTSDn = Module['__ZTSDn'] = wasmExports['_ZTSDn'].value;
  __ZTIPDn = Module['__ZTIPDn'] = wasmExports['_ZTIPDn'].value;
  __ZTSPDn = Module['__ZTSPDn'] = wasmExports['_ZTSPDn'].value;
  __ZTIPKDn = Module['__ZTIPKDn'] = wasmExports['_ZTIPKDn'].value;
  __ZTSPKDn = Module['__ZTSPKDn'] = wasmExports['_ZTSPKDn'].value;
  __ZTIb = Module['__ZTIb'] = wasmExports['_ZTIb'].value;
  __ZTSb = Module['__ZTSb'] = wasmExports['_ZTSb'].value;
  __ZTIPb = Module['__ZTIPb'] = wasmExports['_ZTIPb'].value;
  __ZTSPb = Module['__ZTSPb'] = wasmExports['_ZTSPb'].value;
  __ZTIPKb = Module['__ZTIPKb'] = wasmExports['_ZTIPKb'].value;
  __ZTSPKb = Module['__ZTSPKb'] = wasmExports['_ZTSPKb'].value;
  __ZTIw = Module['__ZTIw'] = wasmExports['_ZTIw'].value;
  __ZTSw = Module['__ZTSw'] = wasmExports['_ZTSw'].value;
  __ZTIPw = Module['__ZTIPw'] = wasmExports['_ZTIPw'].value;
  __ZTSPw = Module['__ZTSPw'] = wasmExports['_ZTSPw'].value;
  __ZTIPKw = Module['__ZTIPKw'] = wasmExports['_ZTIPKw'].value;
  __ZTSPKw = Module['__ZTSPKw'] = wasmExports['_ZTSPKw'].value;
  __ZTIc = Module['__ZTIc'] = wasmExports['_ZTIc'].value;
  __ZTSc = Module['__ZTSc'] = wasmExports['_ZTSc'].value;
  __ZTIPc = Module['__ZTIPc'] = wasmExports['_ZTIPc'].value;
  __ZTSPc = Module['__ZTSPc'] = wasmExports['_ZTSPc'].value;
  __ZTIPKc = Module['__ZTIPKc'] = wasmExports['_ZTIPKc'].value;
  __ZTSPKc = Module['__ZTSPKc'] = wasmExports['_ZTSPKc'].value;
  __ZTIh = Module['__ZTIh'] = wasmExports['_ZTIh'].value;
  __ZTSh = Module['__ZTSh'] = wasmExports['_ZTSh'].value;
  __ZTIPh = Module['__ZTIPh'] = wasmExports['_ZTIPh'].value;
  __ZTSPh = Module['__ZTSPh'] = wasmExports['_ZTSPh'].value;
  __ZTIPKh = Module['__ZTIPKh'] = wasmExports['_ZTIPKh'].value;
  __ZTSPKh = Module['__ZTSPKh'] = wasmExports['_ZTSPKh'].value;
  __ZTIa = Module['__ZTIa'] = wasmExports['_ZTIa'].value;
  __ZTSa = Module['__ZTSa'] = wasmExports['_ZTSa'].value;
  __ZTIPa = Module['__ZTIPa'] = wasmExports['_ZTIPa'].value;
  __ZTSPa = Module['__ZTSPa'] = wasmExports['_ZTSPa'].value;
  __ZTIPKa = Module['__ZTIPKa'] = wasmExports['_ZTIPKa'].value;
  __ZTSPKa = Module['__ZTSPKa'] = wasmExports['_ZTSPKa'].value;
  __ZTIs = Module['__ZTIs'] = wasmExports['_ZTIs'].value;
  __ZTSs = Module['__ZTSs'] = wasmExports['_ZTSs'].value;
  __ZTIPs = Module['__ZTIPs'] = wasmExports['_ZTIPs'].value;
  __ZTSPs = Module['__ZTSPs'] = wasmExports['_ZTSPs'].value;
  __ZTIPKs = Module['__ZTIPKs'] = wasmExports['_ZTIPKs'].value;
  __ZTSPKs = Module['__ZTSPKs'] = wasmExports['_ZTSPKs'].value;
  __ZTIt = Module['__ZTIt'] = wasmExports['_ZTIt'].value;
  __ZTSt = Module['__ZTSt'] = wasmExports['_ZTSt'].value;
  __ZTIPt = Module['__ZTIPt'] = wasmExports['_ZTIPt'].value;
  __ZTSPt = Module['__ZTSPt'] = wasmExports['_ZTSPt'].value;
  __ZTIPKt = Module['__ZTIPKt'] = wasmExports['_ZTIPKt'].value;
  __ZTSPKt = Module['__ZTSPKt'] = wasmExports['_ZTSPKt'].value;
  __ZTIi = Module['__ZTIi'] = wasmExports['_ZTIi'].value;
  __ZTSi = Module['__ZTSi'] = wasmExports['_ZTSi'].value;
  __ZTIPi = Module['__ZTIPi'] = wasmExports['_ZTIPi'].value;
  __ZTSPi = Module['__ZTSPi'] = wasmExports['_ZTSPi'].value;
  __ZTIPKi = Module['__ZTIPKi'] = wasmExports['_ZTIPKi'].value;
  __ZTSPKi = Module['__ZTSPKi'] = wasmExports['_ZTSPKi'].value;
  __ZTIj = Module['__ZTIj'] = wasmExports['_ZTIj'].value;
  __ZTSj = Module['__ZTSj'] = wasmExports['_ZTSj'].value;
  __ZTIPj = Module['__ZTIPj'] = wasmExports['_ZTIPj'].value;
  __ZTSPj = Module['__ZTSPj'] = wasmExports['_ZTSPj'].value;
  __ZTIPKj = Module['__ZTIPKj'] = wasmExports['_ZTIPKj'].value;
  __ZTSPKj = Module['__ZTSPKj'] = wasmExports['_ZTSPKj'].value;
  __ZTIl = Module['__ZTIl'] = wasmExports['_ZTIl'].value;
  __ZTSl = Module['__ZTSl'] = wasmExports['_ZTSl'].value;
  __ZTIPl = Module['__ZTIPl'] = wasmExports['_ZTIPl'].value;
  __ZTSPl = Module['__ZTSPl'] = wasmExports['_ZTSPl'].value;
  __ZTIPKl = Module['__ZTIPKl'] = wasmExports['_ZTIPKl'].value;
  __ZTSPKl = Module['__ZTSPKl'] = wasmExports['_ZTSPKl'].value;
  __ZTIm = Module['__ZTIm'] = wasmExports['_ZTIm'].value;
  __ZTSm = Module['__ZTSm'] = wasmExports['_ZTSm'].value;
  __ZTIPm = Module['__ZTIPm'] = wasmExports['_ZTIPm'].value;
  __ZTSPm = Module['__ZTSPm'] = wasmExports['_ZTSPm'].value;
  __ZTIPKm = Module['__ZTIPKm'] = wasmExports['_ZTIPKm'].value;
  __ZTSPKm = Module['__ZTSPKm'] = wasmExports['_ZTSPKm'].value;
  __ZTIx = Module['__ZTIx'] = wasmExports['_ZTIx'].value;
  __ZTSx = Module['__ZTSx'] = wasmExports['_ZTSx'].value;
  __ZTIPx = Module['__ZTIPx'] = wasmExports['_ZTIPx'].value;
  __ZTSPx = Module['__ZTSPx'] = wasmExports['_ZTSPx'].value;
  __ZTIPKx = Module['__ZTIPKx'] = wasmExports['_ZTIPKx'].value;
  __ZTSPKx = Module['__ZTSPKx'] = wasmExports['_ZTSPKx'].value;
  __ZTIy = Module['__ZTIy'] = wasmExports['_ZTIy'].value;
  __ZTSy = Module['__ZTSy'] = wasmExports['_ZTSy'].value;
  __ZTIPy = Module['__ZTIPy'] = wasmExports['_ZTIPy'].value;
  __ZTSPy = Module['__ZTSPy'] = wasmExports['_ZTSPy'].value;
  __ZTIPKy = Module['__ZTIPKy'] = wasmExports['_ZTIPKy'].value;
  __ZTSPKy = Module['__ZTSPKy'] = wasmExports['_ZTSPKy'].value;
  __ZTIn = Module['__ZTIn'] = wasmExports['_ZTIn'].value;
  __ZTSn = Module['__ZTSn'] = wasmExports['_ZTSn'].value;
  __ZTIPn = Module['__ZTIPn'] = wasmExports['_ZTIPn'].value;
  __ZTSPn = Module['__ZTSPn'] = wasmExports['_ZTSPn'].value;
  __ZTIPKn = Module['__ZTIPKn'] = wasmExports['_ZTIPKn'].value;
  __ZTSPKn = Module['__ZTSPKn'] = wasmExports['_ZTSPKn'].value;
  __ZTIo = Module['__ZTIo'] = wasmExports['_ZTIo'].value;
  __ZTSo = Module['__ZTSo'] = wasmExports['_ZTSo'].value;
  __ZTIPo = Module['__ZTIPo'] = wasmExports['_ZTIPo'].value;
  __ZTSPo = Module['__ZTSPo'] = wasmExports['_ZTSPo'].value;
  __ZTIPKo = Module['__ZTIPKo'] = wasmExports['_ZTIPKo'].value;
  __ZTSPKo = Module['__ZTSPKo'] = wasmExports['_ZTSPKo'].value;
  __ZTIDh = Module['__ZTIDh'] = wasmExports['_ZTIDh'].value;
  __ZTSDh = Module['__ZTSDh'] = wasmExports['_ZTSDh'].value;
  __ZTIPDh = Module['__ZTIPDh'] = wasmExports['_ZTIPDh'].value;
  __ZTSPDh = Module['__ZTSPDh'] = wasmExports['_ZTSPDh'].value;
  __ZTIPKDh = Module['__ZTIPKDh'] = wasmExports['_ZTIPKDh'].value;
  __ZTSPKDh = Module['__ZTSPKDh'] = wasmExports['_ZTSPKDh'].value;
  __ZTIf = Module['__ZTIf'] = wasmExports['_ZTIf'].value;
  __ZTSf = Module['__ZTSf'] = wasmExports['_ZTSf'].value;
  __ZTIPf = Module['__ZTIPf'] = wasmExports['_ZTIPf'].value;
  __ZTSPf = Module['__ZTSPf'] = wasmExports['_ZTSPf'].value;
  __ZTIPKf = Module['__ZTIPKf'] = wasmExports['_ZTIPKf'].value;
  __ZTSPKf = Module['__ZTSPKf'] = wasmExports['_ZTSPKf'].value;
  __ZTId = Module['__ZTId'] = wasmExports['_ZTId'].value;
  __ZTSd = Module['__ZTSd'] = wasmExports['_ZTSd'].value;
  __ZTIPd = Module['__ZTIPd'] = wasmExports['_ZTIPd'].value;
  __ZTSPd = Module['__ZTSPd'] = wasmExports['_ZTSPd'].value;
  __ZTIPKd = Module['__ZTIPKd'] = wasmExports['_ZTIPKd'].value;
  __ZTSPKd = Module['__ZTSPKd'] = wasmExports['_ZTSPKd'].value;
  __ZTIe = Module['__ZTIe'] = wasmExports['_ZTIe'].value;
  __ZTSe = Module['__ZTSe'] = wasmExports['_ZTSe'].value;
  __ZTIPe = Module['__ZTIPe'] = wasmExports['_ZTIPe'].value;
  __ZTSPe = Module['__ZTSPe'] = wasmExports['_ZTSPe'].value;
  __ZTIPKe = Module['__ZTIPKe'] = wasmExports['_ZTIPKe'].value;
  __ZTSPKe = Module['__ZTSPKe'] = wasmExports['_ZTSPKe'].value;
  __ZTIg = Module['__ZTIg'] = wasmExports['_ZTIg'].value;
  __ZTSg = Module['__ZTSg'] = wasmExports['_ZTSg'].value;
  __ZTIPg = Module['__ZTIPg'] = wasmExports['_ZTIPg'].value;
  __ZTSPg = Module['__ZTSPg'] = wasmExports['_ZTSPg'].value;
  __ZTIPKg = Module['__ZTIPKg'] = wasmExports['_ZTIPKg'].value;
  __ZTSPKg = Module['__ZTSPKg'] = wasmExports['_ZTSPKg'].value;
  __ZTIDu = Module['__ZTIDu'] = wasmExports['_ZTIDu'].value;
  __ZTSDu = Module['__ZTSDu'] = wasmExports['_ZTSDu'].value;
  __ZTIPDu = Module['__ZTIPDu'] = wasmExports['_ZTIPDu'].value;
  __ZTSPDu = Module['__ZTSPDu'] = wasmExports['_ZTSPDu'].value;
  __ZTIPKDu = Module['__ZTIPKDu'] = wasmExports['_ZTIPKDu'].value;
  __ZTSPKDu = Module['__ZTSPKDu'] = wasmExports['_ZTSPKDu'].value;
  __ZTIDs = Module['__ZTIDs'] = wasmExports['_ZTIDs'].value;
  __ZTSDs = Module['__ZTSDs'] = wasmExports['_ZTSDs'].value;
  __ZTIPDs = Module['__ZTIPDs'] = wasmExports['_ZTIPDs'].value;
  __ZTSPDs = Module['__ZTSPDs'] = wasmExports['_ZTSPDs'].value;
  __ZTIPKDs = Module['__ZTIPKDs'] = wasmExports['_ZTIPKDs'].value;
  __ZTSPKDs = Module['__ZTSPKDs'] = wasmExports['_ZTSPKDs'].value;
  __ZTIDi = Module['__ZTIDi'] = wasmExports['_ZTIDi'].value;
  __ZTSDi = Module['__ZTSDi'] = wasmExports['_ZTSDi'].value;
  __ZTIPDi = Module['__ZTIPDi'] = wasmExports['_ZTIPDi'].value;
  __ZTSPDi = Module['__ZTSPDi'] = wasmExports['_ZTSPDi'].value;
  __ZTIPKDi = Module['__ZTIPKDi'] = wasmExports['_ZTIPKDi'].value;
  __ZTSPKDi = Module['__ZTSPKDi'] = wasmExports['_ZTSPKDi'].value;
  __ZTVN10__cxxabiv117__array_type_infoE = Module['__ZTVN10__cxxabiv117__array_type_infoE'] = wasmExports['_ZTVN10__cxxabiv117__array_type_infoE'].value;
  __ZTIN10__cxxabiv117__array_type_infoE = Module['__ZTIN10__cxxabiv117__array_type_infoE'] = wasmExports['_ZTIN10__cxxabiv117__array_type_infoE'].value;
  __ZTSN10__cxxabiv117__array_type_infoE = Module['__ZTSN10__cxxabiv117__array_type_infoE'] = wasmExports['_ZTSN10__cxxabiv117__array_type_infoE'].value;
  __ZTVN10__cxxabiv120__function_type_infoE = Module['__ZTVN10__cxxabiv120__function_type_infoE'] = wasmExports['_ZTVN10__cxxabiv120__function_type_infoE'].value;
  __ZTVN10__cxxabiv116__enum_type_infoE = Module['__ZTVN10__cxxabiv116__enum_type_infoE'] = wasmExports['_ZTVN10__cxxabiv116__enum_type_infoE'].value;
  __ZTIN10__cxxabiv116__enum_type_infoE = Module['__ZTIN10__cxxabiv116__enum_type_infoE'] = wasmExports['_ZTIN10__cxxabiv116__enum_type_infoE'].value;
  __ZTSN10__cxxabiv116__enum_type_infoE = Module['__ZTSN10__cxxabiv116__enum_type_infoE'] = wasmExports['_ZTSN10__cxxabiv116__enum_type_infoE'].value;
  __ZTIN10__cxxabiv120__si_class_type_infoE = Module['__ZTIN10__cxxabiv120__si_class_type_infoE'] = wasmExports['_ZTIN10__cxxabiv120__si_class_type_infoE'].value;
  __ZTSN10__cxxabiv120__si_class_type_infoE = Module['__ZTSN10__cxxabiv120__si_class_type_infoE'] = wasmExports['_ZTSN10__cxxabiv120__si_class_type_infoE'].value;
  __ZTIN10__cxxabiv121__vmi_class_type_infoE = Module['__ZTIN10__cxxabiv121__vmi_class_type_infoE'] = wasmExports['_ZTIN10__cxxabiv121__vmi_class_type_infoE'].value;
  __ZTSN10__cxxabiv121__vmi_class_type_infoE = Module['__ZTSN10__cxxabiv121__vmi_class_type_infoE'] = wasmExports['_ZTSN10__cxxabiv121__vmi_class_type_infoE'].value;
  __ZTVN10__cxxabiv117__pbase_type_infoE = Module['__ZTVN10__cxxabiv117__pbase_type_infoE'] = wasmExports['_ZTVN10__cxxabiv117__pbase_type_infoE'].value;
  __ZTVN10__cxxabiv129__pointer_to_member_type_infoE = Module['__ZTVN10__cxxabiv129__pointer_to_member_type_infoE'] = wasmExports['_ZTVN10__cxxabiv129__pointer_to_member_type_infoE'].value;
  __ZTVSt9bad_alloc = Module['__ZTVSt9bad_alloc'] = wasmExports['_ZTVSt9bad_alloc'].value;
  __ZTVSt20bad_array_new_length = Module['__ZTVSt20bad_array_new_length'] = wasmExports['_ZTVSt20bad_array_new_length'].value;
  __ZTISt9bad_alloc = Module['__ZTISt9bad_alloc'] = wasmExports['_ZTISt9bad_alloc'].value;
  __ZTISt20bad_array_new_length = Module['__ZTISt20bad_array_new_length'] = wasmExports['_ZTISt20bad_array_new_length'].value;
  __ZTSSt9exception = Module['__ZTSSt9exception'] = wasmExports['_ZTSSt9exception'].value;
  __ZTVSt13bad_exception = Module['__ZTVSt13bad_exception'] = wasmExports['_ZTVSt13bad_exception'].value;
  __ZTISt13bad_exception = Module['__ZTISt13bad_exception'] = wasmExports['_ZTISt13bad_exception'].value;
  __ZTSSt13bad_exception = Module['__ZTSSt13bad_exception'] = wasmExports['_ZTSSt13bad_exception'].value;
  __ZTSSt9bad_alloc = Module['__ZTSSt9bad_alloc'] = wasmExports['_ZTSSt9bad_alloc'].value;
  __ZTSSt20bad_array_new_length = Module['__ZTSSt20bad_array_new_length'] = wasmExports['_ZTSSt20bad_array_new_length'].value;
  __ZTVSt12domain_error = Module['__ZTVSt12domain_error'] = wasmExports['_ZTVSt12domain_error'].value;
  __ZTISt12domain_error = Module['__ZTISt12domain_error'] = wasmExports['_ZTISt12domain_error'].value;
  __ZTSSt12domain_error = Module['__ZTSSt12domain_error'] = wasmExports['_ZTSSt12domain_error'].value;
  __ZTSSt11logic_error = Module['__ZTSSt11logic_error'] = wasmExports['_ZTSSt11logic_error'].value;
  __ZTVSt16invalid_argument = Module['__ZTVSt16invalid_argument'] = wasmExports['_ZTVSt16invalid_argument'].value;
  __ZTISt16invalid_argument = Module['__ZTISt16invalid_argument'] = wasmExports['_ZTISt16invalid_argument'].value;
  __ZTSSt16invalid_argument = Module['__ZTSSt16invalid_argument'] = wasmExports['_ZTSSt16invalid_argument'].value;
  __ZTVSt12length_error = Module['__ZTVSt12length_error'] = wasmExports['_ZTVSt12length_error'].value;
  __ZTISt12length_error = Module['__ZTISt12length_error'] = wasmExports['_ZTISt12length_error'].value;
  __ZTSSt12length_error = Module['__ZTSSt12length_error'] = wasmExports['_ZTSSt12length_error'].value;
  __ZTVSt12out_of_range = Module['__ZTVSt12out_of_range'] = wasmExports['_ZTVSt12out_of_range'].value;
  __ZTISt12out_of_range = Module['__ZTISt12out_of_range'] = wasmExports['_ZTISt12out_of_range'].value;
  __ZTSSt12out_of_range = Module['__ZTSSt12out_of_range'] = wasmExports['_ZTSSt12out_of_range'].value;
  __ZTVSt11range_error = Module['__ZTVSt11range_error'] = wasmExports['_ZTVSt11range_error'].value;
  __ZTISt11range_error = Module['__ZTISt11range_error'] = wasmExports['_ZTISt11range_error'].value;
  __ZTSSt11range_error = Module['__ZTSSt11range_error'] = wasmExports['_ZTSSt11range_error'].value;
  __ZTSSt13runtime_error = Module['__ZTSSt13runtime_error'] = wasmExports['_ZTSSt13runtime_error'].value;
  __ZTVSt14overflow_error = Module['__ZTVSt14overflow_error'] = wasmExports['_ZTVSt14overflow_error'].value;
  __ZTISt14overflow_error = Module['__ZTISt14overflow_error'] = wasmExports['_ZTISt14overflow_error'].value;
  __ZTSSt14overflow_error = Module['__ZTSSt14overflow_error'] = wasmExports['_ZTSSt14overflow_error'].value;
  __ZTVSt15underflow_error = Module['__ZTVSt15underflow_error'] = wasmExports['_ZTVSt15underflow_error'].value;
  __ZTISt15underflow_error = Module['__ZTISt15underflow_error'] = wasmExports['_ZTISt15underflow_error'].value;
  __ZTSSt15underflow_error = Module['__ZTSSt15underflow_error'] = wasmExports['_ZTSSt15underflow_error'].value;
  __ZTVSt8bad_cast = Module['__ZTVSt8bad_cast'] = wasmExports['_ZTVSt8bad_cast'].value;
  __ZTVSt10bad_typeid = Module['__ZTVSt10bad_typeid'] = wasmExports['_ZTVSt10bad_typeid'].value;
  __ZTISt10bad_typeid = Module['__ZTISt10bad_typeid'] = wasmExports['_ZTISt10bad_typeid'].value;
  __ZTVSt9type_info = Module['__ZTVSt9type_info'] = wasmExports['_ZTVSt9type_info'].value;
  __ZTSSt9type_info = Module['__ZTSSt9type_info'] = wasmExports['_ZTSSt9type_info'].value;
  __ZTSSt8bad_cast = Module['__ZTSSt8bad_cast'] = wasmExports['_ZTSSt8bad_cast'].value;
  __ZTSSt10bad_typeid = Module['__ZTSSt10bad_typeid'] = wasmExports['_ZTSSt10bad_typeid'].value;
}

var wasmImports = {
  /** @export */
  __call_sighandler: ___call_sighandler,
  /** @export */
  __syscall_fcntl64: ___syscall_fcntl64,
  /** @export */
  __syscall_ftruncate64: ___syscall_ftruncate64,
  /** @export */
  __syscall_ioctl: ___syscall_ioctl,
  /** @export */
  __syscall_mkdirat: ___syscall_mkdirat,
  /** @export */
  __syscall_openat: ___syscall_openat,
  /** @export */
  _abort_js: __abort_js,
  /** @export */
  _emscripten_get_progname: __emscripten_get_progname,
  /** @export */
  _emscripten_runtime_keepalive_clear: __emscripten_runtime_keepalive_clear,
  /** @export */
  _mmap_js: __mmap_js,
  /** @export */
  _munmap_js: __munmap_js,
  /** @export */
  _setitimer_js: __setitimer_js,
  /** @export */
  _tzset_js: __tzset_js,
  /** @export */
  emscripten_resize_heap: _emscripten_resize_heap,
  /** @export */
  environ_get: _environ_get,
  /** @export */
  environ_sizes_get: _environ_sizes_get,
  /** @export */
  fd_close: _fd_close,
  /** @export */
  fd_read: _fd_read,
  /** @export */
  fd_seek: _fd_seek,
  /** @export */
  fd_write: _fd_write,
  /** @export */
  proc_exit: _proc_exit
};


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

var calledRun;

function callMain() {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
  assert(typeof onPreRuns === 'undefined' || onPreRuns.length == 0, 'cannot call main when preRun functions remain to be called');

  var entryFunction = _main;

  var argc = 0;
  var argv = 0;

  try {

    var ret = entryFunction(argc, argv);

    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true);
    return ret;
  } catch (e) {
    return handleException(e);
  }
}

function stackCheckInit() {
  // This is normally called automatically during __wasm_call_ctors but need to
  // get these values before even running any of the ctors so we call it redundantly
  // here.
  _emscripten_stack_init();
  // TODO(sbc): Move writeStackCookie to native to to avoid this.
  writeStackCookie();
}

function run() {

  if (runDependencies > 0) {
    dependenciesFulfilled = run;
    return;
  }

  stackCheckInit();

  preRun();

  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    dependenciesFulfilled = run;
    return;
  }

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    assert(!calledRun);
    calledRun = true;
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    preMain();

    Module['onRuntimeInitialized']?.();
    consumedModuleProp('onRuntimeInitialized');

    var noInitialRun = Module['noInitialRun'] || false;
    if (!noInitialRun) callMain();

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(() => {
      setTimeout(() => Module['setStatus'](''), 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
  checkStackCookie();
}

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var oldOut = out;
  var oldErr = err;
  var has = false;
  out = err = (x) => {
    has = true;
  }
  try { // it doesn't matter if it fails
    _fflush(0);
    // also flush in the JS FS layer
    for (var name of ['stdout', 'stderr']) {
      var info = FS.analyzePath('/dev/' + name);
      if (!info) return;
      var stream = info.object;
      var rdev = stream.rdev;
      var tty = TTY.ttys[rdev];
      if (tty?.output?.length) {
        has = true;
      }
    }
  } catch(e) {}
  out = oldOut;
  err = oldErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.');
  }
}

var wasmExports;

// With async instantation wasmExports is assigned asynchronously when the
// instance is received.
createWasm();

run();

// end include: postamble.js

