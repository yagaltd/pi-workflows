/* dragology v0.1.7 — vendored self-contained ESM bundle (MIT). Source: ~/Documents/vibe/drag/dragology (github.com/…dragology), build: esbuild src/lib.ts --bundle --format=esm --external:react --external:react-dom --external:react/jsx-runtime.
 * MIT License — Copyright (c) see dragology LICENSE. React/ReactDOM remain peer imports, resolved by Ultimate's vite. */
// src/jsx.d.ts
import "react";

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_freeGlobal.js
var freeGlobal = typeof global == "object" && global && global.Object === Object && global, freeGlobal_default = freeGlobal;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_root.js
var freeSelf = typeof self == "object" && self && self.Object === Object && self, root = freeGlobal_default || freeSelf || Function("return this")(), root_default = root;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Symbol.js
var Symbol2 = root_default.Symbol, Symbol_default = Symbol2;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getRawTag.js
var objectProto = Object.prototype, hasOwnProperty = objectProto.hasOwnProperty, nativeObjectToString = objectProto.toString, symToStringTag = Symbol_default ? Symbol_default.toStringTag : void 0;
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
  try {
    value[symToStringTag] = void 0;
    var unmasked = !0;
  } catch {
  }
  var result = nativeObjectToString.call(value);
  return unmasked && (isOwn ? value[symToStringTag] = tag : delete value[symToStringTag]), result;
}
var getRawTag_default = getRawTag;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_objectToString.js
var objectProto2 = Object.prototype, nativeObjectToString2 = objectProto2.toString;
function objectToString(value) {
  return nativeObjectToString2.call(value);
}
var objectToString_default = objectToString;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseGetTag.js
var nullTag = "[object Null]", undefinedTag = "[object Undefined]", symToStringTag2 = Symbol_default ? Symbol_default.toStringTag : void 0;
function baseGetTag(value) {
  return value == null ? value === void 0 ? undefinedTag : nullTag : symToStringTag2 && symToStringTag2 in Object(value) ? getRawTag_default(value) : objectToString_default(value);
}
var baseGetTag_default = baseGetTag;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isObjectLike.js
function isObjectLike(value) {
  return value != null && typeof value == "object";
}
var isObjectLike_default = isObjectLike;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isSymbol.js
var symbolTag = "[object Symbol]";
function isSymbol(value) {
  return typeof value == "symbol" || isObjectLike_default(value) && baseGetTag_default(value) == symbolTag;
}
var isSymbol_default = isSymbol;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_arrayMap.js
function arrayMap(array, iteratee) {
  for (var index = -1, length = array == null ? 0 : array.length, result = Array(length); ++index < length; )
    result[index] = iteratee(array[index], index, array);
  return result;
}
var arrayMap_default = arrayMap;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isArray.js
var isArray = Array.isArray, isArray_default = isArray;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseToString.js
var INFINITY = 1 / 0, symbolProto = Symbol_default ? Symbol_default.prototype : void 0, symbolToString = symbolProto ? symbolProto.toString : void 0;
function baseToString(value) {
  if (typeof value == "string")
    return value;
  if (isArray_default(value))
    return arrayMap_default(value, baseToString) + "";
  if (isSymbol_default(value))
    return symbolToString ? symbolToString.call(value) : "";
  var result = value + "";
  return result == "0" && 1 / value == -INFINITY ? "-0" : result;
}
var baseToString_default = baseToString;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_trimmedEndIndex.js
var reWhitespace = /\s/;
function trimmedEndIndex(string) {
  for (var index = string.length; index-- && reWhitespace.test(string.charAt(index)); )
    ;
  return index;
}
var trimmedEndIndex_default = trimmedEndIndex;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseTrim.js
var reTrimStart = /^\s+/;
function baseTrim(string) {
  return string && string.slice(0, trimmedEndIndex_default(string) + 1).replace(reTrimStart, "");
}
var baseTrim_default = baseTrim;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isObject.js
function isObject(value) {
  var type = typeof value;
  return value != null && (type == "object" || type == "function");
}
var isObject_default = isObject;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/toNumber.js
var NAN = NaN, reIsBadHex = /^[-+]0x[0-9a-f]+$/i, reIsBinary = /^0b[01]+$/i, reIsOctal = /^0o[0-7]+$/i, freeParseInt = parseInt;
function toNumber(value) {
  if (typeof value == "number")
    return value;
  if (isSymbol_default(value))
    return NAN;
  if (isObject_default(value)) {
    var other = typeof value.valueOf == "function" ? value.valueOf() : value;
    value = isObject_default(other) ? other + "" : other;
  }
  if (typeof value != "string")
    return value === 0 ? value : +value;
  value = baseTrim_default(value);
  var isBinary = reIsBinary.test(value);
  return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
}
var toNumber_default = toNumber;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/toFinite.js
var INFINITY2 = 1 / 0, MAX_INTEGER = 17976931348623157e292;
function toFinite(value) {
  if (!value)
    return value === 0 ? value : 0;
  if (value = toNumber_default(value), value === INFINITY2 || value === -INFINITY2) {
    var sign = value < 0 ? -1 : 1;
    return sign * MAX_INTEGER;
  }
  return value === value ? value : 0;
}
var toFinite_default = toFinite;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/identity.js
function identity(value) {
  return value;
}
var identity_default = identity;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isFunction.js
var asyncTag = "[object AsyncFunction]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", proxyTag = "[object Proxy]";
function isFunction(value) {
  if (!isObject_default(value))
    return !1;
  var tag = baseGetTag_default(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}
var isFunction_default = isFunction;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_coreJsData.js
var coreJsData = root_default["__core-js_shared__"], coreJsData_default = coreJsData;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_isMasked.js
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData_default && coreJsData_default.keys && coreJsData_default.keys.IE_PROTO || "");
  return uid ? "Symbol(src)_1." + uid : "";
})();
function isMasked(func) {
  return !!maskSrcKey && maskSrcKey in func;
}
var isMasked_default = isMasked;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_toSource.js
var funcProto = Function.prototype, funcToString = funcProto.toString;
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch {
    }
    try {
      return func + "";
    } catch {
    }
  }
  return "";
}
var toSource_default = toSource;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseIsNative.js
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g, reIsHostCtor = /^\[object .+?Constructor\]$/, funcProto2 = Function.prototype, objectProto3 = Object.prototype, funcToString2 = funcProto2.toString, hasOwnProperty2 = objectProto3.hasOwnProperty, reIsNative = RegExp(
  "^" + funcToString2.call(hasOwnProperty2).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
);
function baseIsNative(value) {
  if (!isObject_default(value) || isMasked_default(value))
    return !1;
  var pattern = isFunction_default(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource_default(value));
}
var baseIsNative_default = baseIsNative;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getValue.js
function getValue(object, key) {
  return object?.[key];
}
var getValue_default = getValue;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getNative.js
function getNative(object, key) {
  var value = getValue_default(object, key);
  return baseIsNative_default(value) ? value : void 0;
}
var getNative_default = getNative;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_WeakMap.js
var WeakMap2 = getNative_default(root_default, "WeakMap"), WeakMap_default = WeakMap2;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_isIndex.js
var MAX_SAFE_INTEGER = 9007199254740991, reIsUint = /^(?:0|[1-9]\d*)$/;
function isIndex(value, length) {
  var type = typeof value;
  return length = length ?? MAX_SAFE_INTEGER, !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && value > -1 && value % 1 == 0 && value < length;
}
var isIndex_default = isIndex;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/eq.js
function eq(value, other) {
  return value === other || value !== value && other !== other;
}
var eq_default = eq;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isLength.js
var MAX_SAFE_INTEGER2 = 9007199254740991;
function isLength(value) {
  return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER2;
}
var isLength_default = isLength;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isArrayLike.js
function isArrayLike(value) {
  return value != null && isLength_default(value.length) && !isFunction_default(value);
}
var isArrayLike_default = isArrayLike;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_isIterateeCall.js
function isIterateeCall(value, index, object) {
  if (!isObject_default(object))
    return !1;
  var type = typeof index;
  return (type == "number" ? isArrayLike_default(object) && isIndex_default(index, object.length) : type == "string" && index in object) ? eq_default(object[index], value) : !1;
}
var isIterateeCall_default = isIterateeCall;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_isPrototype.js
var objectProto4 = Object.prototype;
function isPrototype(value) {
  var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto4;
  return value === proto;
}
var isPrototype_default = isPrototype;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseTimes.js
function baseTimes(n, iteratee) {
  for (var index = -1, result = Array(n); ++index < n; )
    result[index] = iteratee(index);
  return result;
}
var baseTimes_default = baseTimes;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseIsArguments.js
var argsTag = "[object Arguments]";
function baseIsArguments(value) {
  return isObjectLike_default(value) && baseGetTag_default(value) == argsTag;
}
var baseIsArguments_default = baseIsArguments;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isArguments.js
var objectProto5 = Object.prototype, hasOwnProperty3 = objectProto5.hasOwnProperty, propertyIsEnumerable = objectProto5.propertyIsEnumerable, isArguments = baseIsArguments_default(/* @__PURE__ */ (function() {
  return arguments;
})()) ? baseIsArguments_default : function(value) {
  return isObjectLike_default(value) && hasOwnProperty3.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
}, isArguments_default = isArguments;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/stubFalse.js
function stubFalse() {
  return !1;
}
var stubFalse_default = stubFalse;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isBuffer.js
var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports, freeModule = freeExports && typeof module == "object" && module && !module.nodeType && module, moduleExports = freeModule && freeModule.exports === freeExports, Buffer = moduleExports ? root_default.Buffer : void 0, nativeIsBuffer = Buffer ? Buffer.isBuffer : void 0, isBuffer = nativeIsBuffer || stubFalse_default, isBuffer_default = isBuffer;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseIsTypedArray.js
var argsTag2 = "[object Arguments]", arrayTag = "[object Array]", boolTag = "[object Boolean]", dateTag = "[object Date]", errorTag = "[object Error]", funcTag2 = "[object Function]", mapTag = "[object Map]", numberTag = "[object Number]", objectTag = "[object Object]", regexpTag = "[object RegExp]", setTag = "[object Set]", stringTag = "[object String]", weakMapTag = "[object WeakMap]", arrayBufferTag = "[object ArrayBuffer]", dataViewTag = "[object DataView]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]", typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = !0;
typedArrayTags[argsTag2] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag2] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = !1;
function baseIsTypedArray(value) {
  return isObjectLike_default(value) && isLength_default(value.length) && !!typedArrayTags[baseGetTag_default(value)];
}
var baseIsTypedArray_default = baseIsTypedArray;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseUnary.js
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}
var baseUnary_default = baseUnary;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_nodeUtil.js
var freeExports2 = typeof exports == "object" && exports && !exports.nodeType && exports, freeModule2 = freeExports2 && typeof module == "object" && module && !module.nodeType && module, moduleExports2 = freeModule2 && freeModule2.exports === freeExports2, freeProcess = moduleExports2 && freeGlobal_default.process, nodeUtil = (function() {
  try {
    var types = freeModule2 && freeModule2.require && freeModule2.require("util").types;
    return types || freeProcess && freeProcess.binding && freeProcess.binding("util");
  } catch {
  }
})(), nodeUtil_default = nodeUtil;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isTypedArray.js
var nodeIsTypedArray = nodeUtil_default && nodeUtil_default.isTypedArray, isTypedArray = nodeIsTypedArray ? baseUnary_default(nodeIsTypedArray) : baseIsTypedArray_default, isTypedArray_default = isTypedArray;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_arrayLikeKeys.js
var objectProto6 = Object.prototype, hasOwnProperty4 = objectProto6.hasOwnProperty;
function arrayLikeKeys(value, inherited) {
  var isArr = isArray_default(value), isArg = !isArr && isArguments_default(value), isBuff = !isArr && !isArg && isBuffer_default(value), isType = !isArr && !isArg && !isBuff && isTypedArray_default(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes_default(value.length, String) : [], length = result.length;
  for (var key in value)
    (inherited || hasOwnProperty4.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
    (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
    isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
    isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
    isIndex_default(key, length))) && result.push(key);
  return result;
}
var arrayLikeKeys_default = arrayLikeKeys;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_overArg.js
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}
var overArg_default = overArg;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_nativeKeys.js
var nativeKeys = overArg_default(Object.keys, Object), nativeKeys_default = nativeKeys;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseKeys.js
var objectProto7 = Object.prototype, hasOwnProperty5 = objectProto7.hasOwnProperty;
function baseKeys(object) {
  if (!isPrototype_default(object))
    return nativeKeys_default(object);
  var result = [];
  for (var key in Object(object))
    hasOwnProperty5.call(object, key) && key != "constructor" && result.push(key);
  return result;
}
var baseKeys_default = baseKeys;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/keys.js
function keys(object) {
  return isArrayLike_default(object) ? arrayLikeKeys_default(object) : baseKeys_default(object);
}
var keys_default = keys;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_isKey.js
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/;
function isKey(value, object) {
  if (isArray_default(value))
    return !1;
  var type = typeof value;
  return type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol_default(value) ? !0 : reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
}
var isKey_default = isKey;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_nativeCreate.js
var nativeCreate = getNative_default(Object, "create"), nativeCreate_default = nativeCreate;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_hashClear.js
function hashClear() {
  this.__data__ = nativeCreate_default ? nativeCreate_default(null) : {}, this.size = 0;
}
var hashClear_default = hashClear;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_hashDelete.js
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  return this.size -= result ? 1 : 0, result;
}
var hashDelete_default = hashDelete;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_hashGet.js
var HASH_UNDEFINED = "__lodash_hash_undefined__", objectProto8 = Object.prototype, hasOwnProperty6 = objectProto8.hasOwnProperty;
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate_default) {
    var result = data[key];
    return result === HASH_UNDEFINED ? void 0 : result;
  }
  return hasOwnProperty6.call(data, key) ? data[key] : void 0;
}
var hashGet_default = hashGet;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_hashHas.js
var objectProto9 = Object.prototype, hasOwnProperty7 = objectProto9.hasOwnProperty;
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate_default ? data[key] !== void 0 : hasOwnProperty7.call(data, key);
}
var hashHas_default = hashHas;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_hashSet.js
var HASH_UNDEFINED2 = "__lodash_hash_undefined__";
function hashSet(key, value) {
  var data = this.__data__;
  return this.size += this.has(key) ? 0 : 1, data[key] = nativeCreate_default && value === void 0 ? HASH_UNDEFINED2 : value, this;
}
var hashSet_default = hashSet;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Hash.js
function Hash(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  for (this.clear(); ++index < length; ) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
Hash.prototype.clear = hashClear_default;
Hash.prototype.delete = hashDelete_default;
Hash.prototype.get = hashGet_default;
Hash.prototype.has = hashHas_default;
Hash.prototype.set = hashSet_default;
var Hash_default = Hash;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_listCacheClear.js
function listCacheClear() {
  this.__data__ = [], this.size = 0;
}
var listCacheClear_default = listCacheClear;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_assocIndexOf.js
function assocIndexOf(array, key) {
  for (var length = array.length; length--; )
    if (eq_default(array[length][0], key))
      return length;
  return -1;
}
var assocIndexOf_default = assocIndexOf;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_listCacheDelete.js
var arrayProto = Array.prototype, splice = arrayProto.splice;
function listCacheDelete(key) {
  var data = this.__data__, index = assocIndexOf_default(data, key);
  if (index < 0)
    return !1;
  var lastIndex = data.length - 1;
  return index == lastIndex ? data.pop() : splice.call(data, index, 1), --this.size, !0;
}
var listCacheDelete_default = listCacheDelete;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_listCacheGet.js
function listCacheGet(key) {
  var data = this.__data__, index = assocIndexOf_default(data, key);
  return index < 0 ? void 0 : data[index][1];
}
var listCacheGet_default = listCacheGet;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_listCacheHas.js
function listCacheHas(key) {
  return assocIndexOf_default(this.__data__, key) > -1;
}
var listCacheHas_default = listCacheHas;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_listCacheSet.js
function listCacheSet(key, value) {
  var data = this.__data__, index = assocIndexOf_default(data, key);
  return index < 0 ? (++this.size, data.push([key, value])) : data[index][1] = value, this;
}
var listCacheSet_default = listCacheSet;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_ListCache.js
function ListCache(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  for (this.clear(); ++index < length; ) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
ListCache.prototype.clear = listCacheClear_default;
ListCache.prototype.delete = listCacheDelete_default;
ListCache.prototype.get = listCacheGet_default;
ListCache.prototype.has = listCacheHas_default;
ListCache.prototype.set = listCacheSet_default;
var ListCache_default = ListCache;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Map.js
var Map2 = getNative_default(root_default, "Map"), Map_default = Map2;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_mapCacheClear.js
function mapCacheClear() {
  this.size = 0, this.__data__ = {
    hash: new Hash_default(),
    map: new (Map_default || ListCache_default)(),
    string: new Hash_default()
  };
}
var mapCacheClear_default = mapCacheClear;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_isKeyable.js
function isKeyable(value) {
  var type = typeof value;
  return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
}
var isKeyable_default = isKeyable;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getMapData.js
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable_default(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
}
var getMapData_default = getMapData;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_mapCacheDelete.js
function mapCacheDelete(key) {
  var result = getMapData_default(this, key).delete(key);
  return this.size -= result ? 1 : 0, result;
}
var mapCacheDelete_default = mapCacheDelete;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_mapCacheGet.js
function mapCacheGet(key) {
  return getMapData_default(this, key).get(key);
}
var mapCacheGet_default = mapCacheGet;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_mapCacheHas.js
function mapCacheHas(key) {
  return getMapData_default(this, key).has(key);
}
var mapCacheHas_default = mapCacheHas;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_mapCacheSet.js
function mapCacheSet(key, value) {
  var data = getMapData_default(this, key), size = data.size;
  return data.set(key, value), this.size += data.size == size ? 0 : 1, this;
}
var mapCacheSet_default = mapCacheSet;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_MapCache.js
function MapCache(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  for (this.clear(); ++index < length; ) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
MapCache.prototype.clear = mapCacheClear_default;
MapCache.prototype.delete = mapCacheDelete_default;
MapCache.prototype.get = mapCacheGet_default;
MapCache.prototype.has = mapCacheHas_default;
MapCache.prototype.set = mapCacheSet_default;
var MapCache_default = MapCache;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/memoize.js
var FUNC_ERROR_TEXT = "Expected a function";
function memoize(func, resolver) {
  if (typeof func != "function" || resolver != null && typeof resolver != "function")
    throw new TypeError(FUNC_ERROR_TEXT);
  var memoized = function() {
    var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
    if (cache.has(key))
      return cache.get(key);
    var result = func.apply(this, args);
    return memoized.cache = cache.set(key, result) || cache, result;
  };
  return memoized.cache = new (memoize.Cache || MapCache_default)(), memoized;
}
memoize.Cache = MapCache_default;
var memoize_default = memoize;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_memoizeCapped.js
var MAX_MEMOIZE_SIZE = 500;
function memoizeCapped(func) {
  var result = memoize_default(func, function(key) {
    return cache.size === MAX_MEMOIZE_SIZE && cache.clear(), key;
  }), cache = result.cache;
  return result;
}
var memoizeCapped_default = memoizeCapped;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_stringToPath.js
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g, reEscapeChar = /\\(\\)?/g, stringToPath = memoizeCapped_default(function(string) {
  var result = [];
  return string.charCodeAt(0) === 46 && result.push(""), string.replace(rePropName, function(match, number, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
  }), result;
}), stringToPath_default = stringToPath;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/toString.js
function toString(value) {
  return value == null ? "" : baseToString_default(value);
}
var toString_default = toString;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_castPath.js
function castPath(value, object) {
  return isArray_default(value) ? value : isKey_default(value, object) ? [value] : stringToPath_default(toString_default(value));
}
var castPath_default = castPath;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_toKey.js
var INFINITY3 = 1 / 0;
function toKey(value) {
  if (typeof value == "string" || isSymbol_default(value))
    return value;
  var result = value + "";
  return result == "0" && 1 / value == -INFINITY3 ? "-0" : result;
}
var toKey_default = toKey;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseGet.js
function baseGet(object, path2) {
  path2 = castPath_default(path2, object);
  for (var index = 0, length = path2.length; object != null && index < length; )
    object = object[toKey_default(path2[index++])];
  return index && index == length ? object : void 0;
}
var baseGet_default = baseGet;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/get.js
function get(object, path2, defaultValue) {
  var result = object == null ? void 0 : baseGet_default(object, path2);
  return result === void 0 ? defaultValue : result;
}
var get_default = get;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_arrayPush.js
function arrayPush(array, values) {
  for (var index = -1, length = values.length, offset = array.length; ++index < length; )
    array[offset + index] = values[index];
  return array;
}
var arrayPush_default = arrayPush;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_stackClear.js
function stackClear() {
  this.__data__ = new ListCache_default(), this.size = 0;
}
var stackClear_default = stackClear;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_stackDelete.js
function stackDelete(key) {
  var data = this.__data__, result = data.delete(key);
  return this.size = data.size, result;
}
var stackDelete_default = stackDelete;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_stackGet.js
function stackGet(key) {
  return this.__data__.get(key);
}
var stackGet_default = stackGet;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_stackHas.js
function stackHas(key) {
  return this.__data__.has(key);
}
var stackHas_default = stackHas;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_stackSet.js
var LARGE_ARRAY_SIZE = 200;
function stackSet(key, value) {
  var data = this.__data__;
  if (data instanceof ListCache_default) {
    var pairs = data.__data__;
    if (!Map_default || pairs.length < LARGE_ARRAY_SIZE - 1)
      return pairs.push([key, value]), this.size = ++data.size, this;
    data = this.__data__ = new MapCache_default(pairs);
  }
  return data.set(key, value), this.size = data.size, this;
}
var stackSet_default = stackSet;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Stack.js
function Stack(entries) {
  var data = this.__data__ = new ListCache_default(entries);
  this.size = data.size;
}
Stack.prototype.clear = stackClear_default;
Stack.prototype.delete = stackDelete_default;
Stack.prototype.get = stackGet_default;
Stack.prototype.has = stackHas_default;
Stack.prototype.set = stackSet_default;
var Stack_default = Stack;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_arrayFilter.js
function arrayFilter(array, predicate) {
  for (var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = []; ++index < length; ) {
    var value = array[index];
    predicate(value, index, array) && (result[resIndex++] = value);
  }
  return result;
}
var arrayFilter_default = arrayFilter;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/stubArray.js
function stubArray() {
  return [];
}
var stubArray_default = stubArray;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getSymbols.js
var objectProto10 = Object.prototype, propertyIsEnumerable2 = objectProto10.propertyIsEnumerable, nativeGetSymbols = Object.getOwnPropertySymbols, getSymbols = nativeGetSymbols ? function(object) {
  return object == null ? [] : (object = Object(object), arrayFilter_default(nativeGetSymbols(object), function(symbol) {
    return propertyIsEnumerable2.call(object, symbol);
  }));
} : stubArray_default, getSymbols_default = getSymbols;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseGetAllKeys.js
function baseGetAllKeys(object, keysFunc, symbolsFunc) {
  var result = keysFunc(object);
  return isArray_default(object) ? result : arrayPush_default(result, symbolsFunc(object));
}
var baseGetAllKeys_default = baseGetAllKeys;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getAllKeys.js
function getAllKeys(object) {
  return baseGetAllKeys_default(object, keys_default, getSymbols_default);
}
var getAllKeys_default = getAllKeys;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_DataView.js
var DataView = getNative_default(root_default, "DataView"), DataView_default = DataView;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Promise.js
var Promise2 = getNative_default(root_default, "Promise"), Promise_default = Promise2;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Set.js
var Set2 = getNative_default(root_default, "Set"), Set_default = Set2;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getTag.js
var mapTag2 = "[object Map]", objectTag2 = "[object Object]", promiseTag = "[object Promise]", setTag2 = "[object Set]", weakMapTag2 = "[object WeakMap]", dataViewTag2 = "[object DataView]", dataViewCtorString = toSource_default(DataView_default), mapCtorString = toSource_default(Map_default), promiseCtorString = toSource_default(Promise_default), setCtorString = toSource_default(Set_default), weakMapCtorString = toSource_default(WeakMap_default), getTag = baseGetTag_default;
(DataView_default && getTag(new DataView_default(new ArrayBuffer(1))) != dataViewTag2 || Map_default && getTag(new Map_default()) != mapTag2 || Promise_default && getTag(Promise_default.resolve()) != promiseTag || Set_default && getTag(new Set_default()) != setTag2 || WeakMap_default && getTag(new WeakMap_default()) != weakMapTag2) && (getTag = function(value) {
  var result = baseGetTag_default(value), Ctor = result == objectTag2 ? value.constructor : void 0, ctorString = Ctor ? toSource_default(Ctor) : "";
  if (ctorString)
    switch (ctorString) {
      case dataViewCtorString:
        return dataViewTag2;
      case mapCtorString:
        return mapTag2;
      case promiseCtorString:
        return promiseTag;
      case setCtorString:
        return setTag2;
      case weakMapCtorString:
        return weakMapTag2;
    }
  return result;
});
var getTag_default = getTag;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Uint8Array.js
var Uint8Array2 = root_default.Uint8Array, Uint8Array_default = Uint8Array2;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_setCacheAdd.js
var HASH_UNDEFINED3 = "__lodash_hash_undefined__";
function setCacheAdd(value) {
  return this.__data__.set(value, HASH_UNDEFINED3), this;
}
var setCacheAdd_default = setCacheAdd;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_setCacheHas.js
function setCacheHas(value) {
  return this.__data__.has(value);
}
var setCacheHas_default = setCacheHas;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_SetCache.js
function SetCache(values) {
  var index = -1, length = values == null ? 0 : values.length;
  for (this.__data__ = new MapCache_default(); ++index < length; )
    this.add(values[index]);
}
SetCache.prototype.add = SetCache.prototype.push = setCacheAdd_default;
SetCache.prototype.has = setCacheHas_default;
var SetCache_default = SetCache;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_arraySome.js
function arraySome(array, predicate) {
  for (var index = -1, length = array == null ? 0 : array.length; ++index < length; )
    if (predicate(array[index], index, array))
      return !0;
  return !1;
}
var arraySome_default = arraySome;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_cacheHas.js
function cacheHas(cache, key) {
  return cache.has(key);
}
var cacheHas_default = cacheHas;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_equalArrays.js
var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG, arrLength = array.length, othLength = other.length;
  if (arrLength != othLength && !(isPartial && othLength > arrLength))
    return !1;
  var arrStacked = stack.get(array), othStacked = stack.get(other);
  if (arrStacked && othStacked)
    return arrStacked == other && othStacked == array;
  var index = -1, result = !0, seen = bitmask & COMPARE_UNORDERED_FLAG ? new SetCache_default() : void 0;
  for (stack.set(array, other), stack.set(other, array); ++index < arrLength; ) {
    var arrValue = array[index], othValue = other[index];
    if (customizer)
      var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
    if (compared !== void 0) {
      if (compared)
        continue;
      result = !1;
      break;
    }
    if (seen) {
      if (!arraySome_default(other, function(othValue2, othIndex) {
        if (!cacheHas_default(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack)))
          return seen.push(othIndex);
      })) {
        result = !1;
        break;
      }
    } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
      result = !1;
      break;
    }
  }
  return stack.delete(array), stack.delete(other), result;
}
var equalArrays_default = equalArrays;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_mapToArray.js
function mapToArray(map) {
  var index = -1, result = Array(map.size);
  return map.forEach(function(value, key) {
    result[++index] = [key, value];
  }), result;
}
var mapToArray_default = mapToArray;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_setToArray.js
function setToArray(set2) {
  var index = -1, result = Array(set2.size);
  return set2.forEach(function(value) {
    result[++index] = value;
  }), result;
}
var setToArray_default = setToArray;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_equalByTag.js
var COMPARE_PARTIAL_FLAG2 = 1, COMPARE_UNORDERED_FLAG2 = 2, boolTag2 = "[object Boolean]", dateTag2 = "[object Date]", errorTag2 = "[object Error]", mapTag3 = "[object Map]", numberTag2 = "[object Number]", regexpTag2 = "[object RegExp]", setTag3 = "[object Set]", stringTag2 = "[object String]", symbolTag2 = "[object Symbol]", arrayBufferTag2 = "[object ArrayBuffer]", dataViewTag3 = "[object DataView]", symbolProto2 = Symbol_default ? Symbol_default.prototype : void 0, symbolValueOf = symbolProto2 ? symbolProto2.valueOf : void 0;
function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
  switch (tag) {
    case dataViewTag3:
      if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset)
        return !1;
      object = object.buffer, other = other.buffer;
    case arrayBufferTag2:
      return !(object.byteLength != other.byteLength || !equalFunc(new Uint8Array_default(object), new Uint8Array_default(other)));
    case boolTag2:
    case dateTag2:
    case numberTag2:
      return eq_default(+object, +other);
    case errorTag2:
      return object.name == other.name && object.message == other.message;
    case regexpTag2:
    case stringTag2:
      return object == other + "";
    case mapTag3:
      var convert = mapToArray_default;
    case setTag3:
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG2;
      if (convert || (convert = setToArray_default), object.size != other.size && !isPartial)
        return !1;
      var stacked = stack.get(object);
      if (stacked)
        return stacked == other;
      bitmask |= COMPARE_UNORDERED_FLAG2, stack.set(object, other);
      var result = equalArrays_default(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
      return stack.delete(object), result;
    case symbolTag2:
      if (symbolValueOf)
        return symbolValueOf.call(object) == symbolValueOf.call(other);
  }
  return !1;
}
var equalByTag_default = equalByTag;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_equalObjects.js
var COMPARE_PARTIAL_FLAG3 = 1, objectProto11 = Object.prototype, hasOwnProperty8 = objectProto11.hasOwnProperty;
function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG3, objProps = getAllKeys_default(object), objLength = objProps.length, othProps = getAllKeys_default(other), othLength = othProps.length;
  if (objLength != othLength && !isPartial)
    return !1;
  for (var index = objLength; index--; ) {
    var key = objProps[index];
    if (!(isPartial ? key in other : hasOwnProperty8.call(other, key)))
      return !1;
  }
  var objStacked = stack.get(object), othStacked = stack.get(other);
  if (objStacked && othStacked)
    return objStacked == other && othStacked == object;
  var result = !0;
  stack.set(object, other), stack.set(other, object);
  for (var skipCtor = isPartial; ++index < objLength; ) {
    key = objProps[index];
    var objValue = object[key], othValue = other[key];
    if (customizer)
      var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
    if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
      result = !1;
      break;
    }
    skipCtor || (skipCtor = key == "constructor");
  }
  if (result && !skipCtor) {
    var objCtor = object.constructor, othCtor = other.constructor;
    objCtor != othCtor && "constructor" in object && "constructor" in other && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor) && (result = !1);
  }
  return stack.delete(object), stack.delete(other), result;
}
var equalObjects_default = equalObjects;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseIsEqualDeep.js
var COMPARE_PARTIAL_FLAG4 = 1, argsTag3 = "[object Arguments]", arrayTag2 = "[object Array]", objectTag3 = "[object Object]", objectProto12 = Object.prototype, hasOwnProperty9 = objectProto12.hasOwnProperty;
function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
  var objIsArr = isArray_default(object), othIsArr = isArray_default(other), objTag = objIsArr ? arrayTag2 : getTag_default(object), othTag = othIsArr ? arrayTag2 : getTag_default(other);
  objTag = objTag == argsTag3 ? objectTag3 : objTag, othTag = othTag == argsTag3 ? objectTag3 : othTag;
  var objIsObj = objTag == objectTag3, othIsObj = othTag == objectTag3, isSameTag = objTag == othTag;
  if (isSameTag && isBuffer_default(object)) {
    if (!isBuffer_default(other))
      return !1;
    objIsArr = !0, objIsObj = !1;
  }
  if (isSameTag && !objIsObj)
    return stack || (stack = new Stack_default()), objIsArr || isTypedArray_default(object) ? equalArrays_default(object, other, bitmask, customizer, equalFunc, stack) : equalByTag_default(object, other, objTag, bitmask, customizer, equalFunc, stack);
  if (!(bitmask & COMPARE_PARTIAL_FLAG4)) {
    var objIsWrapped = objIsObj && hasOwnProperty9.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty9.call(other, "__wrapped__");
    if (objIsWrapped || othIsWrapped) {
      var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
      return stack || (stack = new Stack_default()), equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
    }
  }
  return isSameTag ? (stack || (stack = new Stack_default()), equalObjects_default(object, other, bitmask, customizer, equalFunc, stack)) : !1;
}
var baseIsEqualDeep_default = baseIsEqualDeep;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseIsEqual.js
function baseIsEqual(value, other, bitmask, customizer, stack) {
  return value === other ? !0 : value == null || other == null || !isObjectLike_default(value) && !isObjectLike_default(other) ? value !== value && other !== other : baseIsEqualDeep_default(value, other, bitmask, customizer, baseIsEqual, stack);
}
var baseIsEqual_default = baseIsEqual;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseIsMatch.js
var COMPARE_PARTIAL_FLAG5 = 1, COMPARE_UNORDERED_FLAG3 = 2;
function baseIsMatch(object, source, matchData, customizer) {
  var index = matchData.length, length = index, noCustomizer = !customizer;
  if (object == null)
    return !length;
  for (object = Object(object); index--; ) {
    var data = matchData[index];
    if (noCustomizer && data[2] ? data[1] !== object[data[0]] : !(data[0] in object))
      return !1;
  }
  for (; ++index < length; ) {
    data = matchData[index];
    var key = data[0], objValue = object[key], srcValue = data[1];
    if (noCustomizer && data[2]) {
      if (objValue === void 0 && !(key in object))
        return !1;
    } else {
      var stack = new Stack_default();
      if (customizer)
        var result = customizer(objValue, srcValue, key, object, source, stack);
      if (!(result === void 0 ? baseIsEqual_default(srcValue, objValue, COMPARE_PARTIAL_FLAG5 | COMPARE_UNORDERED_FLAG3, customizer, stack) : result))
        return !1;
    }
  }
  return !0;
}
var baseIsMatch_default = baseIsMatch;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_isStrictComparable.js
function isStrictComparable(value) {
  return value === value && !isObject_default(value);
}
var isStrictComparable_default = isStrictComparable;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getMatchData.js
function getMatchData(object) {
  for (var result = keys_default(object), length = result.length; length--; ) {
    var key = result[length], value = object[key];
    result[length] = [key, value, isStrictComparable_default(value)];
  }
  return result;
}
var getMatchData_default = getMatchData;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_matchesStrictComparable.js
function matchesStrictComparable(key, srcValue) {
  return function(object) {
    return object == null ? !1 : object[key] === srcValue && (srcValue !== void 0 || key in Object(object));
  };
}
var matchesStrictComparable_default = matchesStrictComparable;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseMatches.js
function baseMatches(source) {
  var matchData = getMatchData_default(source);
  return matchData.length == 1 && matchData[0][2] ? matchesStrictComparable_default(matchData[0][0], matchData[0][1]) : function(object) {
    return object === source || baseIsMatch_default(object, source, matchData);
  };
}
var baseMatches_default = baseMatches;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseHasIn.js
function baseHasIn(object, key) {
  return object != null && key in Object(object);
}
var baseHasIn_default = baseHasIn;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_hasPath.js
function hasPath(object, path2, hasFunc) {
  path2 = castPath_default(path2, object);
  for (var index = -1, length = path2.length, result = !1; ++index < length; ) {
    var key = toKey_default(path2[index]);
    if (!(result = object != null && hasFunc(object, key)))
      break;
    object = object[key];
  }
  return result || ++index != length ? result : (length = object == null ? 0 : object.length, !!length && isLength_default(length) && isIndex_default(key, length) && (isArray_default(object) || isArguments_default(object)));
}
var hasPath_default = hasPath;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/hasIn.js
function hasIn(object, path2) {
  return object != null && hasPath_default(object, path2, baseHasIn_default);
}
var hasIn_default = hasIn;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseMatchesProperty.js
var COMPARE_PARTIAL_FLAG6 = 1, COMPARE_UNORDERED_FLAG4 = 2;
function baseMatchesProperty(path2, srcValue) {
  return isKey_default(path2) && isStrictComparable_default(srcValue) ? matchesStrictComparable_default(toKey_default(path2), srcValue) : function(object) {
    var objValue = get_default(object, path2);
    return objValue === void 0 && objValue === srcValue ? hasIn_default(object, path2) : baseIsEqual_default(srcValue, objValue, COMPARE_PARTIAL_FLAG6 | COMPARE_UNORDERED_FLAG4);
  };
}
var baseMatchesProperty_default = baseMatchesProperty;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseProperty.js
function baseProperty(key) {
  return function(object) {
    return object?.[key];
  };
}
var baseProperty_default = baseProperty;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_basePropertyDeep.js
function basePropertyDeep(path2) {
  return function(object) {
    return baseGet_default(object, path2);
  };
}
var basePropertyDeep_default = basePropertyDeep;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/property.js
function property(path2) {
  return isKey_default(path2) ? baseProperty_default(toKey_default(path2)) : basePropertyDeep_default(path2);
}
var property_default = property;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseIteratee.js
function baseIteratee(value) {
  return typeof value == "function" ? value : value == null ? identity_default : typeof value == "object" ? isArray_default(value) ? baseMatchesProperty_default(value[0], value[1]) : baseMatches_default(value) : property_default(value);
}
var baseIteratee_default = baseIteratee;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isEqual.js
function isEqual(value, other) {
  return baseIsEqual_default(value, other);
}
var isEqual_default = isEqual;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseLt.js
function baseLt(value, other) {
  return value < other;
}
var baseLt_default = baseLt;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseExtremum.js
function baseExtremum(array, iteratee, comparator) {
  for (var index = -1, length = array.length; ++index < length; ) {
    var value = array[index], current2 = iteratee(value);
    if (current2 != null && (computed === void 0 ? current2 === current2 && !isSymbol_default(current2) : comparator(current2, computed)))
      var computed = current2, result = value;
  }
  return result;
}
var baseExtremum_default = baseExtremum;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/minBy.js
function minBy(array, iteratee) {
  return array && array.length ? baseExtremum_default(array, baseIteratee_default(iteratee, 2), baseLt_default) : void 0;
}
var minBy_default = minBy;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseRange.js
var nativeCeil = Math.ceil, nativeMax = Math.max;
function baseRange(start, end, step, fromRight) {
  for (var index = -1, length = nativeMax(nativeCeil((end - start) / (step || 1)), 0), result = Array(length); length--; )
    result[fromRight ? length : ++index] = start, start += step;
  return result;
}
var baseRange_default = baseRange;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_createRange.js
function createRange(fromRight) {
  return function(start, end, step) {
    return step && typeof step != "number" && isIterateeCall_default(start, end, step) && (end = step = void 0), start = toFinite_default(start), end === void 0 ? (end = start, start = 0) : end = toFinite_default(end), step = step === void 0 ? start < end ? 1 : -1 : toFinite_default(step), baseRange_default(start, end, step, fromRight);
  };
}
var createRange_default = createRange;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/range.js
var range = createRange_default(), range_default = range;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/reverse.js
var arrayProto2 = Array.prototype, nativeReverse = arrayProto2.reverse;
function reverse(array) {
  return array == null ? array : nativeReverse.call(array);
}
var reverse_default = reverse;

// src/DraggableRenderer.tsx
import {
  useCallback as useCallback3,
  useEffect as useEffect2,
  useLayoutEffect,
  useMemo,
  useRef as useRef3,
  useState as useState3
} from "react";

// src/DragSpecTreeView.tsx
import { createContext as createContext2, useContext } from "react";

// src/studio/StudioHackContext.tsx
import { createContext } from "react";
var StudioHackContext = createContext({});

// src/svgx/layers.tsx
import { cloneElement, Fragment } from "react";

// src/svgx/index.ts
import React from "react";

// src/svgx/transform.ts
import { createElement } from "react";

// src/ErrorBoundary.tsx
import { Component, createRef } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
var ErrorWithJSX = class extends Error {
  jsx;
  constructor(message, jsx24) {
    super(message), this.name = "ErrorWithJSX", this.jsx = jsx24;
  }
}, ErrorBoundary = class extends Component {
  state = {
    hasError: !1,
    error: null,
    errorInfo: null,
    copied: !1
  };
  jsxRef = createRef();
  copiedTimeout = null;
  /**
   * Plain-text rendering of the whole error: message, the JSX body
   * (via the DOM's innerText, so line breaks and <pre> formatting
   * survive), stack trace, and component stack.
   */
  errorAsText() {
    let { error, errorInfo } = this.state;
    if (!error) return "";
    let parts = [`Error: ${error.message}`], jsxText = this.jsxRef.current?.innerText.trim();
    return jsxText && parts.push(jsxText), error.stack && parts.push(`Stack trace:
${error.stack}`), errorInfo?.componentStack && parts.push(`Component stack:${errorInfo.componentStack}`), parts.join(`

`);
  }
  copy = async () => {
    let text = this.errorAsText();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      let ta = document.createElement("textarea");
      ta.value = text, document.body.appendChild(ta), ta.select(), document.execCommand("copy"), ta.remove();
    }
    this.setState({ copied: !0 }), this.copiedTimeout && clearTimeout(this.copiedTimeout), this.copiedTimeout = setTimeout(
      () => this.setState({ copied: !1 }),
      1500
    );
  };
  static getDerivedStateFromError(error) {
    return { hasError: !0, error, errorInfo: null };
  }
  componentDidCatch(error, errorInfo) {
    console.error(error, errorInfo), this.setState({ error, errorInfo });
  }
  componentDidUpdate(prevProps) {
    this.state.hasError && this.props.resetOnChange !== prevProps.resetOnChange && this.reset();
  }
  reset = () => {
    this.setState({
      hasError: !1,
      error: null,
      errorInfo: null,
      copied: !1
    });
  };
  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback)
        return this.props.fallback(this.state.error, this.state.errorInfo);
      let error = this.state.error, isErrorWithJSX = error instanceof ErrorWithJSX;
      return /* @__PURE__ */ jsxs(
        "div",
        {
          style: {
            border: "1px solid rgb(252, 165, 165)",
            background: "rgb(254, 242, 242)",
            borderRadius: 6,
            padding: 16,
            margin: 16,
            userSelect: "text",
            alignSelf: "flex-start",
            minWidth: 0
          },
          children: [
            /* @__PURE__ */ jsxs(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8
                },
                children: [
                  /* @__PURE__ */ jsxs(
                    "div",
                    {
                      style: {
                        fontWeight: 600,
                        color: "rgb(153, 27, 27)",
                        fontSize: "1.125rem"
                      },
                      children: [
                        "Error: ",
                        error.message
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexShrink: 0 }, children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: this.copy,
                        title: "Copy the whole error as plain text",
                        style: {
                          padding: "4px 12px",
                          background: "white",
                          color: "rgb(153, 27, 27)",
                          borderRadius: 6,
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          border: "1px solid rgb(252, 165, 165)",
                          cursor: "pointer",
                          minWidth: 72
                        },
                        children: this.state.copied ? "Copied!" : "Copy"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: this.reset,
                        style: {
                          padding: "4px 12px",
                          background: "rgb(220, 38, 38)",
                          color: "white",
                          borderRadius: 6,
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          border: "none",
                          cursor: "pointer"
                        },
                        children: "Reset"
                      }
                    )
                  ] })
                ]
              }
            ),
            isErrorWithJSX && /* @__PURE__ */ jsx("div", { ref: this.jsxRef, style: { marginTop: 12, marginBottom: 12 }, children: error.jsx }),
            error.stack && /* @__PURE__ */ jsxs("details", { style: { marginTop: 12 }, children: [
              /* @__PURE__ */ jsx(
                "summary",
                {
                  style: {
                    cursor: "pointer",
                    color: "rgb(185, 28, 28)",
                    fontWeight: 500,
                    marginBottom: 4
                  },
                  children: "Stack Trace"
                }
              ),
              /* @__PURE__ */ jsx(
                "pre",
                {
                  style: {
                    fontSize: "0.75rem",
                    background: "rgb(254, 226, 226)",
                    padding: 12,
                    borderRadius: 6,
                    overflowX: "auto",
                    color: "rgb(127, 29, 29)",
                    marginTop: 8
                  },
                  children: error.stack
                }
              )
            ] }),
            this.state.errorInfo?.componentStack && /* @__PURE__ */ jsxs("details", { style: { marginTop: 12 }, children: [
              /* @__PURE__ */ jsx(
                "summary",
                {
                  style: {
                    cursor: "pointer",
                    color: "rgb(185, 28, 28)",
                    fontWeight: 500,
                    marginBottom: 4
                  },
                  children: "Component Stack"
                }
              ),
              /* @__PURE__ */ jsx(
                "pre",
                {
                  style: {
                    fontSize: "0.75rem",
                    background: "rgb(254, 226, 226)",
                    padding: 12,
                    borderRadius: 6,
                    overflowX: "auto",
                    color: "rgb(127, 29, 29)",
                    marginTop: 8
                  },
                  children: this.state.errorInfo.componentStack
                }
              )
            ] })
          ]
        }
      );
    }
    return this.props.children;
  }
};

// src/utils/index.ts
import { memo } from "react";
function clamp(a, b, c) {
  return a + b + c - Math.max(a, b, c) - Math.min(a, b, c);
}
function adjPairs(l) {
  let result = [];
  for (let i = 0; i < l.length - 1; i++)
    result.push([l[i], l[i + 1]]);
  return result;
}

// src/utils/assert.ts
function assertNever(_never, message) {
  throw new Error(
    message || `Reached unreachable code: unexpected value ${_never}`
  );
}
function assert(condition, msg) {
  if (!condition)
    throw typeof msg == "function" ? (console.group("Assertion failed; debug info:"), msg(), console.groupEnd(), new Error("Assertion failed")) : new Error(msg ?? "Assertion failed");
}
function assertDefined(x, msg) {
  if (x == null)
    throw typeof msg == "function" ? (console.group("Assertion failed; debug info:"), msg(), console.groupEnd(), new Error("Assertion failed: value is undefined or null")) : new Error(msg ?? "Assertion failed: value is undefined or null");
  return x;
}
function assertWarning(condition, msg) {
  condition || (typeof msg == "function" ? (console.group("Warning assertion failed; debug info:"), msg(), console.groupEnd()) : console.warn("Warning assertion failed:", msg || ""));
}

// src/math/vec2.ts
function Vec2(...args) {
  let [xOrXY, y] = args;
  if (typeof xOrXY == "number")
    return y === void 0 ? new Vec2Class(xOrXY, xOrXY) : new Vec2Class(xOrXY, y);
  if (isVec2(xOrXY))
    return xOrXY;
  if (typeof xOrXY == "object" && "x" in xOrXY && "y" in xOrXY)
    return new Vec2Class(xOrXY.x, xOrXY.y);
  if (isArrayWithTwoNumbers(xOrXY))
    return new Vec2Class(xOrXY[0], xOrXY[1]);
  assertNever(xOrXY);
}
((Vec22) => {
  function polarRad(r, angleRad) {
    return Vec22(r, 0).rotateRad(angleRad);
  }
  Vec22.polarRad = polarRad;
  function polarDeg(r, angleDeg) {
    return Vec22(r, 0).rotateDeg(angleDeg);
  }
  Vec22.polarDeg = polarDeg;
})(Vec2 ||= {});
function isArrayWithTwoNumbers(value) {
  return Array.isArray(value) && value.length === 2 && typeof value[0] == "number" && typeof value[1] == "number";
}
function isVec2(value) {
  return value instanceof Vec2Class;
}
var Vec2Class = class {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  x;
  y;
  // # extraction
  *[Symbol.iterator]() {
    yield this.x, yield this.y;
  }
  /**
   * Return as a pair [x, y], for splicing into argument lists.
   */
  arr() {
    return [this.x, this.y];
  }
  /**
   * Return as a string "x,y" (or with an alternative separator).
   */
  str(sep = ",") {
    return `${this.x}${sep}${this.y}`;
  }
  /**
   * Return as an object { x, y }.
   */
  xy() {
    return { x: this.x, y: this.y };
  }
  /**
   * Return as a "point 1" object { x1: x, y1: y }, for splicing into
   * `<line>`.
   */
  xy1() {
    return { x1: this.x, y1: this.y };
  }
  /**
   * Return as a "point 2" object { x2: x, y2: y }, for splicing into
   * `<line>`.
   */
  xy2() {
    return { x2: this.x, y2: this.y };
  }
  /**
   * Return as a "center" object { cx: x, cy: y }, for splicing into
   * `<circle>`.
   */
  cxy() {
    return { cx: this.x, cy: this.y };
  }
  // # operations
  eq(v2) {
    return v2 = Vec2(v2), this.x === v2.x && this.y === v2.y;
  }
  add(...vs) {
    let result = this;
    for (let v2 of vs) {
      let vec2 = Vec2(v2);
      result = Vec2(result.x + vec2.x, result.y + vec2.y);
    }
    return result;
  }
  sub(v2) {
    return v2 = Vec2(v2), Vec2(this.x - v2.x, this.y - v2.y);
  }
  mul(n) {
    return Vec2(this.x * n, this.y * n);
  }
  div(n) {
    return Vec2(this.x / n, this.y / n);
  }
  scale(v2) {
    return v2 = Vec2(v2), Vec2(this.x * v2.x, this.y * v2.y);
  }
  dot(v2) {
    return v2 = Vec2(v2), this.x * v2.x + this.y * v2.y;
  }
  cross(v2) {
    return v2 = Vec2(v2), this.x * v2.y - this.y * v2.x;
  }
  len2() {
    return this.dot(this);
  }
  len() {
    return Math.hypot(this.x, this.y);
  }
  norm() {
    return this.div(this.len());
  }
  withLen(length) {
    return this.norm().mul(length);
  }
  angleRad() {
    return Math.atan2(this.y, this.x);
  }
  angleDeg() {
    return radToDeg(this.angleRad());
  }
  angleToRad(v2) {
    return v2 = Vec2(v2), Math.atan2(v2.y - this.y, v2.x - this.x);
  }
  angleToDeg(v2) {
    return radToDeg(this.angleToRad(v2));
  }
  dist2(v2) {
    return v2 = Vec2(v2), this.sub(v2).len2();
  }
  dist(v2) {
    return v2 = Vec2(v2), this.sub(v2).len();
  }
  lerp(v2, t) {
    return v2 = Vec2(v2), Vec2(lerp(this.x, v2.x, t), lerp(this.y, v2.y, t));
  }
  mid(v2) {
    return this.lerp(v2, 0.5);
  }
  projOnto(v2) {
    let v22 = Vec2(v2), scalar = this.dot(v22) / v22.len2();
    return v22.mul(scalar);
  }
  /**
   * Thinking of `this` and `v` as points, return the point a
   * distance `d` from `this` toward `v`.
   */
  towards(v2, d) {
    let v22 = Vec2(v2);
    return this.add(v22.sub(this).norm().mul(d));
  }
  /** Rotated a quarter turn: exactly (-y, x). */
  perp() {
    return Vec2(-this.y, this.x);
  }
  rotateRad(angleRad) {
    let cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
    return Vec2(this.x * cosA - this.y * sinA, this.x * sinA + this.y * cosA);
  }
  rotateDeg(angleDeg) {
    return this.rotateRad(degToRad(angleDeg));
  }
  round() {
    return Vec2(Math.round(this.x), Math.round(this.y));
  }
  clamp(a, b) {
    return a = Vec2(a), b = Vec2(b), Vec2(clamp(a.x, b.x, this.x), clamp(a.y, b.y, this.y));
  }
};
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function degToRad(deg) {
  return deg * Math.PI / 180;
}
function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

// src/svgx/transform.ts
function parseTransform(str) {
  if (!str || str.trim() === "") return [];
  let transforms = [], regex = /(\w+)\s*\(([^)]+)\)/g, match;
  for (; (match = regex.exec(str)) !== null; ) {
    let type = match[1], args = match[2].split(/[\s,]+/).map((s) => parseFloat(s.trim()));
    switch (type) {
      case "translate":
        transforms.push({
          type: "translate",
          x: args[0] || 0,
          y: args[1] || 0
        });
        break;
      case "rotate":
        transforms.push({
          type: "rotate",
          degrees: args[0] || 0,
          cx: args[1] || 0,
          cy: args[2] || 0
        });
        break;
      case "scale":
        transforms.push({
          type: "scale",
          x: args[0] ?? 1,
          y: args[1] ?? args[0] ?? 1
        });
        break;
    }
  }
  return transforms;
}
var resolveTransformsLike = (t) => Array.isArray(t) ? t : parseTransform(t);
function localToGlobal(transformsLike, able) {
  let transforms = resolveTransformsLike(transformsLike), point = Vec2(able);
  for (let t of transforms.slice().reverse())
    switch (t.type) {
      case "translate":
        point = point.add([t.x, t.y]);
        break;
      case "rotate":
        point = point.sub([t.cx ?? 0, t.cy ?? 0]).rotateDeg(t.degrees).add([t.cx ?? 0, t.cy ?? 0]);
        break;
      case "scale":
        point = point.scale([t.x, t.y]);
        break;
    }
  return point;
}
function globalToLocal(transformsLike, able) {
  let transforms = resolveTransformsLike(transformsLike), point = Vec2(able);
  for (let t of transforms)
    switch (t.type) {
      case "translate":
        point = point.sub([t.x, t.y]);
        break;
      case "rotate":
        point = point.sub([t.cx ?? 0, t.cy ?? 0]).rotateDeg(-t.degrees).add([t.cx ?? 0, t.cy ?? 0]);
        break;
      case "scale":
        point = point.scale([1 / t.x, 1 / t.y]);
        break;
    }
  return point;
}
function combineTransforms(t12, t22) {
  return !t12 && !t22 ? "" : t12 ? t22 ? t12 + " " + t22 : t12 : t22;
}
function serializeTransform(transforms) {
  return transforms.map((t) => {
    switch (t.type) {
      case "translate":
        return `translate(${t.x}, ${t.y})`;
      case "rotate":
        return `rotate(${t.degrees}, ${t.cx}, ${t.cy})`;
      case "scale":
        return t.x === t.y ? `scale(${t.x})` : `scale(${t.x}, ${t.y})`;
    }
  }).join(" ");
}
function lerpTransforms(a, b, t) {
  if (a = collapseTranslations(a), b = collapseTranslations(b), a.length !== b.length)
    throw new ErrorWithJSX(
      `Cannot lerp transforms with different lengths: ${a.length} vs ${b.length}`,
      [
        a.map((t4) => [serializeTransform([t4]), createElement("br")]),
        "vs",
        createElement("br"),
        b.map((t4) => [serializeTransform([t4]), createElement("br")])
      ]
    );
  let result = [];
  for (let i = 0; i < a.length; i++) {
    let ta = a[i], tb = b[i];
    if (ta.type !== tb.type)
      throw new ErrorWithJSX(
        `Cannot lerp transforms with different types at index ${i}: ${ta.type} vs ${tb.type}`,
        [
          `a: ${serializeTransform(a)}`,
          createElement("br"),
          `b: ${serializeTransform(b)}`
        ]
      );
    switch (ta.type) {
      case "translate":
        assert(tb.type === "translate"), result.push({
          type: "translate",
          x: lerp(ta.x, tb.x, t),
          y: lerp(ta.y, tb.y, t)
        });
        break;
      case "rotate": {
        assert(tb.type === "rotate"), result.push({
          type: "rotate",
          degrees: lerpDegrees(ta.degrees, tb.degrees, t),
          cx: lerp(ta.cx, tb.cx, t),
          cy: lerp(ta.cy, tb.cy, t)
        });
        break;
      }
      case "scale":
        assert(tb.type === "scale"), result.push({
          type: "scale",
          x: lerp(ta.x, tb.x, t),
          y: lerp(ta.y, tb.y, t)
        });
        break;
    }
  }
  return result;
}
function lerpDegrees(a, b, t) {
  let delta = ((b - a) % 360 + 540) % 360 - 180;
  return a + delta * t;
}
function collapseTranslations(transforms) {
  let result = [];
  for (let t of transforms) {
    let prev = result[result.length - 1];
    t.type === "translate" && prev?.type === "translate" ? result[result.length - 1] = {
      type: "translate",
      x: prev.x + t.x,
      y: prev.y + t.y
    } : result.push(t);
  }
  return result;
}
function lerpTransformString(a, b, t) {
  if (!a && !b) return "";
  let transformsA = parseTransform(a), transformsB = parseTransform(b);
  if (transformsA.length === 0 && transformsB.every((t4) => t4.type === "translate")) {
    let lerpedTransforms2 = lerpTransforms(
      [{ type: "translate", x: 0, y: 0 }],
      transformsB,
      t
    );
    return serializeTransform(lerpedTransforms2);
  }
  if (transformsB.length === 0 && transformsA.every((t4) => t4.type === "translate")) {
    let lerpedTransforms2 = lerpTransforms(
      transformsA,
      [{ type: "translate", x: 0, y: 0 }],
      t
    );
    return serializeTransform(lerpedTransforms2);
  }
  let aHasScale = transformsA.some((t4) => t4.type === "scale"), bHasScale = transformsB.some((t4) => t4.type === "scale");
  if (aHasScale || bHasScale) {
    let normA = collapseTranslations(transformsA), normB = collapseTranslations(transformsB), aHasTranslate = normA.some((t4) => t4.type === "translate"), bHasTranslate = normB.some((t4) => t4.type === "translate");
    return aHasTranslate && !bHasTranslate ? normB = [{ type: "translate", x: 0, y: 0 }, ...normB] : bHasTranslate && !aHasTranslate && (normA = [{ type: "translate", x: 0, y: 0 }, ...normA]), aHasScale || (normA = [...normA, { type: "scale", x: 1, y: 1 }]), bHasScale || (normB = [...normB, { type: "scale", x: 1, y: 1 }]), serializeTransform(lerpTransforms(normA, normB, t));
  }
  if (!a) return b;
  if (!b) return a;
  let lerpedTransforms = lerpTransforms(transformsA, transformsB, t);
  return serializeTransform(lerpedTransforms);
}

// src/svgx/index.ts
function isValidSvgx(element) {
  return React.isValidElement(element);
}
function isComponentElement(element) {
  return typeof element.type != "string" && element.type !== React.Fragment;
}
function assertNoDragologyKeyOnComponent(element) {
  if (isComponentElement(element) && element.props.dragologyKey !== void 0)
    throw new Error(
      `<${elementName(element)}> has a dragologyKey, which only works on intrinsic elements. Wrap it in a <g dragologyKey=\u2026> instead.`
    );
}
function assertForeignObjectHoldsComponents(element) {
  if (element.type === "foreignObject")
    for (let child of React.Children.toArray(element.props.children)) {
      if (React.isValidElement(child) && isComponentElement(child))
        continue;
      let what = React.isValidElement(child) ? `<${elementName(child)}>` : JSON.stringify(child);
      throw new Error(
        `<foreignObject> contains ${what}, but it may only contain component elements. Move the HTML into a component.`
      );
    }
}
function elementName(element) {
  let type = element.type;
  return typeof type == "string" ? type : type.displayName ?? type.name;
}
function shouldRecurseIntoChildren(element) {
  return !isComponentElement(element) && element.type !== "defs" && !element.props.dragologyOpaque;
}
function childrenToArray(children) {
  let out = [], visit = (node, prefix) => {
    if (Array.isArray(node))
      node.forEach(
        (child, i) => visit(child, prefix === "" ? `.${i}` : `${prefix}:${i}`)
      );
    else {
      if (node == null || typeof node == "boolean")
        return;
      if (React.isValidElement(node) && node.key == null)
        out.push(React.cloneElement(node, { key: prefix || ".0" }));
      else {
        if (React.isValidElement(node) && !node.key.startsWith("."))
          throw new Error(
            `<${elementName(node)}> has a key prop (${node.key}). Draggables match elements by id or dragologyKey, not key.`
          );
        out.push(node);
      }
    }
  };
  return visit(children, ""), out;
}
function updateElement(element, childFn, newProps) {
  let { children } = element.props;
  if (childFn && children && shouldRecurseIntoChildren(element)) {
    let childrenArray = childrenToArray(children), someChildChanged = !1, newChildren = childrenArray.map((child, index) => {
      if (React.isValidElement(child)) {
        let updated = childFn(child, index);
        return updated !== child && (someChildChanged = !0), updated;
      } else
        return child;
    });
    someChildChanged && (newProps = { ...newProps, children: newChildren });
  }
  if (!newProps) return element;
  let merged = { ...element.props, ...newProps }, cleaned = {};
  for (let [k, v2] of Object.entries(merged))
    v2 !== void 0 && (cleaned[k] = v2);
  return element.key != null && (cleaned.key = element.key), React.createElement(element.type, cleaned);
}
function findElement(element, predicate, accumulatedTransform = "", ancestors = []) {
  let elementTransform = element.props.transform || "", newAccumulatedTransform = combineTransforms(
    accumulatedTransform,
    elementTransform
  );
  if (predicate(element))
    return {
      element,
      accumulatedTransform: newAccumulatedTransform,
      ancestors
    };
  let childAncestors = [...ancestors, element];
  if (shouldRecurseIntoChildren(element)) {
    let children = React.Children.toArray(element.props.children);
    for (let child of children)
      if (React.isValidElement(child)) {
        let found = findElement(
          child,
          predicate,
          newAccumulatedTransform,
          childAncestors
        );
        if (found) return found;
      }
  }
  return null;
}
function updatePropsDownTree(element, mapFn) {
  return updateElement(
    element,
    (child) => updatePropsDownTree(child, mapFn),
    mapFn(element)
  );
}

// src/utils/js.ts
function objectKeys(obj) {
  return Object.keys(obj);
}
function isArray2(x) {
  return Array.isArray(x);
}

// src/svgx/path.ts
var pathPropName = "data-path";
function getPath(element) {
  return element.props[pathPropName];
}
function assignPaths(element) {
  return assignPathsRecursive(element, "/");
}
function assignPathsRecursive(element, currentPath2) {
  let id = isComponentElement(element) ? void 0 : element.props.id;
  assert(
    !id || !id.includes("/"),
    `Element id "${id}" contains a slash, which is not allowed.`
  );
  let elementPath = id ? id + "/" : currentPath2;
  assert(
    !(typeof element.key == "string" && !element.key.startsWith(".")),
    `Element with path "${elementPath}" has a key prop (${element.key}), which is not allowed.`
  ), assertForeignObjectHoldsComponents(element);
  let usedSteps = /* @__PURE__ */ new Set(), unkeyedIndex = 0;
  return updateElement(
    element,
    (child) => {
      assertNoDragologyKeyOnComponent(child);
      let step, { dragologyKey } = child.props;
      return dragologyKey !== void 0 ? (assert(
        !dragologyKey.includes("/"),
        `Element dragologyKey "${dragologyKey}" contains a slash, which is not allowed.`
      ), step = dragologyKey) : (step = String(unkeyedIndex), unkeyedIndex++), assert(
        !usedSteps.has(step),
        `Duplicate path step "${step}" among siblings of path "${elementPath}" (can happen when a dragologyKey collides with an unkeyed sibling's index).`
      ), usedSteps.add(step), assignPathsRecursive(child, elementPath + step + "/");
    },
    {
      [pathPropName]: elementPath
    }
  );
}
function findByPath(path2, node) {
  return findElement(node, (el) => getPath(el) === path2);
}

// src/svgx/layers.tsx
import { Fragment as Fragment2, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function layerSvg(element) {
  let byId = /* @__PURE__ */ new Map(), descendents = /* @__PURE__ */ new Map(), rootWithExtractedRemoved = extractIdNodes(
    element,
    byId,
    descendents,
    null,
    "",
    1,
    []
  );
  return rootWithExtractedRemoved && (byId = new Map([
    ["", { element: rootWithExtractedRemoved, stackingPath: [] }],
    ...byId
  ])), { byId, descendents };
}
function parseAbsoluteZIndex(value) {
  return assert(
    /^\/(-?\d+)$/.test(value),
    `Invalid absolute dragologyZIndex "${value}". Expected format: "/<integer>" (e.g. "/5", "/-3").`
  ), parseInt(value.slice(1), 10);
}
function extractIdNodes(element, byId, descendents, ancestorId, accumulatedTransform, accumulatedOpacity, stackingPath) {
  let props = element.props;
  if (props.dragologyZIndex !== void 0 && !props.id)
    throw new Error(
      `dragologyZIndex can only be set on elements with an id attribute. Found dragologyZIndex="${props.dragologyZIndex}" on <${element.type}> without id.`
    );
  let currentId = isComponentElement(element) ? void 0 : props.id, newAncestorId = currentId || ancestorId, elementTransform = props.transform || "", newAccumulatedTransform = combineTransforms(
    accumulatedTransform,
    elementTransform
  ), elementOpacity = props.opacity !== void 0 ? Number(props.opacity) : 1, newAccumulatedOpacity = accumulatedOpacity * elementOpacity, newStackingPath = stackingPath;
  if (currentId) {
    let zIndex = props.dragologyZIndex;
    typeof zIndex == "string" ? newStackingPath = [parseAbsoluteZIndex(zIndex)] : newStackingPath = [...stackingPath, zIndex || 0];
  }
  let newElement = updateElement(
    element,
    (child) => extractIdNodes(
      child,
      byId,
      descendents,
      newAncestorId,
      newAccumulatedTransform,
      newAccumulatedOpacity,
      newStackingPath
    )
  );
  if (currentId) {
    if (assert(
      !byId.has(currentId),
      `Duplicate id "${currentId}" found in SVG tree. Each element must have a unique id.`
    ), ancestorId && (descendents.has(ancestorId) || descendents.set(ancestorId, /* @__PURE__ */ new Set()), descendents.get(ancestorId).add(currentId), descendents.has(currentId)))
      for (let desc of descendents.get(currentId))
        descendents.get(ancestorId).add(desc);
    let layerElement = cloneElement(newElement, {
      // However many tree passes produced this element (each one
      // re-keys children), it should reconcile as the same layer.
      key: currentId,
      transform: newAccumulatedTransform || void 0,
      opacity: newAccumulatedOpacity !== 1 ? newAccumulatedOpacity : void 0
    });
    return byId.set(currentId, {
      element: layerElement,
      stackingPath: newStackingPath
    }), null;
  } else
    return newElement;
}
function compareStackingPaths(a, b) {
  let len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++)
    if (a[i] !== b[i]) return a[i] - b[i];
  return a.length === b.length ? 0 : a.length > b.length ? a[len] >= 0 ? 1 : -1 : b[len] >= 0 ? -1 : 1;
}
function drawLayered(layered) {
  return /* @__PURE__ */ jsx2(Fragment2, { children: Array.from(layered.byId.entries()).sort(
    ([_keyA, layerA], [_keyB, layerB]) => compareStackingPaths(layerA.stackingPath, layerB.stackingPath)
  ).map(([key, layer]) => /* @__PURE__ */ jsx2(Fragment, { children: updatePropsDownTree(layer.element, (el) => {
    assert(
      el.type !== Fragment,
      "Please use <g> rather than <Fragment> / <> in draggables."
    );
    let newProps = {};
    for (let propName of objectKeys(el.props))
      propName.startsWith("dragology") && (newProps[propName] = void 0);
    return newProps;
  }) }, key)) });
}
function layeredExtract(layered, id) {
  if (assert(layered.descendents !== null, "layered.descendents is null"), !layered.byId.has(id))
    throw new ErrorWithJSX(
      `Layered SVG does not contain id "${id}"`,
      /* @__PURE__ */ jsxs2("p", { children: [
        "Available ids: ",
        /* @__PURE__ */ jsx2("code", { children: [...layered.byId.keys()].join(", ") })
      ] })
    );
  let extractedIds = /* @__PURE__ */ new Set([id]);
  if (layered.descendents.has(id))
    for (let descId of layered.descendents.get(id))
      extractedIds.add(descId);
  let extractedById = /* @__PURE__ */ new Map(), remainingById = /* @__PURE__ */ new Map();
  for (let [key, value] of layered.byId.entries())
    extractedIds.has(key) ? extractedById.set(key, value) : remainingById.set(key, value);
  let extractedDescendents = /* @__PURE__ */ new Map(), remainingDescendents = /* @__PURE__ */ new Map();
  for (let [ancestorId, descIds] of layered.descendents.entries()) {
    let isAncestorExtracted = extractedIds.has(ancestorId), filteredDescs = /* @__PURE__ */ new Set();
    for (let descId of descIds) {
      let isDescExtracted = extractedIds.has(descId);
      isAncestorExtracted === isDescExtracted && filteredDescs.add(descId);
    }
    filteredDescs.size > 0 && (isAncestorExtracted ? extractedDescendents.set(ancestorId, filteredDescs) : remainingDescendents.set(ancestorId, filteredDescs));
  }
  return {
    remaining: { byId: remainingById, descendents: remainingDescendents },
    extracted: { byId: extractedById, descendents: extractedDescendents }
  };
}
function layeredMerge(h1, h2) {
  let mergedById = new Map(h1.byId);
  for (let [key, value] of h2.byId.entries())
    assert(
      !mergedById.has(key),
      `Cannot merge LayeredSvgx: duplicate id "${key}" found`
    ), mergedById.set(key, value);
  return { byId: mergedById, descendents: null };
}
function layeredTransform(layered, transform) {
  let transformedById = /* @__PURE__ */ new Map();
  for (let [key, layer] of layered.byId.entries()) {
    let elementTransform = layer.element.props.transform || "", newTransform = combineTransforms(transform, elementTransform), transformedElement = cloneElement(layer.element, {
      transform: newTransform || void 0
    });
    transformedById.set(key, { ...layer, element: transformedElement });
  }
  return { byId: transformedById, descendents: layered.descendents };
}
function layeredPrefixIds(layered, prefix) {
  let prefixedById = /* @__PURE__ */ new Map();
  for (let [key, layer] of layered.byId.entries()) {
    let newId = prefix + key, prefixedElement = cloneElement(layer.element, {
      id: newId,
      "data-path": newId + "/"
    });
    prefixedById.set(newId, { ...layer, element: prefixedElement });
  }
  return { byId: prefixedById, descendents: null };
}
function layeredShiftZIndices(layered, shift) {
  let shiftedById = /* @__PURE__ */ new Map();
  for (let [key, layer] of layered.byId.entries())
    shiftedById.set(key, {
      ...layer,
      stackingPath: [shift, ...layer.stackingPath]
    });
  return { ...layered, byId: shiftedById };
}
function layeredSetAttributes(layered, attrs) {
  let newById = /* @__PURE__ */ new Map();
  for (let [key, layer] of layered.byId.entries())
    newById.set(key, { ...layer, element: cloneElement(layer.element, attrs) });
  return { ...layered, byId: newById };
}
function findByPathInLayered(path2, layered) {
  for (let layer of layered.byId.values()) {
    let found = findByPath(path2, layer.element);
    if (found) return found;
  }
  return null;
}

// src/DragSpecTreeView.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var TreeViewContext = createContext2(null);
function useTreeViewContext() {
  let ctx = useContext(TreeViewContext);
  return assert(ctx !== null, "TreeViewContext not initialized"), ctx;
}
var ACTIVE_BG = "rgba(250, 204, 21, 0.25)", ACTIVE_BORDER = "rgb(250, 204, 21)", INACTIVE_BG = "rgba(148, 163, 184, 0.08)", INACTIVE_BORDER = "rgb(203, 213, 225)";
function SpecNode({
  op,
  path: path2
}) {
  let { activePath, colorMap } = useTreeViewContext(), fullPath = path2 + op.name;
  return op.treeView({
    path: path2,
    childPath: fullPath + "/",
    active: activePath === fullPath || activePath.startsWith(fullPath + "/"),
    color: colorMap?.get(fullPath)
  });
}
function StateThumbnails({
  renderedStates,
  closestIndex
}) {
  let { svgWidth, svgHeight, thumbArea } = useTreeViewContext();
  if (svgWidth === 0 || svgHeight === 0) return null;
  let aspect = svgWidth / svgHeight, h = Math.round(Math.sqrt(thumbArea / aspect)), w = Math.round(h * aspect);
  return /* @__PURE__ */ jsx3(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "row",
        gap: 3,
        flexWrap: "wrap",
        marginTop: 2
      },
      children: renderedStates.map((rs, i) => /* @__PURE__ */ jsx3(
        "svg",
        {
          width: w,
          height: h,
          viewBox: `0 0 ${svgWidth} ${svgHeight}`,
          style: {
            border: "1px solid rgb(203, 213, 225)",
            borderRadius: 3,
            background: "white",
            transition: "width 150ms ease, height 150ms ease",
            ...closestIndex === i ? { outline: `2px solid ${ACTIVE_BORDER}`, outlineOffset: -1 } : {}
          },
          children: drawLayered(rs.layered)
        },
        i
      ))
    }
  );
}
function OutputThumbnail({
  outputPreview,
  active
}) {
  let { svgWidth, svgHeight, thumbArea } = useTreeViewContext();
  if (svgWidth === 0 || svgHeight === 0) return null;
  let aspect = svgWidth / svgHeight, h = Math.round(Math.sqrt(thumbArea / aspect)), w = Math.round(h * aspect);
  return /* @__PURE__ */ jsx3("div", { style: { marginTop: 2, marginBottom: 4 }, children: /* @__PURE__ */ jsxs3(
    "svg",
    {
      width: w,
      height: h,
      viewBox: `0 0 ${svgWidth} ${svgHeight}`,
      style: {
        border: "1px solid rgb(203, 213, 225)",
        borderRadius: 3,
        background: "white",
        transition: "width 150ms ease, height 150ms ease",
        ...active ? { outline: `2px solid ${ACTIVE_BORDER}`, outlineOffset: -1 } : {}
      },
      children: [
        active && /* @__PURE__ */ jsx3(
          "rect",
          {
            width: svgWidth,
            height: svgHeight,
            fill: ACTIVE_BORDER,
            opacity: 0.15
          }
        ),
        drawLayered(outputPreview)
      ]
    }
  ) });
}
function Box({
  label,
  active,
  color: color2,
  path: path2,
  children
}) {
  let { nodeProps } = useTreeViewContext(), { tightFixed } = useContext(StudioHackContext), myProps = path2 !== void 0 ? nodeProps?.[path2] : void 0, bg = color2 ? colorToAlpha(color2, 0.15) : active ? ACTIVE_BG : INACTIVE_BG, border = color2 || (active ? ACTIVE_BORDER : INACTIVE_BORDER);
  return /* @__PURE__ */ jsxs3(
    "div",
    {
      style: {
        width: myProps?.width ?? "fit-content",
        height: myProps?.height,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 6,
        padding: "4px 6px",
        transition: "background 150ms, border-color 150ms",
        ...active ? color2 ? { outline: "2px solid black", outlineOffset: 1 } : { outline: `2px solid ${ACTIVE_BORDER}`, outlineOffset: -1 } : {}
      },
      children: [
        /* @__PURE__ */ jsx3(
          "div",
          {
            style: {
              color: active && !color2 ? "rgb(161, 98, 7)" : "rgb(100, 116, 139)",
              fontWeight: active ? 600 : 400,
              marginBottom: children ? 3 : 0,
              fontSize: tightFixed ? 15 : 10
            },
            children: label
          }
        ),
        children
      ]
    }
  );
}
function Slot({
  label,
  children
}) {
  return /* @__PURE__ */ jsxs3("div", { style: { display: "flex", flexDirection: "column", gap: 1 }, children: [
    /* @__PURE__ */ jsx3("div", { style: { fontSize: 9, color: "rgb(148, 163, 184)", paddingLeft: 2 }, children: label }),
    children
  ] });
}
function describeTransition(t) {
  return t ? `${typeof t.easing == "function" ? "fn" : t.easing} ${t.duration}ms` : "none";
}
function truncate(s, maxLen) {
  return s.length <= maxLen ? s : s.slice(0, maxLen - 1) + "\u2026";
}
function colorToAlpha(rgb2, alpha) {
  let match = rgb2.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  return match ? `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})` : rgb2;
}

// node_modules/.pnpm/robust-predicates@3.0.2/node_modules/robust-predicates/esm/util.js
var epsilon = 11102230246251565e-32, splitter = 134217729, resulterrbound = (3 + 8 * epsilon) * epsilon;
function sum(elen, e, flen, f, h) {
  let Q, Qnew, hh, bvirt, enow = e[0], fnow = f[0], eindex = 0, findex = 0;
  fnow > enow == fnow > -enow ? (Q = enow, enow = e[++eindex]) : (Q = fnow, fnow = f[++findex]);
  let hindex = 0;
  if (eindex < elen && findex < flen)
    for (fnow > enow == fnow > -enow ? (Qnew = enow + Q, hh = Q - (Qnew - enow), enow = e[++eindex]) : (Qnew = fnow + Q, hh = Q - (Qnew - fnow), fnow = f[++findex]), Q = Qnew, hh !== 0 && (h[hindex++] = hh); eindex < elen && findex < flen; )
      fnow > enow == fnow > -enow ? (Qnew = Q + enow, bvirt = Qnew - Q, hh = Q - (Qnew - bvirt) + (enow - bvirt), enow = e[++eindex]) : (Qnew = Q + fnow, bvirt = Qnew - Q, hh = Q - (Qnew - bvirt) + (fnow - bvirt), fnow = f[++findex]), Q = Qnew, hh !== 0 && (h[hindex++] = hh);
  for (; eindex < elen; )
    Qnew = Q + enow, bvirt = Qnew - Q, hh = Q - (Qnew - bvirt) + (enow - bvirt), enow = e[++eindex], Q = Qnew, hh !== 0 && (h[hindex++] = hh);
  for (; findex < flen; )
    Qnew = Q + fnow, bvirt = Qnew - Q, hh = Q - (Qnew - bvirt) + (fnow - bvirt), fnow = f[++findex], Q = Qnew, hh !== 0 && (h[hindex++] = hh);
  return (Q !== 0 || hindex === 0) && (h[hindex++] = Q), hindex;
}
function estimate(elen, e) {
  let Q = e[0];
  for (let i = 1; i < elen; i++) Q += e[i];
  return Q;
}
function vec(n) {
  return new Float64Array(n);
}

// node_modules/.pnpm/robust-predicates@3.0.2/node_modules/robust-predicates/esm/orient2d.js
var ccwerrboundA = (3 + 16 * epsilon) * epsilon, ccwerrboundB = (2 + 12 * epsilon) * epsilon, ccwerrboundC = (9 + 64 * epsilon) * epsilon * epsilon, B = vec(4), C1 = vec(8), C2 = vec(12), D = vec(16), u = vec(4);
function orient2dadapt(ax, ay, bx, by, cx, cy, detsum) {
  let acxtail, acytail, bcxtail, bcytail, bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t12, t02, u32, acx = ax - cx, bcx = bx - cx, acy = ay - cy, bcy = by - cy;
  s1 = acx * bcy, c = splitter * acx, ahi = c - (c - acx), alo = acx - ahi, c = splitter * bcy, bhi = c - (c - bcy), blo = bcy - bhi, s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo), t12 = acy * bcx, c = splitter * acy, ahi = c - (c - acy), alo = acy - ahi, c = splitter * bcx, bhi = c - (c - bcx), blo = bcx - bhi, t02 = alo * blo - (t12 - ahi * bhi - alo * bhi - ahi * blo), _i = s0 - t02, bvirt = s0 - _i, B[0] = s0 - (_i + bvirt) + (bvirt - t02), _j = s1 + _i, bvirt = _j - s1, _0 = s1 - (_j - bvirt) + (_i - bvirt), _i = _0 - t12, bvirt = _0 - _i, B[1] = _0 - (_i + bvirt) + (bvirt - t12), u32 = _j + _i, bvirt = u32 - _j, B[2] = _j - (u32 - bvirt) + (_i - bvirt), B[3] = u32;
  let det = estimate(4, B), errbound = ccwerrboundB * detsum;
  if (det >= errbound || -det >= errbound || (bvirt = ax - acx, acxtail = ax - (acx + bvirt) + (bvirt - cx), bvirt = bx - bcx, bcxtail = bx - (bcx + bvirt) + (bvirt - cx), bvirt = ay - acy, acytail = ay - (acy + bvirt) + (bvirt - cy), bvirt = by - bcy, bcytail = by - (bcy + bvirt) + (bvirt - cy), acxtail === 0 && acytail === 0 && bcxtail === 0 && bcytail === 0) || (errbound = ccwerrboundC * detsum + resulterrbound * Math.abs(det), det += acx * bcytail + bcy * acxtail - (acy * bcxtail + bcx * acytail), det >= errbound || -det >= errbound)) return det;
  s1 = acxtail * bcy, c = splitter * acxtail, ahi = c - (c - acxtail), alo = acxtail - ahi, c = splitter * bcy, bhi = c - (c - bcy), blo = bcy - bhi, s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo), t12 = acytail * bcx, c = splitter * acytail, ahi = c - (c - acytail), alo = acytail - ahi, c = splitter * bcx, bhi = c - (c - bcx), blo = bcx - bhi, t02 = alo * blo - (t12 - ahi * bhi - alo * bhi - ahi * blo), _i = s0 - t02, bvirt = s0 - _i, u[0] = s0 - (_i + bvirt) + (bvirt - t02), _j = s1 + _i, bvirt = _j - s1, _0 = s1 - (_j - bvirt) + (_i - bvirt), _i = _0 - t12, bvirt = _0 - _i, u[1] = _0 - (_i + bvirt) + (bvirt - t12), u32 = _j + _i, bvirt = u32 - _j, u[2] = _j - (u32 - bvirt) + (_i - bvirt), u[3] = u32;
  let C1len = sum(4, B, 4, u, C1);
  s1 = acx * bcytail, c = splitter * acx, ahi = c - (c - acx), alo = acx - ahi, c = splitter * bcytail, bhi = c - (c - bcytail), blo = bcytail - bhi, s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo), t12 = acy * bcxtail, c = splitter * acy, ahi = c - (c - acy), alo = acy - ahi, c = splitter * bcxtail, bhi = c - (c - bcxtail), blo = bcxtail - bhi, t02 = alo * blo - (t12 - ahi * bhi - alo * bhi - ahi * blo), _i = s0 - t02, bvirt = s0 - _i, u[0] = s0 - (_i + bvirt) + (bvirt - t02), _j = s1 + _i, bvirt = _j - s1, _0 = s1 - (_j - bvirt) + (_i - bvirt), _i = _0 - t12, bvirt = _0 - _i, u[1] = _0 - (_i + bvirt) + (bvirt - t12), u32 = _j + _i, bvirt = u32 - _j, u[2] = _j - (u32 - bvirt) + (_i - bvirt), u[3] = u32;
  let C2len = sum(C1len, C1, 4, u, C2);
  s1 = acxtail * bcytail, c = splitter * acxtail, ahi = c - (c - acxtail), alo = acxtail - ahi, c = splitter * bcytail, bhi = c - (c - bcytail), blo = bcytail - bhi, s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo), t12 = acytail * bcxtail, c = splitter * acytail, ahi = c - (c - acytail), alo = acytail - ahi, c = splitter * bcxtail, bhi = c - (c - bcxtail), blo = bcxtail - bhi, t02 = alo * blo - (t12 - ahi * bhi - alo * bhi - ahi * blo), _i = s0 - t02, bvirt = s0 - _i, u[0] = s0 - (_i + bvirt) + (bvirt - t02), _j = s1 + _i, bvirt = _j - s1, _0 = s1 - (_j - bvirt) + (_i - bvirt), _i = _0 - t12, bvirt = _0 - _i, u[1] = _0 - (_i + bvirt) + (bvirt - t12), u32 = _j + _i, bvirt = u32 - _j, u[2] = _j - (u32 - bvirt) + (_i - bvirt), u[3] = u32;
  let Dlen = sum(C2len, C2, 4, u, D);
  return D[Dlen - 1];
}
function orient2d(ax, ay, bx, by, cx, cy) {
  let detleft = (ay - cy) * (bx - cx), detright = (ax - cx) * (by - cy), det = detleft - detright, detsum = Math.abs(detleft + detright);
  return Math.abs(det) >= ccwerrboundA * detsum ? det : -orient2dadapt(ax, ay, bx, by, cx, cy, detsum);
}

// node_modules/.pnpm/robust-predicates@3.0.2/node_modules/robust-predicates/esm/orient3d.js
var o3derrboundA = (7 + 56 * epsilon) * epsilon, o3derrboundB = (3 + 28 * epsilon) * epsilon, o3derrboundC = (26 + 288 * epsilon) * epsilon * epsilon, bc = vec(4), ca = vec(4), ab = vec(4), at_b = vec(4), at_c = vec(4), bt_c = vec(4), bt_a = vec(4), ct_a = vec(4), ct_b = vec(4), bct = vec(8), cat = vec(8), abt = vec(8), u2 = vec(4), _8 = vec(8), _8b = vec(8), _16 = vec(8), _12 = vec(12), fin = vec(192), fin2 = vec(192);

// node_modules/.pnpm/robust-predicates@3.0.2/node_modules/robust-predicates/esm/incircle.js
var iccerrboundA = (10 + 96 * epsilon) * epsilon, iccerrboundB = (4 + 48 * epsilon) * epsilon, iccerrboundC = (44 + 576 * epsilon) * epsilon * epsilon, bc2 = vec(4), ca2 = vec(4), ab2 = vec(4), aa = vec(4), bb = vec(4), cc = vec(4), u3 = vec(4), v = vec(4), axtbc = vec(8), aytbc = vec(8), bxtca = vec(8), bytca = vec(8), cxtab = vec(8), cytab = vec(8), abt2 = vec(8), bct2 = vec(8), cat2 = vec(8), abtt = vec(4), bctt = vec(4), catt = vec(4), _82 = vec(8), _162 = vec(16), _16b = vec(16), _16c = vec(16), _32 = vec(32), _32b = vec(32), _48 = vec(48), _64 = vec(64), fin3 = vec(1152), fin22 = vec(1152);

// node_modules/.pnpm/robust-predicates@3.0.2/node_modules/robust-predicates/esm/insphere.js
var isperrboundA = (16 + 224 * epsilon) * epsilon, isperrboundB = (5 + 72 * epsilon) * epsilon, isperrboundC = (71 + 1408 * epsilon) * epsilon * epsilon, ab3 = vec(4), bc3 = vec(4), cd = vec(4), de = vec(4), ea = vec(4), ac = vec(4), bd = vec(4), ce = vec(4), da = vec(4), eb = vec(4), abc = vec(24), bcd = vec(24), cde = vec(24), dea = vec(24), eab = vec(24), abd = vec(24), bce = vec(24), cda = vec(24), deb = vec(24), eac = vec(24), adet = vec(1152), bdet = vec(1152), cdet = vec(1152), ddet = vec(1152), edet = vec(1152), abdet = vec(2304), cddet = vec(2304), cdedet = vec(3456), deter = vec(5760), _83 = vec(8), _8b2 = vec(8), _8c = vec(8), _163 = vec(16), _24 = vec(24), _482 = vec(48), _48b = vec(48), _96 = vec(96), _192 = vec(192), _384x = vec(384), _384y = vec(384), _384z = vec(384), _768 = vec(768);
var xdet = vec(96), ydet = vec(96), zdet = vec(96), fin4 = vec(1152);

// node_modules/.pnpm/delaunator@5.0.1/node_modules/delaunator/index.js
var EPSILON = Math.pow(2, -52), EDGE_STACK = new Uint32Array(512), Delaunator = class _Delaunator {
  static from(points, getX = defaultGetX, getY = defaultGetY) {
    let n = points.length, coords = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) {
      let p = points[i];
      coords[2 * i] = getX(p), coords[2 * i + 1] = getY(p);
    }
    return new _Delaunator(coords);
  }
  constructor(coords) {
    let n = coords.length >> 1;
    if (n > 0 && typeof coords[0] != "number") throw new Error("Expected coords to contain numbers.");
    this.coords = coords;
    let maxTriangles = Math.max(2 * n - 5, 0);
    this._triangles = new Uint32Array(maxTriangles * 3), this._halfedges = new Int32Array(maxTriangles * 3), this._hashSize = Math.ceil(Math.sqrt(n)), this._hullPrev = new Uint32Array(n), this._hullNext = new Uint32Array(n), this._hullTri = new Uint32Array(n), this._hullHash = new Int32Array(this._hashSize), this._ids = new Uint32Array(n), this._dists = new Float64Array(n), this.update();
  }
  update() {
    let { coords, _hullPrev: hullPrev, _hullNext: hullNext, _hullTri: hullTri, _hullHash: hullHash } = this, n = coords.length >> 1, minX = 1 / 0, minY = 1 / 0, maxX = -1 / 0, maxY = -1 / 0;
    for (let i = 0; i < n; i++) {
      let x = coords[2 * i], y = coords[2 * i + 1];
      x < minX && (minX = x), y < minY && (minY = y), x > maxX && (maxX = x), y > maxY && (maxY = y), this._ids[i] = i;
    }
    let cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, i0, i1, i2;
    for (let i = 0, minDist = 1 / 0; i < n; i++) {
      let d = dist(cx, cy, coords[2 * i], coords[2 * i + 1]);
      d < minDist && (i0 = i, minDist = d);
    }
    let i0x = coords[2 * i0], i0y = coords[2 * i0 + 1];
    for (let i = 0, minDist = 1 / 0; i < n; i++) {
      if (i === i0) continue;
      let d = dist(i0x, i0y, coords[2 * i], coords[2 * i + 1]);
      d < minDist && d > 0 && (i1 = i, minDist = d);
    }
    let i1x = coords[2 * i1], i1y = coords[2 * i1 + 1], minRadius = 1 / 0;
    for (let i = 0; i < n; i++) {
      if (i === i0 || i === i1) continue;
      let r = circumradius(i0x, i0y, i1x, i1y, coords[2 * i], coords[2 * i + 1]);
      r < minRadius && (i2 = i, minRadius = r);
    }
    let i2x = coords[2 * i2], i2y = coords[2 * i2 + 1];
    if (minRadius === 1 / 0) {
      for (let i = 0; i < n; i++)
        this._dists[i] = coords[2 * i] - coords[0] || coords[2 * i + 1] - coords[1];
      quicksort(this._ids, this._dists, 0, n - 1);
      let hull = new Uint32Array(n), j = 0;
      for (let i = 0, d0 = -1 / 0; i < n; i++) {
        let id = this._ids[i], d = this._dists[id];
        d > d0 && (hull[j++] = id, d0 = d);
      }
      this.hull = hull.subarray(0, j), this.triangles = new Uint32Array(0), this.halfedges = new Uint32Array(0);
      return;
    }
    if (orient2d(i0x, i0y, i1x, i1y, i2x, i2y) < 0) {
      let i = i1, x = i1x, y = i1y;
      i1 = i2, i1x = i2x, i1y = i2y, i2 = i, i2x = x, i2y = y;
    }
    let center = circumcenter(i0x, i0y, i1x, i1y, i2x, i2y);
    this._cx = center.x, this._cy = center.y;
    for (let i = 0; i < n; i++)
      this._dists[i] = dist(coords[2 * i], coords[2 * i + 1], center.x, center.y);
    quicksort(this._ids, this._dists, 0, n - 1), this._hullStart = i0;
    let hullSize = 3;
    hullNext[i0] = hullPrev[i2] = i1, hullNext[i1] = hullPrev[i0] = i2, hullNext[i2] = hullPrev[i1] = i0, hullTri[i0] = 0, hullTri[i1] = 1, hullTri[i2] = 2, hullHash.fill(-1), hullHash[this._hashKey(i0x, i0y)] = i0, hullHash[this._hashKey(i1x, i1y)] = i1, hullHash[this._hashKey(i2x, i2y)] = i2, this.trianglesLen = 0, this._addTriangle(i0, i1, i2, -1, -1, -1);
    for (let k = 0, xp, yp; k < this._ids.length; k++) {
      let i = this._ids[k], x = coords[2 * i], y = coords[2 * i + 1];
      if (k > 0 && Math.abs(x - xp) <= EPSILON && Math.abs(y - yp) <= EPSILON || (xp = x, yp = y, i === i0 || i === i1 || i === i2)) continue;
      let start = 0;
      for (let j = 0, key = this._hashKey(x, y); j < this._hashSize && (start = hullHash[(key + j) % this._hashSize], !(start !== -1 && start !== hullNext[start])); j++)
        ;
      start = hullPrev[start];
      let e = start, q;
      for (; q = hullNext[e], orient2d(x, y, coords[2 * e], coords[2 * e + 1], coords[2 * q], coords[2 * q + 1]) >= 0; )
        if (e = q, e === start) {
          e = -1;
          break;
        }
      if (e === -1) continue;
      let t = this._addTriangle(e, i, hullNext[e], -1, -1, hullTri[e]);
      hullTri[i] = this._legalize(t + 2), hullTri[e] = t, hullSize++;
      let n2 = hullNext[e];
      for (; q = hullNext[n2], orient2d(x, y, coords[2 * n2], coords[2 * n2 + 1], coords[2 * q], coords[2 * q + 1]) < 0; )
        t = this._addTriangle(n2, i, q, hullTri[i], -1, hullTri[n2]), hullTri[i] = this._legalize(t + 2), hullNext[n2] = n2, hullSize--, n2 = q;
      if (e === start)
        for (; q = hullPrev[e], orient2d(x, y, coords[2 * q], coords[2 * q + 1], coords[2 * e], coords[2 * e + 1]) < 0; )
          t = this._addTriangle(q, i, e, -1, hullTri[e], hullTri[q]), this._legalize(t + 2), hullTri[q] = t, hullNext[e] = e, hullSize--, e = q;
      this._hullStart = hullPrev[i] = e, hullNext[e] = hullPrev[n2] = i, hullNext[i] = n2, hullHash[this._hashKey(x, y)] = i, hullHash[this._hashKey(coords[2 * e], coords[2 * e + 1])] = e;
    }
    this.hull = new Uint32Array(hullSize);
    for (let i = 0, e = this._hullStart; i < hullSize; i++)
      this.hull[i] = e, e = hullNext[e];
    this.triangles = this._triangles.subarray(0, this.trianglesLen), this.halfedges = this._halfedges.subarray(0, this.trianglesLen);
  }
  _hashKey(x, y) {
    return Math.floor(pseudoAngle(x - this._cx, y - this._cy) * this._hashSize) % this._hashSize;
  }
  _legalize(a) {
    let { _triangles: triangles, _halfedges: halfedges, coords } = this, i = 0, ar = 0;
    for (; ; ) {
      let b = halfedges[a], a0 = a - a % 3;
      if (ar = a0 + (a + 2) % 3, b === -1) {
        if (i === 0) break;
        a = EDGE_STACK[--i];
        continue;
      }
      let b0 = b - b % 3, al = a0 + (a + 1) % 3, bl = b0 + (b + 2) % 3, p0 = triangles[ar], pr = triangles[a], pl = triangles[al], p1 = triangles[bl];
      if (inCircle(
        coords[2 * p0],
        coords[2 * p0 + 1],
        coords[2 * pr],
        coords[2 * pr + 1],
        coords[2 * pl],
        coords[2 * pl + 1],
        coords[2 * p1],
        coords[2 * p1 + 1]
      )) {
        triangles[a] = p1, triangles[b] = p0;
        let hbl = halfedges[bl];
        if (hbl === -1) {
          let e = this._hullStart;
          do {
            if (this._hullTri[e] === bl) {
              this._hullTri[e] = a;
              break;
            }
            e = this._hullPrev[e];
          } while (e !== this._hullStart);
        }
        this._link(a, hbl), this._link(b, halfedges[ar]), this._link(ar, bl);
        let br = b0 + (b + 1) % 3;
        i < EDGE_STACK.length && (EDGE_STACK[i++] = br);
      } else {
        if (i === 0) break;
        a = EDGE_STACK[--i];
      }
    }
    return ar;
  }
  _link(a, b) {
    this._halfedges[a] = b, b !== -1 && (this._halfedges[b] = a);
  }
  // add a new triangle given vertex indices and adjacent half-edge ids
  _addTriangle(i0, i1, i2, a, b, c) {
    let t = this.trianglesLen;
    return this._triangles[t] = i0, this._triangles[t + 1] = i1, this._triangles[t + 2] = i2, this._link(t, a), this._link(t + 1, b), this._link(t + 2, c), this.trianglesLen += 3, t;
  }
};
function pseudoAngle(dx, dy) {
  let p = dx / (Math.abs(dx) + Math.abs(dy));
  return (dy > 0 ? 3 - p : 1 + p) / 4;
}
function dist(ax, ay, bx, by) {
  let dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}
function inCircle(ax, ay, bx, by, cx, cy, px, py) {
  let dx = ax - px, dy = ay - py, ex = bx - px, ey = by - py, fx = cx - px, fy = cy - py, ap = dx * dx + dy * dy, bp = ex * ex + ey * ey, cp = fx * fx + fy * fy;
  return dx * (ey * cp - bp * fy) - dy * (ex * cp - bp * fx) + ap * (ex * fy - ey * fx) < 0;
}
function circumradius(ax, ay, bx, by, cx, cy) {
  let dx = bx - ax, dy = by - ay, ex = cx - ax, ey = cy - ay, bl = dx * dx + dy * dy, cl = ex * ex + ey * ey, d = 0.5 / (dx * ey - dy * ex), x = (ey * bl - dy * cl) * d, y = (dx * cl - ex * bl) * d;
  return x * x + y * y;
}
function circumcenter(ax, ay, bx, by, cx, cy) {
  let dx = bx - ax, dy = by - ay, ex = cx - ax, ey = cy - ay, bl = dx * dx + dy * dy, cl = ex * ex + ey * ey, d = 0.5 / (dx * ey - dy * ex), x = ax + (ey * bl - dy * cl) * d, y = ay + (dx * cl - ex * bl) * d;
  return { x, y };
}
function quicksort(ids, dists, left, right) {
  if (right - left <= 20)
    for (let i = left + 1; i <= right; i++) {
      let temp = ids[i], tempDist = dists[temp], j = i - 1;
      for (; j >= left && dists[ids[j]] > tempDist; ) ids[j + 1] = ids[j--];
      ids[j + 1] = temp;
    }
  else {
    let median = left + right >> 1, i = left + 1, j = right;
    swap(ids, median, i), dists[ids[left]] > dists[ids[right]] && swap(ids, left, right), dists[ids[i]] > dists[ids[right]] && swap(ids, i, right), dists[ids[left]] > dists[ids[i]] && swap(ids, left, i);
    let temp = ids[i], tempDist = dists[temp];
    for (; ; ) {
      do
        i++;
      while (dists[ids[i]] < tempDist);
      do
        j--;
      while (dists[ids[j]] > tempDist);
      if (j < i) break;
      swap(ids, i, j);
    }
    ids[left + 1] = ids[j], ids[j] = temp, right - i + 1 >= j - left ? (quicksort(ids, dists, i, right), quicksort(ids, dists, left, j - 1)) : (quicksort(ids, dists, left, j - 1), quicksort(ids, dists, i, right));
  }
}
function swap(arr, i, j) {
  let tmp = arr[i];
  arr[i] = arr[j], arr[j] = tmp;
}
function defaultGetX(p) {
  return p[0];
}
function defaultGetY(p) {
  return p[1];
}

// node_modules/.pnpm/d3-delaunay@6.0.4/node_modules/d3-delaunay/src/path.js
var Path = class {
  constructor() {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null, this._ = "";
  }
  moveTo(x, y) {
    this._ += `M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}`;
  }
  closePath() {
    this._x1 !== null && (this._x1 = this._x0, this._y1 = this._y0, this._ += "Z");
  }
  lineTo(x, y) {
    this._ += `L${this._x1 = +x},${this._y1 = +y}`;
  }
  arc(x, y, r) {
    x = +x, y = +y, r = +r;
    let x0 = x + r, y0 = y;
    if (r < 0) throw new Error("negative radius");
    this._x1 === null ? this._ += `M${x0},${y0}` : (Math.abs(this._x1 - x0) > 1e-6 || Math.abs(this._y1 - y0) > 1e-6) && (this._ += "L" + x0 + "," + y0), r && (this._ += `A${r},${r},0,1,1,${x - r},${y}A${r},${r},0,1,1,${this._x1 = x0},${this._y1 = y0}`);
  }
  rect(x, y, w, h) {
    this._ += `M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}h${+w}v${+h}h${-w}Z`;
  }
  value() {
    return this._ || null;
  }
};

// node_modules/.pnpm/d3-delaunay@6.0.4/node_modules/d3-delaunay/src/polygon.js
var Polygon = class {
  constructor() {
    this._ = [];
  }
  moveTo(x, y) {
    this._.push([x, y]);
  }
  closePath() {
    this._.push(this._[0].slice());
  }
  lineTo(x, y) {
    this._.push([x, y]);
  }
  value() {
    return this._.length ? this._ : null;
  }
};

// node_modules/.pnpm/d3-delaunay@6.0.4/node_modules/d3-delaunay/src/voronoi.js
var Voronoi = class {
  constructor(delaunay, [xmin, ymin, xmax, ymax] = [0, 0, 960, 500]) {
    if (!((xmax = +xmax) >= (xmin = +xmin)) || !((ymax = +ymax) >= (ymin = +ymin))) throw new Error("invalid bounds");
    this.delaunay = delaunay, this._circumcenters = new Float64Array(delaunay.points.length * 2), this.vectors = new Float64Array(delaunay.points.length * 2), this.xmax = xmax, this.xmin = xmin, this.ymax = ymax, this.ymin = ymin, this._init();
  }
  update() {
    return this.delaunay.update(), this._init(), this;
  }
  _init() {
    let { delaunay: { points, hull, triangles }, vectors } = this, bx, by, circumcenters = this.circumcenters = this._circumcenters.subarray(0, triangles.length / 3 * 2);
    for (let i = 0, j = 0, n = triangles.length, x, y; i < n; i += 3, j += 2) {
      let t12 = triangles[i] * 2, t22 = triangles[i + 1] * 2, t32 = triangles[i + 2] * 2, x12 = points[t12], y12 = points[t12 + 1], x2 = points[t22], y2 = points[t22 + 1], x3 = points[t32], y3 = points[t32 + 1], dx = x2 - x12, dy = y2 - y12, ex = x3 - x12, ey = y3 - y12, ab4 = (dx * ey - dy * ex) * 2;
      if (Math.abs(ab4) < 1e-9) {
        if (bx === void 0) {
          bx = by = 0;
          for (let i2 of hull) bx += points[i2 * 2], by += points[i2 * 2 + 1];
          bx /= hull.length, by /= hull.length;
        }
        let a = 1e9 * Math.sign((bx - x12) * ey - (by - y12) * ex);
        x = (x12 + x3) / 2 - a * ey, y = (y12 + y3) / 2 + a * ex;
      } else {
        let d = 1 / ab4, bl = dx * dx + dy * dy, cl = ex * ex + ey * ey;
        x = x12 + (ey * bl - dy * cl) * d, y = y12 + (dx * cl - ex * bl) * d;
      }
      circumcenters[j] = x, circumcenters[j + 1] = y;
    }
    let h = hull[hull.length - 1], p0, p1 = h * 4, x0, x1 = points[2 * h], y0, y1 = points[2 * h + 1];
    vectors.fill(0);
    for (let i = 0; i < hull.length; ++i)
      h = hull[i], p0 = p1, x0 = x1, y0 = y1, p1 = h * 4, x1 = points[2 * h], y1 = points[2 * h + 1], vectors[p0 + 2] = vectors[p1] = y0 - y1, vectors[p0 + 3] = vectors[p1 + 1] = x1 - x0;
  }
  render(context) {
    let buffer = context == null ? context = new Path() : void 0, { delaunay: { halfedges, inedges, hull }, circumcenters, vectors } = this;
    if (hull.length <= 1) return null;
    for (let i = 0, n = halfedges.length; i < n; ++i) {
      let j = halfedges[i];
      if (j < i) continue;
      let ti = Math.floor(i / 3) * 2, tj = Math.floor(j / 3) * 2, xi = circumcenters[ti], yi = circumcenters[ti + 1], xj = circumcenters[tj], yj = circumcenters[tj + 1];
      this._renderSegment(xi, yi, xj, yj, context);
    }
    let h0, h1 = hull[hull.length - 1];
    for (let i = 0; i < hull.length; ++i) {
      h0 = h1, h1 = hull[i];
      let t = Math.floor(inedges[h1] / 3) * 2, x = circumcenters[t], y = circumcenters[t + 1], v2 = h0 * 4, p = this._project(x, y, vectors[v2 + 2], vectors[v2 + 3]);
      p && this._renderSegment(x, y, p[0], p[1], context);
    }
    return buffer && buffer.value();
  }
  renderBounds(context) {
    let buffer = context == null ? context = new Path() : void 0;
    return context.rect(this.xmin, this.ymin, this.xmax - this.xmin, this.ymax - this.ymin), buffer && buffer.value();
  }
  renderCell(i, context) {
    let buffer = context == null ? context = new Path() : void 0, points = this._clip(i);
    if (points === null || !points.length) return;
    context.moveTo(points[0], points[1]);
    let n = points.length;
    for (; points[0] === points[n - 2] && points[1] === points[n - 1] && n > 1; ) n -= 2;
    for (let i2 = 2; i2 < n; i2 += 2)
      (points[i2] !== points[i2 - 2] || points[i2 + 1] !== points[i2 - 1]) && context.lineTo(points[i2], points[i2 + 1]);
    return context.closePath(), buffer && buffer.value();
  }
  *cellPolygons() {
    let { delaunay: { points } } = this;
    for (let i = 0, n = points.length / 2; i < n; ++i) {
      let cell = this.cellPolygon(i);
      cell && (cell.index = i, yield cell);
    }
  }
  cellPolygon(i) {
    let polygon = new Polygon();
    return this.renderCell(i, polygon), polygon.value();
  }
  _renderSegment(x0, y0, x1, y1, context) {
    let S, c0 = this._regioncode(x0, y0), c1 = this._regioncode(x1, y1);
    c0 === 0 && c1 === 0 ? (context.moveTo(x0, y0), context.lineTo(x1, y1)) : (S = this._clipSegment(x0, y0, x1, y1, c0, c1)) && (context.moveTo(S[0], S[1]), context.lineTo(S[2], S[3]));
  }
  contains(i, x, y) {
    return x = +x, x !== x || (y = +y, y !== y) ? !1 : this.delaunay._step(i, x, y) === i;
  }
  *neighbors(i) {
    let ci = this._clip(i);
    if (ci) for (let j of this.delaunay.neighbors(i)) {
      let cj = this._clip(j);
      if (cj) {
        loop: for (let ai = 0, li = ci.length; ai < li; ai += 2)
          for (let aj = 0, lj = cj.length; aj < lj; aj += 2)
            if (ci[ai] === cj[aj] && ci[ai + 1] === cj[aj + 1] && ci[(ai + 2) % li] === cj[(aj + lj - 2) % lj] && ci[(ai + 3) % li] === cj[(aj + lj - 1) % lj]) {
              yield j;
              break loop;
            }
      }
    }
  }
  _cell(i) {
    let { circumcenters, delaunay: { inedges, halfedges, triangles } } = this, e0 = inedges[i];
    if (e0 === -1) return null;
    let points = [], e = e0;
    do {
      let t = Math.floor(e / 3);
      if (points.push(circumcenters[t * 2], circumcenters[t * 2 + 1]), e = e % 3 === 2 ? e - 2 : e + 1, triangles[e] !== i) break;
      e = halfedges[e];
    } while (e !== e0 && e !== -1);
    return points;
  }
  _clip(i) {
    if (i === 0 && this.delaunay.hull.length === 1)
      return [this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax, this.xmin, this.ymin];
    let points = this._cell(i);
    if (points === null) return null;
    let { vectors: V } = this, v2 = i * 4;
    return this._simplify(V[v2] || V[v2 + 1] ? this._clipInfinite(i, points, V[v2], V[v2 + 1], V[v2 + 2], V[v2 + 3]) : this._clipFinite(i, points));
  }
  _clipFinite(i, points) {
    let n = points.length, P = null, x0, y0, x1 = points[n - 2], y1 = points[n - 1], c0, c1 = this._regioncode(x1, y1), e0, e1 = 0;
    for (let j = 0; j < n; j += 2)
      if (x0 = x1, y0 = y1, x1 = points[j], y1 = points[j + 1], c0 = c1, c1 = this._regioncode(x1, y1), c0 === 0 && c1 === 0)
        e0 = e1, e1 = 0, P ? P.push(x1, y1) : P = [x1, y1];
      else {
        let S, sx0, sy0, sx1, sy1;
        if (c0 === 0) {
          if ((S = this._clipSegment(x0, y0, x1, y1, c0, c1)) === null) continue;
          [sx0, sy0, sx1, sy1] = S;
        } else {
          if ((S = this._clipSegment(x1, y1, x0, y0, c1, c0)) === null) continue;
          [sx1, sy1, sx0, sy0] = S, e0 = e1, e1 = this._edgecode(sx0, sy0), e0 && e1 && this._edge(i, e0, e1, P, P.length), P ? P.push(sx0, sy0) : P = [sx0, sy0];
        }
        e0 = e1, e1 = this._edgecode(sx1, sy1), e0 && e1 && this._edge(i, e0, e1, P, P.length), P ? P.push(sx1, sy1) : P = [sx1, sy1];
      }
    if (P)
      e0 = e1, e1 = this._edgecode(P[0], P[1]), e0 && e1 && this._edge(i, e0, e1, P, P.length);
    else if (this.contains(i, (this.xmin + this.xmax) / 2, (this.ymin + this.ymax) / 2))
      return [this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax, this.xmin, this.ymin];
    return P;
  }
  _clipSegment(x0, y0, x1, y1, c0, c1) {
    let flip = c0 < c1;
    for (flip && ([x0, y0, x1, y1, c0, c1] = [x1, y1, x0, y0, c1, c0]); ; ) {
      if (c0 === 0 && c1 === 0) return flip ? [x1, y1, x0, y0] : [x0, y0, x1, y1];
      if (c0 & c1) return null;
      let x, y, c = c0 || c1;
      c & 8 ? (x = x0 + (x1 - x0) * (this.ymax - y0) / (y1 - y0), y = this.ymax) : c & 4 ? (x = x0 + (x1 - x0) * (this.ymin - y0) / (y1 - y0), y = this.ymin) : c & 2 ? (y = y0 + (y1 - y0) * (this.xmax - x0) / (x1 - x0), x = this.xmax) : (y = y0 + (y1 - y0) * (this.xmin - x0) / (x1 - x0), x = this.xmin), c0 ? (x0 = x, y0 = y, c0 = this._regioncode(x0, y0)) : (x1 = x, y1 = y, c1 = this._regioncode(x1, y1));
    }
  }
  _clipInfinite(i, points, vx0, vy0, vxn, vyn) {
    let P = Array.from(points), p;
    if ((p = this._project(P[0], P[1], vx0, vy0)) && P.unshift(p[0], p[1]), (p = this._project(P[P.length - 2], P[P.length - 1], vxn, vyn)) && P.push(p[0], p[1]), P = this._clipFinite(i, P))
      for (let j = 0, n = P.length, c0, c1 = this._edgecode(P[n - 2], P[n - 1]); j < n; j += 2)
        c0 = c1, c1 = this._edgecode(P[j], P[j + 1]), c0 && c1 && (j = this._edge(i, c0, c1, P, j), n = P.length);
    else this.contains(i, (this.xmin + this.xmax) / 2, (this.ymin + this.ymax) / 2) && (P = [this.xmin, this.ymin, this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax]);
    return P;
  }
  _edge(i, e0, e1, P, j) {
    for (; e0 !== e1; ) {
      let x, y;
      switch (e0) {
        case 5:
          e0 = 4;
          continue;
        // top-left
        case 4:
          e0 = 6, x = this.xmax, y = this.ymin;
          break;
        // top
        case 6:
          e0 = 2;
          continue;
        // top-right
        case 2:
          e0 = 10, x = this.xmax, y = this.ymax;
          break;
        // right
        case 10:
          e0 = 8;
          continue;
        // bottom-right
        case 8:
          e0 = 9, x = this.xmin, y = this.ymax;
          break;
        // bottom
        case 9:
          e0 = 1;
          continue;
        // bottom-left
        case 1:
          e0 = 5, x = this.xmin, y = this.ymin;
          break;
      }
      (P[j] !== x || P[j + 1] !== y) && this.contains(i, x, y) && (P.splice(j, 0, x, y), j += 2);
    }
    return j;
  }
  _project(x0, y0, vx, vy) {
    let t = 1 / 0, c, x, y;
    if (vy < 0) {
      if (y0 <= this.ymin) return null;
      (c = (this.ymin - y0) / vy) < t && (y = this.ymin, x = x0 + (t = c) * vx);
    } else if (vy > 0) {
      if (y0 >= this.ymax) return null;
      (c = (this.ymax - y0) / vy) < t && (y = this.ymax, x = x0 + (t = c) * vx);
    }
    if (vx > 0) {
      if (x0 >= this.xmax) return null;
      (c = (this.xmax - x0) / vx) < t && (x = this.xmax, y = y0 + (t = c) * vy);
    } else if (vx < 0) {
      if (x0 <= this.xmin) return null;
      (c = (this.xmin - x0) / vx) < t && (x = this.xmin, y = y0 + (t = c) * vy);
    }
    return [x, y];
  }
  _edgecode(x, y) {
    return (x === this.xmin ? 1 : x === this.xmax ? 2 : 0) | (y === this.ymin ? 4 : y === this.ymax ? 8 : 0);
  }
  _regioncode(x, y) {
    return (x < this.xmin ? 1 : x > this.xmax ? 2 : 0) | (y < this.ymin ? 4 : y > this.ymax ? 8 : 0);
  }
  _simplify(P) {
    if (P && P.length > 4) {
      for (let i = 0; i < P.length; i += 2) {
        let j = (i + 2) % P.length, k = (i + 4) % P.length;
        (P[i] === P[j] && P[j] === P[k] || P[i + 1] === P[j + 1] && P[j + 1] === P[k + 1]) && (P.splice(j, 2), i -= 2);
      }
      P.length || (P = null);
    }
    return P;
  }
};

// node_modules/.pnpm/d3-delaunay@6.0.4/node_modules/d3-delaunay/src/delaunay.js
var tau = 2 * Math.PI, pow = Math.pow;
function pointX(p) {
  return p[0];
}
function pointY(p) {
  return p[1];
}
function collinear(d) {
  let { triangles, coords } = d;
  for (let i = 0; i < triangles.length; i += 3) {
    let a = 2 * triangles[i], b = 2 * triangles[i + 1], c = 2 * triangles[i + 2];
    if ((coords[c] - coords[a]) * (coords[b + 1] - coords[a + 1]) - (coords[b] - coords[a]) * (coords[c + 1] - coords[a + 1]) > 1e-10) return !1;
  }
  return !0;
}
function jitter(x, y, r) {
  return [x + Math.sin(x + y) * r, y + Math.cos(x - y) * r];
}
var Delaunay = class _Delaunay {
  static from(points, fx = pointX, fy = pointY, that) {
    return new _Delaunay("length" in points ? flatArray(points, fx, fy, that) : Float64Array.from(flatIterable(points, fx, fy, that)));
  }
  constructor(points) {
    this._delaunator = new Delaunator(points), this.inedges = new Int32Array(points.length / 2), this._hullIndex = new Int32Array(points.length / 2), this.points = this._delaunator.coords, this._init();
  }
  update() {
    return this._delaunator.update(), this._init(), this;
  }
  _init() {
    let d = this._delaunator, points = this.points;
    if (d.hull && d.hull.length > 2 && collinear(d)) {
      this.collinear = Int32Array.from({ length: points.length / 2 }, (_, i) => i).sort((i, j) => points[2 * i] - points[2 * j] || points[2 * i + 1] - points[2 * j + 1]);
      let e = this.collinear[0], f = this.collinear[this.collinear.length - 1], bounds = [points[2 * e], points[2 * e + 1], points[2 * f], points[2 * f + 1]], r = 1e-8 * Math.hypot(bounds[3] - bounds[1], bounds[2] - bounds[0]);
      for (let i = 0, n = points.length / 2; i < n; ++i) {
        let p = jitter(points[2 * i], points[2 * i + 1], r);
        points[2 * i] = p[0], points[2 * i + 1] = p[1];
      }
      this._delaunator = new Delaunator(points);
    } else
      delete this.collinear;
    let halfedges = this.halfedges = this._delaunator.halfedges, hull = this.hull = this._delaunator.hull, triangles = this.triangles = this._delaunator.triangles, inedges = this.inedges.fill(-1), hullIndex = this._hullIndex.fill(-1);
    for (let e = 0, n = halfedges.length; e < n; ++e) {
      let p = triangles[e % 3 === 2 ? e - 2 : e + 1];
      (halfedges[e] === -1 || inedges[p] === -1) && (inedges[p] = e);
    }
    for (let i = 0, n = hull.length; i < n; ++i)
      hullIndex[hull[i]] = i;
    hull.length <= 2 && hull.length > 0 && (this.triangles = new Int32Array(3).fill(-1), this.halfedges = new Int32Array(3).fill(-1), this.triangles[0] = hull[0], inedges[hull[0]] = 1, hull.length === 2 && (inedges[hull[1]] = 0, this.triangles[1] = hull[1], this.triangles[2] = hull[1]));
  }
  voronoi(bounds) {
    return new Voronoi(this, bounds);
  }
  *neighbors(i) {
    let { inedges, hull, _hullIndex, halfedges, triangles, collinear: collinear2 } = this;
    if (collinear2) {
      let l = collinear2.indexOf(i);
      l > 0 && (yield collinear2[l - 1]), l < collinear2.length - 1 && (yield collinear2[l + 1]);
      return;
    }
    let e0 = inedges[i];
    if (e0 === -1) return;
    let e = e0, p0 = -1;
    do {
      if (yield p0 = triangles[e], e = e % 3 === 2 ? e - 2 : e + 1, triangles[e] !== i) return;
      if (e = halfedges[e], e === -1) {
        let p = hull[(_hullIndex[i] + 1) % hull.length];
        p !== p0 && (yield p);
        return;
      }
    } while (e !== e0);
  }
  find(x, y, i = 0) {
    if (x = +x, x !== x || (y = +y, y !== y)) return -1;
    let i0 = i, c;
    for (; (c = this._step(i, x, y)) >= 0 && c !== i && c !== i0; ) i = c;
    return c;
  }
  _step(i, x, y) {
    let { inedges, hull, _hullIndex, halfedges, triangles, points } = this;
    if (inedges[i] === -1 || !points.length) return (i + 1) % (points.length >> 1);
    let c = i, dc = pow(x - points[i * 2], 2) + pow(y - points[i * 2 + 1], 2), e0 = inedges[i], e = e0;
    do {
      let t = triangles[e], dt = pow(x - points[t * 2], 2) + pow(y - points[t * 2 + 1], 2);
      if (dt < dc && (dc = dt, c = t), e = e % 3 === 2 ? e - 2 : e + 1, triangles[e] !== i) break;
      if (e = halfedges[e], e === -1) {
        if (e = hull[(_hullIndex[i] + 1) % hull.length], e !== t && pow(x - points[e * 2], 2) + pow(y - points[e * 2 + 1], 2) < dc)
          return e;
        break;
      }
    } while (e !== e0);
    return c;
  }
  render(context) {
    let buffer = context == null ? context = new Path() : void 0, { points, halfedges, triangles } = this;
    for (let i = 0, n = halfedges.length; i < n; ++i) {
      let j = halfedges[i];
      if (j < i) continue;
      let ti = triangles[i] * 2, tj = triangles[j] * 2;
      context.moveTo(points[ti], points[ti + 1]), context.lineTo(points[tj], points[tj + 1]);
    }
    return this.renderHull(context), buffer && buffer.value();
  }
  renderPoints(context, r) {
    r === void 0 && (!context || typeof context.moveTo != "function") && (r = context, context = null), r = r == null ? 2 : +r;
    let buffer = context == null ? context = new Path() : void 0, { points } = this;
    for (let i = 0, n = points.length; i < n; i += 2) {
      let x = points[i], y = points[i + 1];
      context.moveTo(x + r, y), context.arc(x, y, r, 0, tau);
    }
    return buffer && buffer.value();
  }
  renderHull(context) {
    let buffer = context == null ? context = new Path() : void 0, { hull, points } = this, h = hull[0] * 2, n = hull.length;
    context.moveTo(points[h], points[h + 1]);
    for (let i = 1; i < n; ++i) {
      let h2 = 2 * hull[i];
      context.lineTo(points[h2], points[h2 + 1]);
    }
    return context.closePath(), buffer && buffer.value();
  }
  hullPolygon() {
    let polygon = new Polygon();
    return this.renderHull(polygon), polygon.value();
  }
  renderTriangle(i, context) {
    let buffer = context == null ? context = new Path() : void 0, { points, triangles } = this, t02 = triangles[i *= 3] * 2, t12 = triangles[i + 1] * 2, t22 = triangles[i + 2] * 2;
    return context.moveTo(points[t02], points[t02 + 1]), context.lineTo(points[t12], points[t12 + 1]), context.lineTo(points[t22], points[t22 + 1]), context.closePath(), buffer && buffer.value();
  }
  *trianglePolygons() {
    let { triangles } = this;
    for (let i = 0, n = triangles.length / 3; i < n; ++i)
      yield this.trianglePolygon(i);
  }
  trianglePolygon(i) {
    let polygon = new Polygon();
    return this.renderTriangle(i, polygon), polygon.value();
  }
};
function flatArray(points, fx, fy, that) {
  let n = points.length, array = new Float64Array(n * 2);
  for (let i = 0; i < n; ++i) {
    let p = points[i];
    array[i * 2] = fx.call(that, p, i, points), array[i * 2 + 1] = fy.call(that, p, i, points);
  }
  return array;
}
function* flatIterable(points, fx, fy, that) {
  let i = 0;
  for (let p of points)
    yield fx.call(that, p, i, points), yield fy.call(that, p, i, points), ++i;
}

// src/math/delaunay.ts
var CoincidentPointsError = class extends Error {
  constructor(indexA, indexB) {
    super(`Coincident points at indices ${indexA} and ${indexB}`);
    this.indexA = indexA;
    this.indexB = indexB;
    this.name = "CoincidentPointsError";
  }
  indexA;
  indexB;
}, Delaunay2 = class {
  _inner;
  get d3() {
    return this._inner;
  }
  constructor(points) {
    this._inner = Delaunay.from(points.map((p) => Vec2(p).arr()));
    let inedges = this._inner.inedges, pts = this._inner.points, n = pts.length / 2;
    for (let i = 0; i < n; i++)
      if (inedges[i] === -1) {
        for (let j = 0; j < n; j++)
          if (j !== i && pts[2 * i] === pts[2 * j] && pts[2 * i + 1] === pts[2 * j + 1])
            throw new CoincidentPointsError(Math.min(i, j), Math.max(i, j));
        throw new Error(
          `Point ${i} was excluded from triangulation for unknown reasons`
        );
      }
  }
  point(idx) {
    return Vec2(this._inner.points[2 * idx], this._inner.points[2 * idx + 1]);
  }
  numPoints() {
    return this._inner.points.length / 2;
  }
  triangle(idx) {
    return [
      this.point(this._inner.triangles[3 * idx + 0]),
      this.point(this._inner.triangles[3 * idx + 1]),
      this.point(this._inner.triangles[3 * idx + 2])
    ];
  }
  numTriangles() {
    return this._inner.triangles.length / 3;
  }
  triangles() {
    return this.numPoints() < 2 ? [] : range_default(this.numTriangles()).map((i) => this.triangle(i));
  }
  findTriangle(pt, {
    edge = 0,
    // visit = null,
    limit = 1 / 0
  } = {}) {
    if (this.numPoints() < 3 || isNaN(edge)) return -1;
    let { triangles, halfedges, points } = this._inner, getPrev = (e) => e % 3 === 0 ? e + 2 : e - 1, getNext = (e) => e % 3 === 2 ? e - 2 : e + 1, current2 = edge, start = current2, n = 0;
    for (; ; ) {
      if (limit-- <= 0) return -1;
      let next = getNext(current2), pc = triangles[current2] * 2, pn = triangles[next] * 2;
      if (orientation(
        points[pc],
        points[pc + 1],
        points[pn],
        points[pn + 1],
        pt.x,
        pt.y
      ) >= 0) {
        if (start === (current2 = next)) break;
      } else {
        if ((current2 = halfedges[current2]) === -1) break;
        start = current2 = ++n % 2 ? getNext(current2) : getPrev(current2);
      }
    }
    return current2 > -1 ? Math.floor(current2 / 3) : -1;
  }
  projectOntoConvexHull(pt) {
    if (this.numPoints() === 1) {
      let onlyPt = Vec2(this._inner.points[0], this._inner.points[1]);
      return {
        type: "vertex",
        ptIdx: 0,
        projectedPt: onlyPt,
        dist: pt.dist(onlyPt)
      };
    }
    let delPt = (idx) => Vec2(this._inner.points[2 * idx], this._inner.points[2 * idx + 1]), triIdx = this.findTriangle(pt);
    if (triIdx !== -1 && !d3DelaunayCollinearIdxs(this._inner)) {
      let ptIdx0 = this._inner.triangles[3 * triIdx + 0], ptIdx1 = this._inner.triangles[3 * triIdx + 1], ptIdx2 = this._inner.triangles[3 * triIdx + 2], ptIdxSet = /* @__PURE__ */ new Set([ptIdx0, ptIdx1, ptIdx2]);
      if (assert(ptIdxSet.size >= 2), ptIdxSet.size === 2) {
        let [ptIdx02, ptIdx12] = Array.from(ptIdxSet), pt0 = delPt(ptIdx02), edge = delPt(ptIdx12).sub(pt0), edgeLen2 = edge.len2();
        assert(edgeLen2 > 0);
        let t = pt.sub(pt0).dot(edge) / edgeLen2;
        return assertWarning(
          t >= 0 && t <= 1,
          "t out of range in projectOntoConvexHull"
        ), { type: "edge", ptIdx0: ptIdx02, ptIdx1: ptIdx12, t, projectedPt: pt, dist: 0 };
      } else
        return {
          type: "triangle",
          ptIdx0,
          ptIdx1,
          ptIdx2,
          barycentric: barycentric(
            pt,
            delPt(ptIdx0),
            delPt(ptIdx1),
            delPt(ptIdx2)
          ),
          projectedPt: pt,
          dist: 0
        };
    }
    let collinearIdxs = d3DelaunayCollinearIdxs(this._inner), hull = collinearIdxs ? [
      ...collinearIdxs,
      ...reverse_default(collinearIdxs.slice(1, collinearIdxs.length - 1))
    ] : this._inner.hull, points = this._inner.points, qx = pt.x, qy = pt.y, bestDist2 = 1 / 0, bestType = "vertex", bestPtIdx = 0, bestPtIdx0 = 0, bestPtIdx1 = 0, bestT = 0, bestX = 0, bestY = 0;
    for (let i = 0; i < hull.length; i++) {
      let iA = hull[i], iB = hull[(i + 1) % hull.length], ax = points[2 * iA], ay = points[2 * iA + 1], bx = points[2 * iB], by = points[2 * iB + 1], abx = bx - ax, aby = by - ay, ab22 = abx * abx + aby * aby;
      if (ab22 < 1e-10) {
        let d22 = (qx - ax) * (qx - ax) + (qy - ay) * (qy - ay);
        d22 < bestDist2 && (bestDist2 = d22, bestType = "vertex", bestPtIdx = iA, bestX = ax, bestY = ay);
        continue;
      }
      let t = Math.max(
        0,
        Math.min(1, ((qx - ax) * abx + (qy - ay) * aby) / ab22)
      ), px = ax + t * abx, py = ay + t * aby, d2 = (qx - px) * (qx - px) + (qy - py) * (qy - py);
      d2 < bestDist2 && (bestDist2 = d2, bestX = px, bestY = py, t < 1e-6 ? (bestType = "vertex", bestPtIdx = iA) : t > 1 - 1e-6 ? (bestType = "vertex", bestPtIdx = iB) : (bestType = "edge", bestPtIdx0 = iA, bestPtIdx1 = iB, bestT = t));
    }
    let dist2 = Math.sqrt(bestDist2), projectedPt = Vec2(bestX, bestY);
    return bestType === "vertex" ? { type: "vertex", ptIdx: bestPtIdx, projectedPt, dist: dist2 } : {
      type: "edge",
      ptIdx0: bestPtIdx0,
      ptIdx1: bestPtIdx1,
      t: bestT,
      projectedPt,
      dist: dist2
    };
  }
};
function orientation(ax, ay, bx, by, cx, cy) {
  return Math.sign((cx - bx) * (by - ay) - (cy - by) * (bx - ax));
}
function barycentric(pt, p0, p1, p2) {
  let x = pt.x, y = pt.y, x0 = p0.x, y0 = p0.y, x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y, den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2), l0 = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / den, l1 = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / den, l2 = 1 - l0 - l1;
  return { l0, l1, l2 };
}
function d3DelaunayCollinearIdxs(delaunay) {
  return delaunay.collinear;
}

// src/math/natural-neighbor.ts
function nextHe(e) {
  return e % 3 === 2 ? e - 2 : e + 1;
}
function naturalNeighborWeightsFromDelaunay(delaunay, query, opts) {
  let coincidenceTolerance2 = opts?.coincidenceTolerance2 ?? 1e-20, projectOutside = opts?.projectOutside ?? !1, d3 = delaunay.d3, points = d3.points, { triangles, halfedges } = d3, qx = query.x, qy = query.y, nearest = d3.find(qx, qy), dx = points[2 * nearest] - qx, dy = points[2 * nearest + 1] - qy;
  if (dx * dx + dy * dy < coincidenceTolerance2) {
    let weights2 = /* @__PURE__ */ new Map();
    return weights2.set(nearest, 1), { weights: weights2, barycentricDeviation: 0 };
  }
  let hullEdge = findHullEdge(points, d3.hull, qx, qy);
  if (hullEdge !== null)
    return hullEdgeWeights(points, hullEdge, qx, qy);
  let encTri = delaunay.findTriangle(Vec2(qx, qy));
  if (encTri === -1) {
    if (!projectOutside) return null;
    let proj = delaunay.projectOntoConvexHull(Vec2(qx, qy));
    if (proj.type === "vertex") {
      let weights2 = /* @__PURE__ */ new Map();
      return weights2.set(proj.ptIdx, 1), { weights: weights2, barycentricDeviation: 0 };
    }
    if (proj.type === "edge") {
      let weights2 = /* @__PURE__ */ new Map();
      return weights2.set(proj.ptIdx0, 1 - proj.t), weights2.set(proj.ptIdx1, proj.t), { weights: weights2, barycentricDeviation: 0 };
    }
    return null;
  }
  let nTri = triangles.length / 3, inCavity = new Uint8Array(nTri), stack = [encTri];
  for (inCavity[encTri] = 1; stack.length > 0; ) {
    let t = stack.pop();
    for (let j = 0; j < 3; j++) {
      let he = 3 * t + j, opp = halfedges[he];
      if (opp === -1) continue;
      let ot = Math.floor(opp / 3);
      inCavity[ot] || inCircumcircle(points, triangles, ot, qx, qy) && (inCavity[ot] = 1, stack.push(ot));
    }
  }
  let boundaryEdges = [];
  for (let t = 0; t < nTri; t++)
    if (inCavity[t])
      for (let j = 0; j < 3; j++) {
        let he = 3 * t + j, opp = halfedges[he];
        (opp === -1 || !inCavity[Math.floor(opp / 3)]) && boundaryEdges.push(he);
      }
  if (boundaryEdges.length < 3) return null;
  let polygon = orderBoundary(boundaryEdges, triangles);
  if (polygon === null) return null;
  let nEdge = polygon.length, vertIdx = new Array(nEdge), vx = new Array(nEdge), vy = new Array(nEdge);
  for (let i = 0; i < nEdge; i++) {
    let vi = triangles[polygon[i]];
    vertIdx[i] = vi, vx[i] = points[2 * vi] - qx, vy[i] = points[2 * vi + 1] - qy;
  }
  let weights = new Float64Array(nEdge), wSum = 0, prevC0 = null;
  for (let i0 = 0; i0 < nEdge; i0++) {
    let i1 = (i0 + 1) % nEdge, i2 = (i1 + 1) % nEdge, ax = vx[i0], ay = vy[i0], bx = vx[i1], by = vy[i1], cx = vx[i2], cy = vy[i2], mx0 = (ax + bx) / 2, my0 = (ay + by) / 2, mx1 = (bx + cx) / 2, my1 = (by + cy) / 2, c0 = prevC0 ?? circumcenter2(ax, ay, bx, by, 0, 0), c1 = circumcenter2(bx, by, cx, cy, 0, 0);
    prevC0 = c1;
    let wXY = mx0 * c0.y - c0.x * my0 + (c0.x * c1.y - c1.x * c0.y) + (c1.x * my1 - mx1 * c1.y), e0 = polygon[i0], e1 = polygon[i1], n = nextHe(e0), curCC = triCircumcenter(points, triangles, n, qx, qy), wThiessen = mx0 * curCC.y - curCC.x * my0, safety = 0;
    for (; n !== e1 && safety < 1e3; ) {
      safety++;
      let opp = halfedges[n];
      if (opp === -1) {
        let src = triangles[n], dst = triangles[nextHe(n)], ex = points[2 * dst] - points[2 * src], ey = points[2 * dst + 1] - points[2 * src + 1], len = Math.sqrt(ex * ex + ey * ey), scale3 = 1e8, mx = (points[2 * src] + points[2 * dst]) / 2 - qx, my = (points[2 * src + 1] + points[2 * dst + 1]) / 2 - qy, infCC = {
          x: mx + ey / len * scale3,
          y: my + -ex / len * scale3
        };
        wThiessen += curCC.x * infCC.y - infCC.x * curCC.y, curCC = infCC;
        let m = nextHe(e1), endCC = triCircumcenter(points, triangles, m, qx, qy), revThiessen = 0, revSafety = 0;
        for (; revSafety < 1e3; ) {
          revSafety++;
          let opp2 = halfedges[m];
          if (opp2 === -1) {
            let src2 = triangles[m], dst2 = triangles[nextHe(m)], ex2 = points[2 * dst2] - points[2 * src2], ey2 = points[2 * dst2 + 1] - points[2 * src2 + 1], len2 = Math.sqrt(ex2 * ex2 + ey2 * ey2), infCC2 = {
              x: (points[2 * src2] + points[2 * dst2]) / 2 - qx + ey2 / len2 * scale3,
              y: (points[2 * src2 + 1] + points[2 * dst2 + 1]) / 2 - qy + -ex2 / len2 * scale3
            };
            wThiessen += curCC.x * infCC2.y - infCC2.x * curCC.y, curCC = endCC;
            break;
          }
          m = nextHe(opp2);
          let cc2 = triCircumcenter(points, triangles, m, qx, qy);
          revThiessen += endCC.x * cc2.y - cc2.x * endCC.y, endCC = cc2;
        }
        wThiessen += revThiessen;
        break;
      }
      n = nextHe(opp);
      let nextCC = triCircumcenter(points, triangles, n, qx, qy);
      wThiessen += curCC.x * nextCC.y - nextCC.x * curCC.y, curCC = nextCC;
    }
    wThiessen += curCC.x * my1 - mx1 * curCC.y;
    let wDelta = wXY - wThiessen;
    wSum += wDelta, weights[i1] += wDelta;
  }
  if (Math.abs(wSum) < 1e-30) return null;
  let result = /* @__PURE__ */ new Map();
  for (let i = 0; i < nEdge; i++)
    result.set(vertIdx[i], weights[i] / wSum);
  let xDev = 0, yDev = 0;
  for (let i = 0; i < nEdge; i++) {
    let w = weights[i] / wSum;
    xDev += w * vx[i], yDev += w * vy[i];
  }
  return {
    weights: result,
    barycentricDeviation: Math.sqrt(xDev * xDev + yDev * yDev)
  };
}
function findHullEdge(points, hull, qx, qy, tolerance = 1e-10) {
  for (let i = 0; i < hull.length; i++) {
    let iA = hull[i], iB = hull[(i + 1) % hull.length], ax = points[2 * iA], ay = points[2 * iA + 1], bx = points[2 * iB], by = points[2 * iB + 1], abx = bx - ax, aby = by - ay, ab22 = abx * abx + aby * aby;
    if (ab22 < 1e-30) continue;
    let t = ((qx - ax) * abx + (qy - ay) * aby) / ab22;
    if (t < -tolerance || t > 1 + tolerance) continue;
    let cross = (qx - ax) * aby - (qy - ay) * abx;
    if (cross * cross / ab22 < tolerance * tolerance * ab22)
      return [iA, iB];
  }
  return null;
}
function hullEdgeWeights(points, [iA, iB], qx, qy) {
  let ax = points[2 * iA], ay = points[2 * iA + 1], bx = points[2 * iB], by = points[2 * iB + 1], abx = bx - ax, aby = by - ay, ab22 = abx * abx + aby * aby, t = ab22 > 0 ? ((qx - ax) * abx + (qy - ay) * aby) / ab22 : 0.5, weights = /* @__PURE__ */ new Map();
  return weights.set(iA, 1 - t), weights.set(iB, t), { weights, barycentricDeviation: 0 };
}
function orderBoundary(edges, triangles) {
  if (edges.length === 0) return null;
  let dstOf = (he) => triangles[nextHe(he)], srcMap = /* @__PURE__ */ new Map();
  for (let he of edges)
    srcMap.set(triangles[he], he);
  let ordered = [], cur = edges[0];
  for (let i = 0; i < edges.length; i++) {
    ordered.push(cur);
    let dst = dstOf(cur), next = srcMap.get(dst);
    if (next === void 0) return null;
    cur = next;
  }
  return dstOf(ordered[ordered.length - 1]) !== triangles[ordered[0]] ? null : ordered;
}
function inCircumcircle(points, triangles, t, qx, qy) {
  let i0 = triangles[3 * t], i1 = triangles[3 * t + 1], i2 = triangles[3 * t + 2], ax = points[2 * i0] - qx, ay = points[2 * i0 + 1] - qy, bx = points[2 * i1] - qx, by = points[2 * i1 + 1] - qy, cx = points[2 * i2] - qx, cy = points[2 * i2 + 1] - qy, det = (ax * ax + ay * ay) * (bx * cy - cx * by) + (bx * bx + by * by) * (cx * ay - ax * cy) + (cx * cx + cy * cy) * (ax * by - bx * ay);
  return ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) * det > 0;
}
function circumcenter2(ax, ay, bx, by, cx, cy) {
  let D2 = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(D2) < 1e-30)
    return { x: (ax + bx + cx) / 3, y: (ay + by + cy) / 3 };
  let a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
  return {
    x: (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / D2,
    y: (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / D2
  };
}
function triCircumcenter(points, triangles, he, qx, qy) {
  let t = Math.floor(he / 3), i0 = triangles[3 * t], i1 = triangles[3 * t + 1], i2 = triangles[3 * t + 2];
  return circumcenter2(
    points[2 * i0] - qx,
    points[2 * i0 + 1] - qy,
    points[2 * i1] - qx,
    points[2 * i1 + 1] - qy,
    points[2 * i2] - qx,
    points[2 * i2 + 1] - qy
  );
}

// src/OverlayVis.tsx
import { useContext as useContext2 } from "react";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function OverlayVis({
  op,
  active = !0
}) {
  let { overlayFullOpacity } = useContext2(StudioHackContext), opacity = overlayFullOpacity ? 1 : active ? 0.8 : 0.2;
  return op.overlayVis({ active, opacity });
}
function DistanceLine({
  from,
  to,
  distance
}) {
  let { overlayHideDistances } = useContext2(StudioHackContext), [label, fontSize] = distance === 1 / 0 ? ["\u221E", 24] : [`${Math.round(distance)}px`, 11];
  return /* @__PURE__ */ jsxs4("g", { children: [
    /* @__PURE__ */ jsx4(
      "line",
      {
        ...from.xy1(),
        ...to.xy2(),
        stroke: "white",
        strokeWidth: 5,
        strokeLinecap: "round"
      }
    ),
    /* @__PURE__ */ jsx4(
      "line",
      {
        ...from.xy1(),
        ...to.xy2(),
        stroke: "magenta",
        strokeWidth: 1.5,
        strokeDasharray: "4 3"
      }
    ),
    !overlayHideDistances && /* @__PURE__ */ jsx4(
      "text",
      {
        ...from.lerp(to, 0.5).xy(),
        fill: "magenta",
        stroke: "white",
        strokeWidth: 3,
        paintOrder: "stroke",
        fontSize,
        fontFamily: "monospace",
        textAnchor: "middle",
        dominantBaseline: "central",
        children: label
      }
    )
  ] });
}

// src/op/index.tsx
import { jsx as jsx5 } from "react/jsx-runtime";
var Operator = class {
  constructor(ctx) {
    this.ctx = ctx;
  }
  ctx;
  /** Children started with `child`, for debug views. */
  children = [];
  /** How many frames this op has run. */
  frames = 0;
  /**
   * The frame this op last ran with, as it was given (after any
   * parent remapped the pointer). Debug views draw against it.
   */
  lastFrame;
  /**
   * Start a child behavior, usually in the constructor. A child with
   * the same key as an existing one replaces it.
   */
  child(key, spec, ctx = this.ctx) {
    let child = new Child(key, spec, ctx), i = this.children.findIndex((c) => c.key === key);
    return i === -1 ? this.children.push(child) : this.children[i] = child, child;
  }
}, Modifier = class extends Operator {
  inner;
  /** `innerCtx` is the context to start the wrapped spec with. */
  constructor(ctx, inner, innerCtx = ctx) {
    super(ctx), this.inner = this.child(null, inner, innerCtx);
  }
  treeView(props) {
    return this.wrapperView(props);
  }
  overlayVis({ active }) {
    return /* @__PURE__ */ jsx5(OverlayVis, { op: this.inner.op, active });
  }
  /**
   * A tree-view node that's a box around the wrapped spec, labeled with
   * this modifier's name and optional `detail`.
   */
  wrapperView(props, detail) {
    return /* @__PURE__ */ jsx5(
      Box,
      {
        label: detail ? `${this.name} (${detail})` : this.name,
        path: props.path,
        children: this.inner.treeView(props)
      }
    );
  }
}, Child = class {
  constructor(key, spec, ctx) {
    this.key = key;
    this.op = new spec.opClass(ctx, ...spec.args), this.behavior = opBehavior(this.op);
  }
  key;
  /** The child's operator instance. */
  op;
  behavior;
  /** Run a frame. The result's `activePath` leads into this child. */
  run(frame) {
    let { op: _op, activePath, ...result } = this.behavior(frame);
    return { ...result, activePath: joinPath(this.key, activePath) };
  }
  /**
   * Draw this child's node in the tree view, given its parent's
   * `treeView` props.
   */
  treeView({ childPath }) {
    return /* @__PURE__ */ jsx5(
      SpecNode,
      {
        op: this.op,
        path: this.key === null ? childPath : `${childPath}${this.key}/`
      },
      this.key
    );
  }
};
function opBehavior(op) {
  return (frame) => {
    let { activePath, ...result } = op.frame(frame);
    return op.frames++, op.lastFrame = frame, { ...result, activePath: joinPath(op.name, activePath), op };
  };
}
function joinPath(...segments) {
  return segments.filter((s) => s != null).join("/");
}

// src/svgx/bounds.ts
import React2 from "react";
var emptyBounds = { empty: !0 };
function pointInBounds(point, bounds) {
  return bounds.empty ? !1 : point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
}
function unionBounds(a, b) {
  return a.empty ? b : b.empty ? a : {
    empty: !1,
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY)
  };
}
function transformBounds(bounds, transformStr) {
  if (bounds.empty) return bounds;
  let transforms = parseTransform(transformStr);
  if (transforms.length === 0) return bounds;
  let corners = [
    Vec2(bounds.minX, bounds.minY),
    Vec2(bounds.maxX, bounds.minY),
    Vec2(bounds.maxX, bounds.maxY),
    Vec2(bounds.minX, bounds.maxY)
  ].map((c) => localToGlobal(transforms, c));
  return {
    empty: !1,
    minX: Math.min(...corners.map((c) => c.x)),
    minY: Math.min(...corners.map((c) => c.y)),
    maxX: Math.max(...corners.map((c) => c.x)),
    maxY: Math.max(...corners.map((c) => c.y))
  };
}
function getGlobalBounds(element, transform) {
  let local = getLocalBounds(element);
  return transform ? transformBounds(local, transform) : local;
}
function getLocalBounds(element) {
  let props = element.props, type = element.type;
  if (type === "rect" || type === "foreignObject" || type === "image") {
    let x = Number(props.x) || 0, y = Number(props.y) || 0, w = Number(props.width) || 0, h = Number(props.height) || 0;
    return { empty: !1, minX: x, minY: y, maxX: x + w, maxY: y + h };
  }
  if (type === "circle") {
    let cx = Number(props.cx) || 0, cy = Number(props.cy) || 0, r = Number(props.r) || 0;
    return {
      empty: !1,
      minX: cx - r,
      minY: cy - r,
      maxX: cx + r,
      maxY: cy + r
    };
  }
  if (type === "ellipse") {
    let cx = Number(props.cx) || 0, cy = Number(props.cy) || 0, rx = Number(props.rx) || 0, ry = Number(props.ry) || 0;
    return {
      empty: !1,
      minX: cx - rx,
      minY: cy - ry,
      maxX: cx + rx,
      maxY: cy + ry
    };
  }
  if (type === "line") {
    let x1 = Number(props.x1) || 0, y1 = Number(props.y1) || 0, x2 = Number(props.x2) || 0, y2 = Number(props.y2) || 0;
    return {
      empty: !1,
      minX: Math.min(x1, x2),
      minY: Math.min(y1, y2),
      maxX: Math.max(x1, x2),
      maxY: Math.max(y1, y2)
    };
  }
  if (type === "polygon" || type === "polyline") {
    let nums = String(props.points ?? "").trim().split(/[\s,]+/).filter((s) => s !== "").map(Number), bounds2 = emptyBounds;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      let [x, y] = [nums[i], nums[i + 1]];
      !Number.isFinite(x) || !Number.isFinite(y) || (bounds2 = unionBounds(bounds2, {
        empty: !1,
        minX: x,
        minY: y,
        maxX: x,
        maxY: y
      }));
    }
    return bounds2;
  }
  if (!shouldRecurseIntoChildren(element)) return emptyBounds;
  let children = props.children;
  if (children == null) return emptyBounds;
  let bounds = emptyBounds;
  for (let child of React2.Children.toArray(children)) {
    if (!React2.isValidElement(child)) continue;
    let childBounds = getLocalBounds(child), childTransform = child.props.transform, transformed = childTransform ? transformBounds(childBounds, childTransform) : childBounds;
    bounds = unionBounds(bounds, transformed);
  }
  return bounds;
}
function boundsCenter(bounds) {
  return Vec2((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2);
}

// src/svgx/helpers.ts
function translate(...args) {
  let { x, y } = Vec2(...args);
  return `translate(${x},${y}) `;
}
function rotateDeg(degrees2, c = Vec2(0)) {
  let { x, y } = Vec2(c);
  return `rotate(${degrees2},${x},${y}) `;
}
function rotateRad(radians2, c = Vec2(0)) {
  return rotateDeg(radians2 * 180 / Math.PI, c);
}
function scale2(sx, sy) {
  return sy === void 0 && (sy = sx), `scale(${sx},${sy}) `;
}
function path(...pts) {
  return pts.map(
    (pt) => typeof pt == "string" ? pt : typeof pt == "number" ? pt.toString() : Vec2(pt).str()
  ).join(" ");
}
function draggableLine(a, b) {
  let start = Vec2(a), v2 = Vec2(b).sub(start);
  return {
    transform: translate(start) + rotateDeg(v2.angleDeg()) + scale2(v2.len()),
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 0,
    vectorEffect: "non-scaling-stroke"
  };
}

// src/svgx/layeredBounds.ts
function getLayeredBounds(layered) {
  return [...layered.byId.values()].reduce(
    (bounds, { element }) => unionBounds(
      bounds,
      getGlobalBounds(element, element.props.transform ?? "")
    ),
    emptyBounds
  );
}

// node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/define.js
function define_default(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype, prototype.constructor = constructor;
}
function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition) prototype[key] = definition[key];
  return prototype;
}

// node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/color.js
function Color() {
}
var darker = 0.7, brighter = 1 / darker, reI = "\\s*([+-]?\\d+)\\s*", reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", reHex = /^#([0-9a-f]{3,8})$/, reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`), reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`), reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`), reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`), reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`), reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`), named = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
};
define_default(Color, color, {
  copy(channels) {
    return Object.assign(new this.constructor(), this, channels);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: color_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: color_formatHex,
  formatHex8: color_formatHex8,
  formatHsl: color_formatHsl,
  formatRgb: color_formatRgb,
  toString: color_formatRgb
});
function color_formatHex() {
  return this.rgb().formatHex();
}
function color_formatHex8() {
  return this.rgb().formatHex8();
}
function color_formatHsl() {
  return hslConvert(this).formatHsl();
}
function color_formatRgb() {
  return this.rgb().formatRgb();
}
function color(format) {
  var m, l;
  return format = (format + "").trim().toLowerCase(), (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) : l === 3 ? new Rgb(m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, (m & 15) << 4 | m & 15, 1) : l === 8 ? rgba(m >> 24 & 255, m >> 16 & 255, m >> 8 & 255, (m & 255) / 255) : l === 4 ? rgba(m >> 12 & 15 | m >> 8 & 240, m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, ((m & 15) << 4 | m & 15) / 255) : null) : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) : named.hasOwnProperty(format) ? rgbn(named[format]) : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
}
function rgbn(n) {
  return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
}
function rgba(r, g, b, a) {
  return a <= 0 && (r = g = b = NaN), new Rgb(r, g, b, a);
}
function rgbConvert(o) {
  return o instanceof Color || (o = color(o)), o ? (o = o.rgb(), new Rgb(o.r, o.g, o.b, o.opacity)) : new Rgb();
}
function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity ?? 1);
}
function Rgb(r, g, b, opacity) {
  this.r = +r, this.g = +g, this.b = +b, this.opacity = +opacity;
}
define_default(Rgb, rgb, extend(Color, {
  brighter(k) {
    return k = k == null ? brighter : Math.pow(brighter, k), new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker(k) {
    return k = k == null ? darker : Math.pow(darker, k), new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
  },
  displayable() {
    return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
  },
  hex: rgb_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: rgb_formatHex,
  formatHex8: rgb_formatHex8,
  formatRgb: rgb_formatRgb,
  toString: rgb_formatRgb
}));
function rgb_formatHex() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
}
function rgb_formatHex8() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function rgb_formatRgb() {
  let a = clampa(this.opacity);
  return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
}
function clampa(opacity) {
  return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
}
function clampi(value) {
  return Math.max(0, Math.min(255, Math.round(value) || 0));
}
function hex(value) {
  return value = clampi(value), (value < 16 ? "0" : "") + value.toString(16);
}
function hsla(h, s, l, a) {
  return a <= 0 ? h = s = l = NaN : l <= 0 || l >= 1 ? h = s = NaN : s <= 0 && (h = NaN), new Hsl(h, s, l, a);
}
function hslConvert(o) {
  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
  if (o instanceof Color || (o = color(o)), !o) return new Hsl();
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255, g = o.g / 255, b = o.b / 255, min = Math.min(r, g, b), max = Math.max(r, g, b), h = NaN, s = max - min, l = (max + min) / 2;
  return s ? (r === max ? h = (g - b) / s + (g < b) * 6 : g === max ? h = (b - r) / s + 2 : h = (r - g) / s + 4, s /= l < 0.5 ? max + min : 2 - max - min, h *= 60) : s = l > 0 && l < 1 ? 0 : h, new Hsl(h, s, l, o.opacity);
}
function hsl(h, s, l, opacity) {
  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity ?? 1);
}
function Hsl(h, s, l, opacity) {
  this.h = +h, this.s = +s, this.l = +l, this.opacity = +opacity;
}
define_default(Hsl, hsl, extend(Color, {
  brighter(k) {
    return k = k == null ? brighter : Math.pow(brighter, k), new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker(k) {
    return k = k == null ? darker : Math.pow(darker, k), new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb() {
    var h = this.h % 360 + (this.h < 0) * 360, s = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < 0.5 ? l : 1 - l) * s, m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  clamp() {
    return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
  },
  formatHsl() {
    let a = clampa(this.opacity);
    return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
  }
}));
function clamph(value) {
  return value = (value || 0) % 360, value < 0 ? value + 360 : value;
}
function clampt(value) {
  return Math.max(0, Math.min(1, value || 0));
}
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
}

// node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/math.js
var radians = Math.PI / 180, degrees = 180 / Math.PI;

// node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/lab.js
var K = 18, Xn = 0.96422, Yn = 1, Zn = 0.82521, t0 = 4 / 29, t1 = 6 / 29, t2 = 3 * t1 * t1, t3 = t1 * t1 * t1;
function labConvert(o) {
  if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
  if (o instanceof Hcl) return hcl2lab(o);
  o instanceof Rgb || (o = rgbConvert(o));
  var r = rgb2lrgb(o.r), g = rgb2lrgb(o.g), b = rgb2lrgb(o.b), y = xyz2lab((0.2225045 * r + 0.7168786 * g + 0.0606169 * b) / Yn), x, z;
  return r === g && g === b ? x = z = y : (x = xyz2lab((0.4360747 * r + 0.3850649 * g + 0.1430804 * b) / Xn), z = xyz2lab((0.0139322 * r + 0.0971045 * g + 0.7141733 * b) / Zn)), new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
}
function lab(l, a, b, opacity) {
  return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity ?? 1);
}
function Lab(l, a, b, opacity) {
  this.l = +l, this.a = +a, this.b = +b, this.opacity = +opacity;
}
define_default(Lab, lab, extend(Color, {
  brighter(k) {
    return new Lab(this.l + K * (k ?? 1), this.a, this.b, this.opacity);
  },
  darker(k) {
    return new Lab(this.l - K * (k ?? 1), this.a, this.b, this.opacity);
  },
  rgb() {
    var y = (this.l + 16) / 116, x = isNaN(this.a) ? y : y + this.a / 500, z = isNaN(this.b) ? y : y - this.b / 200;
    return x = Xn * lab2xyz(x), y = Yn * lab2xyz(y), z = Zn * lab2xyz(z), new Rgb(
      lrgb2rgb(3.1338561 * x - 1.6168667 * y - 0.4906146 * z),
      lrgb2rgb(-0.9787684 * x + 1.9161415 * y + 0.033454 * z),
      lrgb2rgb(0.0719453 * x - 0.2289914 * y + 1.4052427 * z),
      this.opacity
    );
  }
}));
function xyz2lab(t) {
  return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
}
function lab2xyz(t) {
  return t > t1 ? t * t * t : t2 * (t - t0);
}
function lrgb2rgb(x) {
  return 255 * (x <= 31308e-7 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
}
function rgb2lrgb(x) {
  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}
function hclConvert(o) {
  if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
  if (o instanceof Lab || (o = labConvert(o)), o.a === 0 && o.b === 0) return new Hcl(NaN, 0 < o.l && o.l < 100 ? 0 : NaN, o.l, o.opacity);
  var h = Math.atan2(o.b, o.a) * degrees;
  return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
}
function hcl(h, c, l, opacity) {
  return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity ?? 1);
}
function Hcl(h, c, l, opacity) {
  this.h = +h, this.c = +c, this.l = +l, this.opacity = +opacity;
}
function hcl2lab(o) {
  if (isNaN(o.h)) return new Lab(o.l, 0, 0, o.opacity);
  var h = o.h * radians;
  return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
}
define_default(Hcl, hcl, extend(Color, {
  brighter(k) {
    return new Hcl(this.h, this.c, this.l + K * (k ?? 1), this.opacity);
  },
  darker(k) {
    return new Hcl(this.h, this.c, this.l - K * (k ?? 1), this.opacity);
  },
  rgb() {
    return hcl2lab(this).rgb();
  }
}));

// node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/constant.js
var constant_default = (x) => () => x;

// node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/color.js
function linear(a, d) {
  return function(t) {
    return a + t * d;
  };
}
function nogamma(a, b) {
  var d = b - a;
  return d ? linear(a, d) : constant_default(isNaN(a) ? b : a);
}

// node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/lab.js
function lab2(start, end) {
  var l = nogamma((start = lab(start)).l, (end = lab(end)).l), a = nogamma(start.a, end.a), b = nogamma(start.b, end.b), opacity = nogamma(start.opacity, end.opacity);
  return function(t) {
    return start.l = l(t), start.a = a(t), start.b = b(t), start.opacity = opacity(t), start + "";
  };
}

// node_modules/.pnpm/d3-interpolate-path@2.3.0/node_modules/d3-interpolate-path/build/d3-interpolate-path.mjs
function ownKeys(object, enumerableOnly) {
  var keys2 = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function(sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys2.push.apply(keys2, symbols);
  }
  return keys2;
}
function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    i % 2 ? ownKeys(Object(source), !0).forEach(function(key) {
      _defineProperty(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function(key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }
  return target;
}
function _typeof(obj) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? _typeof = function(obj2) {
    return typeof obj2;
  } : _typeof = function(obj2) {
    return obj2 && typeof Symbol == "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
  }, _typeof(obj);
}
function _defineProperty(obj, key, value) {
  return key in obj ? Object.defineProperty(obj, key, {
    value,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : obj[key] = value, obj;
}
function _extends() {
  return _extends = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source)
        Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
    }
    return target;
  }, _extends.apply(this, arguments);
}
function _unsupportedIterableToArray(o, minLen) {
  if (o) {
    if (typeof o == "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor && (n = o.constructor.name), n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }
}
function _arrayLikeToArray(arr, len) {
  (len == null || len > arr.length) && (len = arr.length);
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
function _createForOfIteratorHelper(o, allowArrayLike) {
  var it = typeof Symbol < "u" && o[Symbol.iterator] || o["@@iterator"];
  if (!it) {
    if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length == "number") {
      it && (o = it);
      var i = 0, F = function() {
      };
      return {
        s: F,
        n: function() {
          return i >= o.length ? {
            done: !0
          } : {
            done: !1,
            value: o[i++]
          };
        },
        e: function(e) {
          throw e;
        },
        f: F
      };
    }
    throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
  }
  var normalCompletion = !0, didErr = !1, err;
  return {
    s: function() {
      it = it.call(o);
    },
    n: function() {
      var step = it.next();
      return normalCompletion = step.done, step;
    },
    e: function(e) {
      didErr = !0, err = e;
    },
    f: function() {
      try {
        !normalCompletion && it.return != null && it.return();
      } finally {
        if (didErr) throw err;
      }
    }
  };
}
function decasteljau(points, t) {
  var left = [], right = [];
  function decasteljauRecurse(points2, t4) {
    if (points2.length === 1)
      left.push(points2[0]), right.push(points2[0]);
    else {
      for (var newPoints = Array(points2.length - 1), i = 0; i < newPoints.length; i++)
        i === 0 && left.push(points2[0]), i === newPoints.length - 1 && right.push(points2[i + 1]), newPoints[i] = [(1 - t4) * points2[i][0] + t4 * points2[i + 1][0], (1 - t4) * points2[i][1] + t4 * points2[i + 1][1]];
      decasteljauRecurse(newPoints, t4);
    }
  }
  return points.length && decasteljauRecurse(points, t), {
    left,
    right: right.reverse()
  };
}
function pointsToCommand(points) {
  var command = {};
  return points.length === 4 && (command.x2 = points[2][0], command.y2 = points[2][1]), points.length >= 3 && (command.x1 = points[1][0], command.y1 = points[1][1]), command.x = points[points.length - 1][0], command.y = points[points.length - 1][1], points.length === 4 ? command.type = "C" : points.length === 3 ? command.type = "Q" : command.type = "L", command;
}
function splitCurveAsPoints(points, segmentCount) {
  segmentCount = segmentCount || 2;
  for (var segments = [], remainingCurve = points, tIncrement = 1 / segmentCount, i = 0; i < segmentCount - 1; i++) {
    var tRelative = tIncrement / (1 - tIncrement * i), split = decasteljau(remainingCurve, tRelative);
    segments.push(split.left), remainingCurve = split.right;
  }
  return segments.push(remainingCurve), segments;
}
function splitCurve(commandStart, commandEnd, segmentCount) {
  var points = [[commandStart.x, commandStart.y]];
  return commandEnd.x1 != null && points.push([commandEnd.x1, commandEnd.y1]), commandEnd.x2 != null && points.push([commandEnd.x2, commandEnd.y2]), points.push([commandEnd.x, commandEnd.y]), splitCurveAsPoints(points, segmentCount).map(pointsToCommand);
}
var commandTokenRegex = /[MLCSTQAHVZmlcstqahv]|-?[\d.e+-]+/g, typeMap = {
  M: ["x", "y"],
  L: ["x", "y"],
  H: ["x"],
  V: ["y"],
  C: ["x1", "y1", "x2", "y2", "x", "y"],
  S: ["x2", "y2", "x", "y"],
  Q: ["x1", "y1", "x", "y"],
  T: ["x", "y"],
  A: ["rx", "ry", "xAxisRotation", "largeArcFlag", "sweepFlag", "x", "y"],
  Z: []
};
Object.keys(typeMap).forEach(function(key) {
  typeMap[key.toLowerCase()] = typeMap[key];
});
function arrayOfLength(length, value) {
  for (var array = Array(length), i = 0; i < length; i++)
    array[i] = value;
  return array;
}
function commandToString(command) {
  return "".concat(command.type).concat(typeMap[command.type].map(function(p) {
    return command[p];
  }).join(","));
}
function convertToSameType(aCommand, bCommand) {
  var conversionMap = {
    x1: "x",
    y1: "y",
    x2: "x",
    y2: "y"
  }, readFromBKeys = ["xAxisRotation", "largeArcFlag", "sweepFlag"];
  if (aCommand.type !== bCommand.type && bCommand.type.toUpperCase() !== "M") {
    var aConverted = {};
    Object.keys(bCommand).forEach(function(bKey) {
      var bValue = bCommand[bKey], aValue = aCommand[bKey];
      aValue === void 0 && (readFromBKeys.includes(bKey) ? aValue = bValue : (aValue === void 0 && conversionMap[bKey] && (aValue = aCommand[conversionMap[bKey]]), aValue === void 0 && (aValue = 0))), aConverted[bKey] = aValue;
    }), aConverted.type = bCommand.type, aCommand = aConverted;
  }
  return aCommand;
}
function splitSegment(commandStart, commandEnd, segmentCount) {
  var segments = [];
  if (commandEnd.type === "L" || commandEnd.type === "Q" || commandEnd.type === "C")
    segments = segments.concat(splitCurve(commandStart, commandEnd, segmentCount));
  else {
    var copyCommand = _extends({}, commandStart);
    copyCommand.type === "M" && (copyCommand.type = "L"), segments = segments.concat(arrayOfLength(segmentCount - 1).map(function() {
      return copyCommand;
    })), segments.push(commandEnd);
  }
  return segments;
}
function extend2(commandsToExtend, referenceCommands, excludeSegment) {
  var numSegmentsToExtend = commandsToExtend.length - 1, numReferenceSegments = referenceCommands.length - 1, segmentRatio = numSegmentsToExtend / numReferenceSegments, countPointsPerSegment = arrayOfLength(numReferenceSegments).reduce(function(accum, d, i) {
    var insertIndex = Math.floor(segmentRatio * i);
    if (excludeSegment && insertIndex < commandsToExtend.length - 1 && excludeSegment(commandsToExtend[insertIndex], commandsToExtend[insertIndex + 1])) {
      var addToPriorSegment = segmentRatio * i % 1 < 0.5;
      accum[insertIndex] && (addToPriorSegment ? insertIndex > 0 ? insertIndex -= 1 : insertIndex < commandsToExtend.length - 1 && (insertIndex += 1) : insertIndex < commandsToExtend.length - 1 ? insertIndex += 1 : insertIndex > 0 && (insertIndex -= 1));
    }
    return accum[insertIndex] = (accum[insertIndex] || 0) + 1, accum;
  }, []), extended = countPointsPerSegment.reduce(function(extended2, segmentCount, i) {
    if (i === commandsToExtend.length - 1) {
      var lastCommandCopies = arrayOfLength(segmentCount, _extends({}, commandsToExtend[commandsToExtend.length - 1]));
      return lastCommandCopies[0].type === "M" && lastCommandCopies.forEach(function(d) {
        d.type = "L";
      }), extended2.concat(lastCommandCopies);
    }
    return extended2.concat(splitSegment(commandsToExtend[i], commandsToExtend[i + 1], segmentCount));
  }, []);
  return extended.unshift(commandsToExtend[0]), extended;
}
function pathCommandsFromString(d) {
  for (var tokens = (d || "").match(commandTokenRegex) || [], commands = [], commandArgs, command, i = 0; i < tokens.length; ++i)
    if (commandArgs = typeMap[tokens[i]], commandArgs) {
      command = {
        type: tokens[i]
      };
      for (var a = 0; a < commandArgs.length; ++a)
        command[commandArgs[a]] = +tokens[i + a + 1];
      i += commandArgs.length, commands.push(command);
    }
  return commands;
}
function interpolatePathCommands(aCommandsInput, bCommandsInput, interpolateOptions) {
  var aCommands = aCommandsInput == null ? [] : aCommandsInput.slice(), bCommands = bCommandsInput == null ? [] : bCommandsInput.slice(), _ref = _typeof(interpolateOptions) === "object" ? interpolateOptions : {
    excludeSegment: interpolateOptions,
    snapEndsToInput: !0
  }, excludeSegment = _ref.excludeSegment, snapEndsToInput = _ref.snapEndsToInput;
  if (!aCommands.length && !bCommands.length)
    return function() {
      return [];
    };
  var addZ = (aCommands.length === 0 || aCommands[aCommands.length - 1].type === "Z") && (bCommands.length === 0 || bCommands[bCommands.length - 1].type === "Z");
  aCommands.length > 0 && aCommands[aCommands.length - 1].type === "Z" && aCommands.pop(), bCommands.length > 0 && bCommands[bCommands.length - 1].type === "Z" && bCommands.pop(), aCommands.length ? bCommands.length || bCommands.push(aCommands[0]) : aCommands.push(bCommands[0]);
  var numPointsToExtend = Math.abs(bCommands.length - aCommands.length);
  numPointsToExtend !== 0 && (bCommands.length > aCommands.length ? aCommands = extend2(aCommands, bCommands, excludeSegment) : bCommands.length < aCommands.length && (bCommands = extend2(bCommands, aCommands, excludeSegment))), aCommands = aCommands.map(function(aCommand, i) {
    return convertToSameType(aCommand, bCommands[i]);
  });
  var interpolatedCommands = aCommands.map(function(aCommand) {
    return _objectSpread2({}, aCommand);
  });
  return addZ && (interpolatedCommands.push({
    type: "Z"
  }), aCommands.push({
    type: "Z"
  })), function(t) {
    if (t === 1 && snapEndsToInput)
      return bCommandsInput ?? [];
    if (t === 0)
      return aCommands;
    for (var i = 0; i < interpolatedCommands.length; ++i) {
      var aCommand = aCommands[i], bCommand = bCommands[i], interpolatedCommand = interpolatedCommands[i], _iterator = _createForOfIteratorHelper(typeMap[interpolatedCommand.type]), _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done; ) {
          var arg = _step.value;
          interpolatedCommand[arg] = (1 - t) * aCommand[arg] + t * bCommand[arg], (arg === "largeArcFlag" || arg === "sweepFlag") && (interpolatedCommand[arg] = Math.round(interpolatedCommand[arg]));
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }
    return interpolatedCommands;
  };
}
function interpolatePath(a, b, interpolateOptions) {
  var aCommands = pathCommandsFromString(a), bCommands = pathCommandsFromString(b), _ref2 = _typeof(interpolateOptions) === "object" ? interpolateOptions : {
    excludeSegment: interpolateOptions,
    snapEndsToInput: !0
  }, excludeSegment = _ref2.excludeSegment, snapEndsToInput = _ref2.snapEndsToInput;
  if (!aCommands.length && !bCommands.length)
    return function() {
      return "";
    };
  var commandInterpolator = interpolatePathCommands(aCommands, bCommands, {
    excludeSegment,
    snapEndsToInput
  });
  return function(t) {
    if (t === 1 && snapEndsToInput)
      return b ?? "";
    var interpolatedCommands = commandInterpolator(t), interpolatedString = "", _iterator2 = _createForOfIteratorHelper(interpolatedCommands), _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done; ) {
        var interpolatedCommand = _step2.value;
        interpolatedString += commandToString(interpolatedCommand);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
    return interpolatedString;
  };
}

// src/svgx/lerp.tsx
import React4, { cloneElement as cloneElement2 } from "react";

// src/ValueView.tsx
import React3, { createContext as createContext3, useContext as useContext3 } from "react";
import { jsx as jsx6 } from "react/jsx-runtime";
function DefaultValueView(props) {
  return /* @__PURE__ */ jsx6(
    "pre",
    {
      style: {
        margin: 0,
        fontSize: "11px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word"
      },
      children: props.kind === "state" ? stringifyState(props.value) : stringifySvg(props.value)
    }
  );
}
var ValueViewContext = createContext3(DefaultValueView);
function ValueViewProvider({
  component,
  children
}) {
  return /* @__PURE__ */ jsx6(ValueViewContext.Provider, { value: component, children });
}
function ValueView(props) {
  let Component2 = useContext3(ValueViewContext);
  return /* @__PURE__ */ jsx6(Component2, { ...props });
}
function stringifyState(value) {
  let ancestors = [];
  try {
    return JSON.stringify(
      value,
      function(_key, v2) {
        for (; ancestors.length > 0 && ancestors.at(-1) !== this; )
          ancestors.pop();
        if (typeof v2 == "object" && v2 !== null) {
          if (ancestors.includes(v2)) return "[Circular]";
          ancestors.push(v2);
        }
        return jsonSafe(v2);
      },
      2
    ) ?? String(value);
  } catch {
    return String(value);
  }
}
function jsonSafe(v2) {
  return typeof v2 == "number" && !Number.isInteger(v2) ? Math.round(v2 * 100) / 100 : typeof v2 == "function" ? `[Function ${v2.name || "anonymous"}]` : typeof v2 == "bigint" ? `${v2}n` : typeof v2 == "symbol" ? v2.toString() : v2 instanceof Map ? Object.fromEntries(v2) : v2 instanceof Set ? [...v2] : v2;
}
function stringifySvg(node, indent = "") {
  if (!React3.isValidElement(node))
    return indent + (typeof node == "string" ? node : stringifyState(node));
  let element = node, name = elementName(element) ?? "", { children, ...props } = element.props, attrs = Object.entries(props).filter(([, v2]) => v2 !== void 0).map(([k, v2]) => ` ${k}=${attrValue(v2)}`).join(""), kids = React3.Children.toArray(children);
  return kids.length === 0 ? `${indent}<${name}${attrs} />` : [
    `${indent}<${name}${attrs}>`,
    ...kids.map((kid) => stringifySvg(kid, indent + "  ")),
    `${indent}</${name}>`
  ].join(`
`);
}
function attrValue(v2) {
  return typeof v2 == "string" ? JSON.stringify(v2) : typeof v2 == "function" ? "{\u0192}" : `{${stringifyState(v2).replace(/\s*\n\s*/g, " ")}}`;
}

// src/svgx/lerp.tsx
import { Fragment as Fragment3, jsx as jsx7, jsxs as jsxs5 } from "react/jsx-runtime";
var COLOR_PROPS = /* @__PURE__ */ new Set([
  "fill",
  "stroke",
  "color",
  "stop-color",
  "flood-color",
  "lighting-color",
  // CSS properties that can appear in style objects
  "backgroundColor",
  "borderColor",
  "outlineColor"
]), interpolateColor = lab2, NO_LERP_PROPS = /* @__PURE__ */ new Set(["pointerEvents", "cursor"]), DEFAULT_VALUE_FOR_KEY = {
  opacity: 1
};
function parsePoints(pointsStr) {
  let tokens = pointsStr.trim().split(/[\s,]+/).filter((s) => s.length > 0).map((s) => parseFloat(s)), points = [];
  for (let i = 0; i < tokens.length; i += 2)
    points.push([tokens[i], tokens[i + 1]]);
  return points;
}
function serializePoints(points) {
  return points.map((p) => `${p[0]},${p[1]}`).join(" ");
}
function lerpPoints(pointsA, pointsB, t) {
  let parsedA = parsePoints(pointsA), parsedB = parsePoints(pointsB);
  if (parsedA.length !== parsedB.length)
    throw new Error(
      `Cannot lerp points: different point counts (${parsedA.length} vs ${parsedB.length})`
    );
  let lerped = parsedA.map((pa, i) => {
    let pb = parsedB[i];
    return [lerp(pa[0], pb[0], t), lerp(pa[1], pb[1], t)];
  });
  return serializePoints(lerped);
}
function lerpValue(key, valA, valB, t) {
  if (valA === valB || (valA ??= DEFAULT_VALUE_FOR_KEY[key], valB ??= DEFAULT_VALUE_FOR_KEY[key], valA !== void 0 && valB === void 0))
    return valA;
  if (valA === void 0 && valB !== void 0)
    return valB;
  if (typeof valA == "number" && typeof valB == "number")
    return lerp(valA, valB, t);
  if (key === "points" && typeof valA == "string" && typeof valB == "string")
    return lerpPoints(valA, valB, t);
  if (key === "d" && typeof valA == "string" && typeof valB == "string")
    return interpolatePath(valA, valB)(t);
  if (COLOR_PROPS.has(key) && typeof valA == "string" && typeof valB == "string") {
    let isANone = valA === "none";
    if (isANone || valB === "none") {
      let actualColor = isANone ? valB : valA, colorRgb = rgb(actualColor);
      if (colorRgb === null)
        throw new Error(
          `Cannot lerp prop "${key}": invalid color value (${actualColor})`
        );
      let transparentColor = rgb(colorRgb.r, colorRgb.g, colorRgb.b, 0), opaqueColor = rgb(colorRgb.r, colorRgb.g, colorRgb.b, 1);
      return (isANone ? interpolateColor(
        transparentColor.formatRgb(),
        opaqueColor.formatRgb()
      ) : interpolateColor(
        opaqueColor.formatRgb(),
        transparentColor.formatRgb()
      ))(t);
    }
    return interpolateColor(valA, valB)(t);
  } else if ((key === "filter" || key === "WebkitFilter") && typeof valA == "string" && typeof valB == "string") {
    let result = tryLerpFilter(valA, valB, t);
    if (result) return result;
    throw new Error(
      `Cannot lerp prop "${key}": unrecognized filter values (${valA} vs ${valB})`
    );
  } else if (typeof valA == "string" && typeof valB == "string") {
    let numA = parseFloat(valA), numB = parseFloat(valB);
    if (!isNaN(numA) && !isNaN(numB))
      return String(lerp(numA, numB, t));
    throw new Error(
      `Cannot lerp prop "${key}": different non-numeric values (${valA} vs ${valB})`
    );
  } else
    throw new Error(
      `Cannot lerp prop "${key}": different non-numeric values (${valA} vs ${valB})`
    );
}
function fadeElement(element, factor) {
  if (isComponentElement(element)) return factor >= 0.5 ? element : null;
  let opacity = +(element.props.opacity ?? 1) * factor;
  return opacity <= 1e-3 ? null : cloneElement2(element, { opacity });
}
function lerpSvgx(a, b, t, unblendedFrom = "a") {
  if (a.type !== b.type)
    throw new ErrorWithJSX(
      `Cannot lerp between different element types: ${String(
        a.type
      )} and ${String(b.type)}`,
      /* @__PURE__ */ jsxs5(Fragment3, { children: [
        /* @__PURE__ */ jsx7("p", { style: { marginBottom: 8 }, children: `During interpolation, I found elements of different types at the same path in the "before" and "after" SVG trees. I don't know how to interpolate between those, sorry.` }),
        a.props.id !== void 0 && a.props.id === b.props.id && /* @__PURE__ */ jsxs5("p", { style: { marginBottom: 8 }, children: [
          "(FYI: These elements share the ID",
          " ",
          /* @__PURE__ */ jsx7("span", { style: { fontFamily: "monospace" }, children: a.props.id }),
          ". I would guess that you are drawing this element in two different code paths, and they don't match up.)"
        ] }),
        /* @__PURE__ */ jsx7(ValueView, { kind: "svg", value: a }),
        /* @__PURE__ */ jsx7("div", { style: { marginTop: 16, marginBottom: 16 }, children: "vs" }),
        /* @__PURE__ */ jsx7(ValueView, { kind: "svg", value: b })
      ] })
    );
  if (isComponentElement(a))
    return lerpComponentElement(a, b, t, unblendedFrom);
  let propsA = a.props, propsB = b.props, fromB = unblendedFrom === "b", transformA = propsA.transform || "", transformB = propsB.transform || "", lerpedTransform = lerpTransformString(transformA, transformB, t), lerpedProps = {}, allPropKeys = /* @__PURE__ */ new Set([...objectKeys(propsA), ...objectKeys(propsB)]);
  for (let key of allPropKeys) {
    if (key === "children" || key === "transform") continue;
    if (key.startsWith("data-") || key.startsWith("dragology") || /^on[A-Z]/.test(key) || NO_LERP_PROPS.has(key)) {
      fromB && (lerpedProps[key] = propsB[key]);
      continue;
    }
    let valA = propsA[key], valB = propsB[key];
    if (key === "style" && typeof valA == "object" && typeof valB == "object") {
      let styleA = valA || {}, styleB = valB || {}, lerpedStyle = {}, allStyleKeys = /* @__PURE__ */ new Set([
        ...objectKeys(styleA),
        ...objectKeys(styleB)
      ]);
      for (let styleKey of allStyleKeys) {
        if (NO_LERP_PROPS.has(styleKey)) {
          lerpedStyle[styleKey] = (fromB ? styleB : styleA)[styleKey];
          continue;
        }
        lerpedStyle[styleKey] = lerpValue(
          styleKey,
          styleA[styleKey],
          styleB[styleKey],
          t
        );
      }
      lerpedProps[key] = lerpedStyle;
    } else
      lerpedProps[key] = lerpValue(key, valA, valB, t);
  }
  if (!shouldRecurseIntoChildren(a))
    return React4.cloneElement(a, {
      ...lerpedProps,
      ...lerpedTransform ? { transform: lerpedTransform } : {},
      children: (fromB ? propsB : propsA).children
    });
  let childrenA = childrenToArray(propsA.children), childrenB = childrenToArray(propsB.children), lerpedChildren = [], slots = /* @__PURE__ */ new Map(), addChildren = (children, side) => {
    let unkeyedIdx = 0;
    for (let child of children) {
      let dKey = isValidSvgx(child) ? child.props.dragologyKey : void 0, slotKey = dKey !== void 0 ? dKey : String(unkeyedIdx++), slot = slots.get(slotKey) ?? {};
      slot[side] = child, slots.set(slotKey, slot);
    }
  };
  addChildren(childrenA, "a"), addChildren(childrenB, "b");
  for (let { a: childA, b: childB } of slots.values())
    if (childA !== void 0 && childB !== void 0)
      isValidSvgx(childA) && isValidSvgx(childB) ? lerpedChildren.push(lerpSvgx(childA, childB, t, unblendedFrom)) : lerpedChildren.push(fromB ? childB : childA);
    else if (childA !== void 0 && isValidSvgx(childA)) {
      let faded = fadeElement(childA, 1 - t);
      faded && lerpedChildren.push(faded);
    } else if (childB !== void 0 && isValidSvgx(childB)) {
      let faded = fadeElement(childB, t);
      faded && lerpedChildren.push(faded);
    }
  return React4.cloneElement(a, {
    ...lerpedProps,
    ...lerpedTransform ? { transform: lerpedTransform } : {},
    children: lerpedChildren.length === 0 ? void 0 : lerpedChildren
  });
}
function lerpComponentElement(a, b, t, unblendedFrom) {
  let fromB = unblendedFrom === "b", base = fromB ? cloneElement2(b, { key: a.key ?? void 0 }) : a, { dragologyLerpProps: lerpProps } = base.props;
  if (!lerpProps) return base;
  let keys2 = lerpProps === !0 ? /* @__PURE__ */ new Set([...objectKeys(a.props), ...objectKeys(b.props)]) : lerpProps;
  lerpProps !== !0 && warnAboutUnknownLerpProps(keys2, a, b);
  let lerped = {};
  for (let key of keys2)
    key === "children" || key.startsWith("data-") || key.startsWith("dragology") || typeof a.props[key] == "function" || (lerped[key] = lerpData(
      key,
      a.props[key],
      b.props[key],
      t,
      fromB
    ));
  return cloneElement2(base, lerped);
}
var warnedLerpProps = /* @__PURE__ */ new Set();
function warnAboutUnknownLerpProps(keys2, a, b) {
  for (let key of keys2) {
    if (key in a.props || key in b.props) continue;
    let id = `${elementName(a)}.${key}`;
    warnedLerpProps.has(id) || (warnedLerpProps.add(id), console.warn(
      `dragologyLerpProps on <${elementName(a)}> lists "${key}", but it has no prop by that name.`
    ));
  }
}
function lerpData(key, valA, valB, t, fromB) {
  if (valA === valB) return valA;
  let unblended = fromB ? valB : valA;
  if (Array.isArray(valA) && Array.isArray(valB))
    return valA.length !== valB.length ? unblended : valA.map((v2, i) => lerpData(key, v2, valB[i], t, fromB));
  if (isPlainObject(valA) && isPlainObject(valB)) {
    let keysA = Object.keys(valA), keysB = Object.keys(valB);
    return keysA.length !== keysB.length || !keysA.every((k) => Object.hasOwn(valB, k)) ? unblended : Object.fromEntries(
      keysA.map((k) => [k, lerpData(k, valA[k], valB[k], t, fromB)])
    );
  }
  if (typeof valA == "string" && typeof valB == "string" && color(valA) && color(valB))
    return interpolateColor(valA, valB)(t);
  try {
    return lerpValue(key, valA, valB, t);
  } catch {
    return unblended;
  }
}
function isPlainObject(v2) {
  if (typeof v2 != "object" || v2 === null) return !1;
  let proto = Object.getPrototypeOf(v2);
  return proto === Object.prototype || proto === null;
}
var DROP_SHADOW_RE = /^drop-shadow\(\s*([\d.+-]+)(?:px)?\s+([\d.+-]+)(?:px)?\s+([\d.+-]+)(?:px)?\s+rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)\s*\)$/;
function parseDropShadow(s) {
  let m = s.match(DROP_SHADOW_RE);
  return m ? {
    offsetX: parseFloat(m[1]),
    offsetY: parseFloat(m[2]),
    blur: parseFloat(m[3]),
    r: parseFloat(m[4]),
    g: parseFloat(m[5]),
    b: parseFloat(m[6]),
    a: parseFloat(m[7])
  } : null;
}
function serializeDropShadow(ds) {
  return `drop-shadow(${ds.offsetX}px ${ds.offsetY}px ${ds.blur}px rgba(${ds.r},${ds.g},${ds.b},${ds.a}))`;
}
function lerpDropShadow(a, b, t) {
  return serializeDropShadow({
    offsetX: lerp(a.offsetX, b.offsetX, t),
    offsetY: lerp(a.offsetY, b.offsetY, t),
    blur: lerp(a.blur, b.blur, t),
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
    a: lerp(a.a, b.a, t)
  });
}
function tryLerpFilter(a, b, t) {
  let dsA = parseDropShadow(a), dsB = parseDropShadow(b);
  return dsA && dsB ? lerpDropShadow(dsA, dsB, t) : null;
}
function findEmergeBounds(element) {
  let children = React4.Children.toArray(element.props.children), rectWidth = null, rectHeight = null, textY = null;
  for (let child of children)
    if (React4.isValidElement(child)) {
      if (child.type === "rect" && rectWidth === null) {
        let props = child.props;
        rectWidth = parseFloat(props.width), rectHeight = parseFloat(props.height);
      } else if (child.type === "text" && textY === null) {
        let props = child.props;
        textY = parseFloat(props.y);
      }
    }
  return rectWidth !== null && rectHeight !== null && !isNaN(rectWidth) && !isNaN(rectHeight) ? {
    rectWidth,
    rectHeight,
    textY: textY !== null && !isNaN(textY) ? textY : null
  } : null;
}
function cloneWithBounds(element, bounds) {
  let props = element.props, children = React4.Children.toArray(props.children), foundRect = !1, foundText = !1, newChildren = children.map((child) => {
    if (React4.isValidElement(child)) {
      if (!foundRect && child.type === "rect")
        return foundRect = !0, cloneElement2(child, {
          width: bounds.rectWidth,
          height: bounds.rectHeight
        });
      if (!foundText && child.type === "text" && bounds.textY !== null)
        return foundText = !0, cloneElement2(child, { y: bounds.textY });
    }
    return child;
  });
  return cloneElement2(element, { children: newChildren });
}
function createSyntheticBefore(newElement, originElement) {
  let originTransform = originElement.props.transform || "", emergeMode = newElement.props.dragologyEmergeMode;
  if (emergeMode === "clone") {
    let originBounds = findEmergeBounds(originElement), newBounds = findEmergeBounds(newElement);
    if (originBounds && newBounds) {
      let synthetic = cloneWithBounds(newElement, originBounds);
      return cloneElement2(synthetic, {
        transform: originTransform || void 0
      });
    }
    return cloneElement2(newElement, {
      transform: originTransform || void 0
    });
  }
  if (emergeMode !== "scale") {
    let originBounds = findEmergeBounds(originElement), newBounds = findEmergeBounds(newElement);
    if (originBounds && newBounds) {
      let synthetic = cloneWithBounds(newElement, originBounds);
      return cloneElement2(synthetic, {
        transform: originTransform || void 0,
        opacity: 0
      });
    }
  }
  return cloneElement2(newElement, {
    transform: originTransform + " scale(0)",
    opacity: 0
  });
}
function augmentWithEmerging(target, source, origins) {
  for (let [key, val] of source)
    if (!target.has(key)) {
      let emergeFromId = val.element.props.dragologyEmergeFrom;
      if (emergeFromId && typeof emergeFromId == "string") {
        let originLayer = origins.get(emergeFromId);
        originLayer && target.set(key, {
          element: createSyntheticBefore(val.element, originLayer.element),
          stackingPath: val.stackingPath
        });
      }
    }
}
function lerpLayered(a, b, t, unblendedFrom) {
  let augmentedA = new Map(a.byId), augmentedB = new Map(b.byId);
  augmentWithEmerging(augmentedA, b.byId, a.byId), augmentWithEmerging(augmentedB, a.byId, b.byId);
  let result = /* @__PURE__ */ new Map(), allKeys = /* @__PURE__ */ new Set([...augmentedA.keys(), ...augmentedB.keys()]);
  for (let key of allKeys) {
    let aVal = augmentedA.get(key), bVal = augmentedB.get(key);
    if (aVal && bVal)
      result.set(key, {
        element: lerpSvgx(aVal.element, bVal.element, t, unblendedFrom),
        stackingPath: (unblendedFrom === "b" ? bVal : aVal).stackingPath
      });
    else if (aVal) {
      let faded = fadeElement(aVal.element, 1 - t);
      faded && result.set(key, { element: faded, stackingPath: aVal.stackingPath });
    } else if (bVal) {
      let faded = fadeElement(bVal.element, t);
      faded && result.set(key, { element: faded, stackingPath: bVal.stackingPath });
    }
  }
  let descendents = null;
  if (a.descendents && b.descendents) {
    descendents = new Map(a.descendents);
    for (let [key, bSet] of b.descendents) {
      let existing = descendents.get(key);
      if (existing)
        for (let id of bSet) existing.add(id);
      else
        descendents.set(key, new Set(bSet));
    }
  } else
    descendents = a.descendents ?? b.descendents;
  return {
    byId: result,
    descendents
  };
}
function lerpLayeredWeighted(items, weights) {
  let entries = [...weights.entries()].filter(([, w]) => w > 1e-10).sort((a, b) => a[0] - b[0]);
  if (entries.length === 0) return items[0];
  if (entries.length === 1) return items[entries[0][0]];
  let nearestIdx = entries.reduce(
    (best, e) => e[1] > best[1] ? e : best
  )[0], acc = items[entries[0][0]], accWeight = entries[0][1];
  for (let i = 1; i < entries.length; i++) {
    let [idx, w] = entries[i], t = w / (accWeight + w);
    acc = lerpLayered(acc, items[idx], t, idx === nearestIdx ? "b" : "a"), accWeight += w;
  }
  return acc;
}

// src/utils/flexible-types.ts
function manyToArray(a) {
  let result = [];
  function helper(a2) {
    a2 == null || a2 === !1 || (isArray2(a2) ? a2.forEach(helper) : result.push(a2));
  }
  return helper(a), result;
}
function readerToValue(a, s) {
  return typeof a == "function" ? readerToValue(a(s), s) : a;
}
function manyReaderToArray(a, ...s) {
  let result = [];
  function helper(a2) {
    for (let leaf of manyToArray(a2))
      typeof leaf == "function" ? helper(leaf(...s)) : result.push(leaf);
  }
  return helper(a), result;
}

// src/ops/fixed.tsx
import { useContext as useContext4 } from "react";
import { jsx as jsx8, jsxs as jsxs6 } from "react/jsx-runtime";
function fixed(state) {
  return operator(FixedOp)(state);
}
function fixedState(spec) {
  return spec.opClass === FixedOp ? spec.args[0] : void 0;
}
var FixedOp = class extends Operator {
  constructor(ctx, state) {
    super(ctx);
    this.state = state;
    this.position = getElementPositionCheap(ctx, state);
  }
  state;
  name = "fixed";
  /** Where the dragged element is in this state (null if it's missing). */
  position;
  rendered;
  /** The rendered state, rendered on first use. */
  get outputPreview() {
    return this.rendered ??= renderStateReadOnly(this.ctx, this.state);
  }
  fuzzDropPositions() {
    return this.position ? [this.position] : [];
  }
  frame(frame) {
    return {
      preview: () => this.outputPreview,
      dropState: this.state,
      gap: this.position ? frame.pointer.dist(this.position) : 1 / 0,
      grabPos: this.position ?? void 0
    };
  }
  treeView(props) {
    return /* @__PURE__ */ jsx8(FixedTreeNode, { op: this, ...props });
  }
  overlayVis({ opacity }) {
    let pos = this.position;
    if (!this.lastFrame || !pos) return null;
    let { pointer } = this.lastFrame;
    return /* @__PURE__ */ jsxs6("g", { opacity, children: [
      /* @__PURE__ */ jsx8(
        "circle",
        {
          cx: pos.x,
          cy: pos.y,
          r: 4,
          fill: "none",
          stroke: "magenta",
          strokeWidth: 1.5
        }
      ),
      /* @__PURE__ */ jsx8(DistanceLine, { from: pos, to: pointer, distance: pointer.dist(pos) })
    ] });
  }
};
function FixedTreeNode({
  op,
  path: path2,
  active,
  color: color2
}) {
  let { tightFixed } = useContext4(StudioHackContext), ran = op.frames > 0;
  return tightFixed && ran ? /* @__PURE__ */ jsx8(OutputThumbnail, { outputPreview: op.outputPreview, active }) : /* @__PURE__ */ jsx8(Box, { label: "fixed", active, color: color2, path: path2, children: ran && /* @__PURE__ */ jsx8(OutputThumbnail, { outputPreview: op.outputPreview }) });
}

// src/ops/between.tsx
import { Fragment as Fragment4, jsx as jsx9, jsxs as jsxs7 } from "react/jsx-runtime";
function between(specs, options) {
  let resolved = manyToArray(specs).map(resolveDragSpecLike);
  return assert(resolved.length > 0, "between requires at least one state"), operator(BetweenOp)(resolved, options);
}
var BetweenOp = class extends Operator {
  constructor(ctx, specs, options = {}) {
    super(ctx);
    this.specs = specs;
    this.options = options;
    let fixedStates = specs.map((s) => fixedState(s));
    this.allFixed = fixedStates.every((s) => s !== void 0), this.allFixed ? (this.branches = [], this.renderedStates = fixedStates.map((state) => {
      assert(state !== void 0);
      let layered = renderStateReadOnly(ctx, state);
      return {
        state,
        layered,
        position: getElementPositionOrThrow(ctx, layered)
      };
    }), this.delaunay = betweenMakeDelaunay(this.renderedStates, ctx)) : this.branches = specs.map((s, i) => this.child(String(i), s));
  }
  specs;
  options;
  name = "between";
  /**
   * Whether every spec is `fixed`. If so, they're rendered once, during
   * setup, instead of running as children.
   */
  allFixed;
  branches;
  /** The rendered states (from setup if all are fixed, else the last frame). */
  renderedStates = [];
  delaunay;
  /** Where the last frame's pointer projected onto the targets' hull. */
  projection;
  /** Index → weight for each state in the last frame's interpolation. */
  weights = /* @__PURE__ */ new Map();
  /** The last frame's drop state, as an index into `renderedStates`. */
  closestIndex = -1;
  /** The last frame's preview, computed lazily. */
  preview;
  frame(frame) {
    this.allFixed || (this.renderedStates = this.branches.map((branch) => {
      let result = branch.run(frame), layered = result.preview(), position = getElementPositionOrThrow(this.ctx, layered);
      return { state: result.dropState, layered, position };
    }), this.delaunay = betweenMakeDelaunay(this.renderedStates, this.ctx));
    let renderedStates = this.renderedStates, delaunay = this.delaunay, projection = delaunay.projectOntoConvexHull(frame.pointer), interpolation = this.options.interpolation ?? "delaunay", weights;
    interpolation === "natural-neighbor" ? weights = naturalNeighborWeights(delaunay, frame, projection) : interpolation === "delaunay" ? weights = delaunayWeights(projection) : assertNever(interpolation);
    let { sharpness } = this.options;
    if (sharpness !== void 0) {
      let totalWeight = 0;
      for (let [key, weight] of weights.entries()) {
        let newWeight = Math.pow(weight, sharpness);
        weights.set(key, newWeight), totalWeight += newWeight;
      }
      for (let [key, weight] of weights.entries())
        weights.set(key, weight / totalWeight);
    }
    let previewCache, preview = () => previewCache ??= lerpLayeredWeighted(
      renderedStates.map((rs) => rs.layered),
      weights
    ), closest2 = minBy_default(
      renderedStates,
      (rs) => rs.position.dist(frame.pointer)
    );
    this.projection = projection, this.weights = weights, this.closestIndex = renderedStates.indexOf(closest2), this.preview = preview;
    let grabPos = Vec2(0);
    for (let [idx, weight] of weights.entries())
      grabPos = grabPos.add(renderedStates[idx].position.mul(weight));
    return { preview, dropState: closest2.state, gap: projection.dist, grabPos };
  }
  fuzzDropPositions() {
    return this.renderedStates.map((rs) => rs.position);
  }
  treeView(props) {
    let { path: path2, active, color: color2 } = props, { interpolation } = this.options;
    return /* @__PURE__ */ jsxs7(
      Box,
      {
        label: `between [${this.specs.length}]${interpolation ? ` (${interpolation})` : ""}`,
        active,
        color: color2,
        path: path2,
        children: [
          this.preview && /* @__PURE__ */ jsx9(OutputThumbnail, { outputPreview: this.preview() }),
          this.allFixed ? /* @__PURE__ */ jsx9(Slot, { label: "states", children: /* @__PURE__ */ jsx9(
            StateThumbnails,
            {
              renderedStates: this.renderedStates,
              closestIndex: this.closestIndex
            }
          ) }) : this.branches.map((branch) => branch.treeView(props))
        ]
      }
    );
  }
  overlayVis({ active, opacity }) {
    let { projection, delaunay, lastFrame } = this;
    if (!projection || !delaunay || !lastFrame) return null;
    let { pointer } = lastFrame, projDist = pointer.dist(projection.projectedPt);
    return /* @__PURE__ */ jsxs7("g", { children: [
      this.branches.map((branch, i) => /* @__PURE__ */ jsx9(OverlayVis, { op: branch.op, active: !1 }, `sub-${i}`)),
      /* @__PURE__ */ jsxs7("g", { opacity, children: [
        delaunay.triangles().map((tri, i) => {
          let [a, b, c] = tri;
          return /* @__PURE__ */ jsx9(
            "path",
            {
              d: path("M", a.x, a.y, "L", b.x, b.y, "L", c.x, c.y, "Z"),
              stroke: "magenta",
              strokeWidth: 1,
              fill: "magenta",
              fillOpacity: 0.05
            },
            `tri-${i}`
          );
        }),
        this.renderedStates.map((rs, i) => {
          let w = this.weights.get(i) ?? 0, maxR = 8, r = Math.sqrt(w) * maxR, isDropState = i === this.closestIndex;
          return /* @__PURE__ */ jsxs7("g", { children: [
            /* @__PURE__ */ jsx9(
              "circle",
              {
                ...rs.position.cxy(),
                r: isDropState ? maxR : 3,
                fill: "none",
                stroke: "magenta",
                strokeWidth: 1.5
              }
            ),
            active && r > 0.5 && /* @__PURE__ */ jsx9("circle", { ...rs.position.cxy(), r, fill: "magenta" })
          ] }, `pt-${i}`);
        }),
        /* @__PURE__ */ jsx9(
          "circle",
          {
            ...projection.projectedPt.cxy(),
            r: 5,
            stroke: "magenta",
            strokeWidth: 2,
            fill: "none"
          }
        ),
        /* @__PURE__ */ jsx9(
          DistanceLine,
          {
            from: pointer,
            to: projection.projectedPt,
            distance: projDist
          }
        )
      ] })
    ] });
  }
};
function betweenMakeDelaunay(renderedStates, ctx) {
  try {
    return new Delaunay2(renderedStates.map((rs) => rs.position));
  } catch (e) {
    if (e instanceof CoincidentPointsError) {
      let stateA = renderedStates[e.indexA], stateB = renderedStates[e.indexB];
      throw new ErrorWithJSX(
        "Coincident targets detected in d.between",
        /* @__PURE__ */ jsxs7(Fragment4, { children: [
          /* @__PURE__ */ jsx9("p", { style: { marginBottom: 8, fontStyle: "italic" }, children: "(Quick hint: are you reordering siblings without IDs?)" }),
          /* @__PURE__ */ jsxs7("p", { style: { marginBottom: 8 }, children: [
            "In order to use",
            " ",
            /* @__PURE__ */ jsx9("span", { style: { fontFamily: "monospace" }, children: "d.between" }),
            ", the dragged element must move to distinct locations in each rendered state."
          ] }),
          /* @__PURE__ */ jsxs7("p", { style: { marginBottom: 8 }, children: [
            "Here, we are dragging element",
            " ",
            /* @__PURE__ */ jsx9("span", { style: { fontFamily: "monospace" }, children: ctx.draggedPath }),
            ". Two states put it at the point [",
            stateA.position.str(", "),
            "]:"
          ] }),
          /* @__PURE__ */ jsx9(
            "div",
            {
              style: {
                display: "flex",
                gap: 16,
                marginBottom: 8,
                overflow: "hidden"
              },
              children: [stateA, stateB].map((rs, i) => /* @__PURE__ */ jsx9(
                CoincidentStatePreview,
                {
                  layered: rs.layered,
                  draggedPath: ctx.draggedPath,
                  state: rs.state
                },
                i
              ))
            }
          ),
          /* @__PURE__ */ jsx9("p", { style: { marginBottom: 8 }, children: "(This is just the first pair of overlaps \u2013 other states may also cause overlap.)" }),
          /* @__PURE__ */ jsx9("p", { style: { marginBottom: 8 }, children: "If this isn't caused by reordering siblings without IDs, you may have a genuinely ambiguous drag behavior: multiple states bringing the dragged element to the same location. (Or maybe you just repeated a state?)" })
        ] })
      );
    }
    throw new Error(`Failed to create Delaunay triangulation: ${e}`);
  }
}
function CoincidentStatePreview({
  layered,
  draggedPath,
  state
}) {
  let viewBounds = getLayeredBounds(layered), found = findByPathInLayered(draggedPath, layered), draggedBounds = found ? getGlobalBounds(found.element, found.accumulatedTransform) : emptyBounds, pad = 10, vb = viewBounds.empty ? { minX: 0, minY: 0, maxX: 100, maxY: 100 } : viewBounds, viewBox = `${vb.minX - pad} ${vb.minY - pad} ${vb.maxX - vb.minX + pad * 2} ${vb.maxY - vb.minY + pad * 2}`;
  return /* @__PURE__ */ jsxs7(
    "div",
    {
      style: {
        flex: "1 1 0",
        minWidth: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 8
      },
      children: [
        /* @__PURE__ */ jsxs7(
          "svg",
          {
            viewBox,
            style: {
              width: "100%",
              maxWidth: 200,
              border: "1px solid #ccc",
              borderRadius: 4,
              background: "#fff"
            },
            children: [
              drawLayered(layered),
              !draggedBounds.empty && /* @__PURE__ */ jsx9(
                "rect",
                {
                  x: draggedBounds.minX - 3,
                  y: draggedBounds.minY - 3,
                  width: draggedBounds.maxX - draggedBounds.minX + 6,
                  height: draggedBounds.maxY - draggedBounds.minY + 6,
                  fill: "none",
                  stroke: "#ff0000",
                  strokeWidth: 2,
                  rx: 2
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx9("div", { style: { fontStyle: "italic" }, children: "from" }),
        /* @__PURE__ */ jsx9(ValueView, { kind: "state", value: state })
      ]
    }
  );
}
function naturalNeighborWeights(delaunay, frame, projection) {
  let nniResult = naturalNeighborWeightsFromDelaunay(
    delaunay,
    frame.pointer,
    { projectOutside: !0 }
  );
  return nniResult ? nniResult.weights : delaunayWeights(projection);
}
function delaunayWeights(projection) {
  let weights = /* @__PURE__ */ new Map();
  if (projection.type === "vertex")
    weights.set(projection.ptIdx, 1);
  else if (projection.type === "edge")
    weights.set(projection.ptIdx0, 1 - projection.t), weights.set(projection.ptIdx1, projection.t);
  else {
    let { l0, l1, l2 } = projection.barycentric;
    weights.set(projection.ptIdx0, l0), weights.set(projection.ptIdx1, l1), weights.set(projection.ptIdx2, l2);
  }
  return weights;
}

// src/ops/changeFrame.tsx
function changeFrame(f) {
  return operator(ChangeFrameOp)(this, f);
}
var ChangeFrameOp = class extends Modifier {
  constructor(ctx, inner, f) {
    super(ctx, inner);
    this.f = f;
  }
  f;
  name = "changeFrame";
  frame(frame) {
    return this.inner.run({ ...frame, ...readerToValue(this.f, frame) });
  }
};

// src/ops/changeGap.tsx
function changeGap(f) {
  return operator(ChangeGapOp)(this, f);
}
var ChangeGapOp = class extends Modifier {
  constructor(ctx, inner, f) {
    super(ctx, inner);
    this.f = f;
  }
  f;
  name = "changeGap";
  frame(frame) {
    let result = this.inner.run(frame);
    return { ...result, gap: this.f(result.gap) };
  }
};

// src/ops/changeResult.tsx
function changeResult(f) {
  return operator(ChangeResultOp)(this, f);
}
var ChangeResultOp = class extends Modifier {
  constructor(ctx, inner, f) {
    super(ctx, inner);
    this.f = f;
  }
  f;
  name = "changeResult";
  frame(frame) {
    let result = this.inner.run(frame), changed = readerToValue(this.f, result), grabPos = "preview" in changed && !("grabPos" in changed) ? void 0 : result.grabPos;
    return { ...result, grabPos, ...changed };
  }
};

// src/ops/closest.tsx
import { jsx as jsx10, jsxs as jsxs8 } from "react/jsx-runtime";
function closest(specs, options) {
  return operator(ClosestOp)(
    manyToArray(specs).map(resolveDragSpecLike),
    options?.stickiness ?? 0,
    options?.lockPast
  );
}
var ClosestOp = class extends Operator {
  constructor(ctx, specs, stickiness, lockPast) {
    super(ctx);
    this.stickiness = stickiness;
    this.lockPast = lockPast;
    if (this.options = specs.map((s, i) => this.child(String(i), s)), lockPast !== void 0) {
      let home = getElementPositionCheap(ctx, ctx.startState);
      assert(
        home !== null,
        "closest: dragged element not found in start state"
      ), this.home = home;
    }
  }
  stickiness;
  lockPast;
  name = "closest";
  options;
  /** Memory: the last frame's choice, which `stickiness` favors. */
  lastBest = null;
  /** Memory, for `lockPast`: the option the drag is locked onto. */
  lockedIndex = null;
  /**
   * Which options ran on the last frame. (While the drag is locked
   * onto an option, the others don't run.)
   */
  ran = [];
  /** For `lockPast`: where the dragged element starts out. */
  home;
  /** Whether an option's result has carried the element past `lockPast`. */
  isPastLock(result) {
    if (this.home === void 0 || this.lockPast === void 0) return !1;
    let pos = result.grabPos ?? getElementPosition(this.ctx, result.preview());
    return pos === null || pos.dist(this.home) > this.lockPast;
  }
  frame(frame) {
    if (this.options.length === 0)
      return {
        preview: () => renderStateReadOnly(this.ctx, this.ctx.startState),
        dropState: this.ctx.startState,
        gap: 1 / 0,
        activePath: "none"
      };
    let results = [], resultAt = (i) => results[i] ??= this.options[i].run(frame);
    this.lockedIndex !== null && !this.isPastLock(resultAt(this.lockedIndex)) && (this.lockedIndex = null);
    let best = this.lockedIndex;
    return best === null && (best = minBy_default(
      range_default(this.options.length),
      (i) => resultAt(i).gap - (i === this.lastBest ? this.stickiness : 0)
    ), this.isPastLock(resultAt(best)) && (this.lockedIndex = best)), this.lastBest = best, this.ran = this.options.map((_o, i) => results[i] !== void 0), resultAt(best);
  }
  treeView(props) {
    return /* @__PURE__ */ jsx10(Box, { label: "closest", path: props.path, children: /* @__PURE__ */ jsx10(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "row",
          gap: 4,
          flexWrap: "wrap"
        },
        children: this.options.map((option, i) => /* @__PURE__ */ jsxs8(
          "div",
          {
            style: { display: "flex", flexDirection: "column", gap: 1 },
            children: [
              /* @__PURE__ */ jsx10(
                "div",
                {
                  style: {
                    fontSize: 9,
                    color: "rgb(148, 163, 184)",
                    paddingLeft: 2
                  },
                  children: i
                }
              ),
              option.treeView(props)
            ]
          },
          i
        ))
      }
    ) });
  }
  overlayVis({ active }) {
    return this.frames === 0 ? null : /* @__PURE__ */ jsx10("g", { children: this.options.map(
      (option, i) => this.ran[i] && /* @__PURE__ */ jsx10(
        OverlayVis,
        {
          op: option.op,
          active: active && i === this.lastBest
        },
        i
      )
    ) });
  }
};

// src/ops/custom.tsx
import { jsx as jsx11 } from "react/jsx-runtime";
function custom(fn) {
  return operator(CustomOp)(fn);
}
var CustomOp = class extends Operator {
  constructor(ctx, fn) {
    super(ctx);
    this.fn = fn;
    this.behavior = fn(ctx);
  }
  fn;
  name = "custom";
  behavior;
  frame(frame) {
    return this.behavior(frame);
  }
  treeView({ path: path2 }) {
    return /* @__PURE__ */ jsx11(Box, { label: "custom", path: path2, children: "not supported yet" });
  }
  overlayVis() {
    return null;
  }
};

// src/ops/dropTarget.tsx
import { jsx as jsx12, jsxs as jsxs9 } from "react/jsx-runtime";
function dropTarget(targetId, state, options) {
  return operator(DropTargetOp)(targetId, state, options?.boundsState);
}
var DropTargetOp = class extends Operator {
  constructor(ctx, targetId, state, boundsState) {
    super(ctx);
    this.targetId = targetId;
    this.state = state;
    this.boundsState = boundsState;
    this.preview = renderStateReadOnly(ctx, state);
    let targetLayer = (boundsState === void 0 ? this.preview : renderStateReadOnly(ctx, boundsState)).byId.get(targetId);
    assert(
      targetLayer !== void 0,
      `dropTarget: element with id "${targetId}" not found in rendered state`
    ), this.globalBounds = getGlobalBounds(
      targetLayer.element,
      targetLayer.element.props.transform ?? ""
    ), assert(
      !this.globalBounds.empty,
      `dropTarget: could not compute bounds for element "${targetId}"`
    );
  }
  targetId;
  state;
  boundsState;
  name = "dropTarget";
  preview;
  globalBounds;
  /** Whether the last frame's pointer was inside the target. */
  inside = !1;
  frame(frame) {
    return this.inside = pointInBounds(frame.pointer, this.globalBounds), {
      preview: () => this.preview,
      dropState: this.state,
      gap: this.inside ? 0 : 1 / 0
    };
  }
  fuzzDropPositions() {
    return this.globalBounds.empty ? [] : [boundsCenter(this.globalBounds)];
  }
  treeView({ path: path2, active, color: color2 }) {
    return /* @__PURE__ */ jsx12(
      Box,
      {
        label: `dropTarget \u2192 ${this.targetId}`,
        active,
        color: color2,
        path: path2,
        children: this.frames > 0 && /* @__PURE__ */ jsx12(
          StateThumbnails,
          {
            renderedStates: [{ layered: this.preview, position: Vec2(0) }]
          }
        )
      }
    );
  }
  overlayVis({ opacity }) {
    let bounds = this.globalBounds;
    if (!this.lastFrame || bounds.empty) return null;
    let { pointer } = this.lastFrame;
    return /* @__PURE__ */ jsxs9("g", { opacity, children: [
      /* @__PURE__ */ jsx12(
        "rect",
        {
          x: bounds.minX,
          y: bounds.minY,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY,
          fill: "magenta",
          fillOpacity: 0.15,
          stroke: "magenta",
          strokeWidth: 1.5
        }
      ),
      /* @__PURE__ */ jsx12(
        DistanceLine,
        {
          from: boundsCenter(bounds),
          to: pointer,
          distance: this.inside ? 0 : 1 / 0
        }
      )
    ] });
  }
};

// src/ops/during.tsx
import { jsx as jsx13, jsxs as jsxs10 } from "react/jsx-runtime";
function during(fn) {
  return operator(DuringOp)(this, fn);
}
var DuringOp = class extends Modifier {
  constructor(ctx, inner, duringFn) {
    super(ctx, inner);
    this.duringFn = duringFn;
  }
  duringFn;
  name = "during";
  /** The last frame's preview, of the transformed state. */
  outputPreview;
  frame(frame) {
    let result = this.inner.run(frame), transformedState = this.duringFn(result.dropState), preview = renderStateReadOnly(this.ctx, transformedState), elementPos = getElementPosition(this.ctx, preview);
    return this.outputPreview = preview, {
      ...result,
      preview: () => preview,
      dropState: transformedState,
      gap: elementPos ? frame.pointer.dist(elementPos) : 1 / 0,
      grabPos: elementPos ?? void 0
    };
  }
  treeView(props) {
    return /* @__PURE__ */ jsxs10(Box, { label: "during", path: props.path, children: [
      this.outputPreview && /* @__PURE__ */ jsx13(OutputThumbnail, { outputPreview: this.outputPreview }),
      this.inner.treeView(props)
    ] });
  }
};

// src/ops/onDrop.tsx
function onDrop(state) {
  return operator(OnDropOp)(this, state);
}
var OnDropOp = class extends Modifier {
  constructor(ctx, inner, onDropState) {
    super(ctx, inner);
    this.onDropState = onDropState;
  }
  onDropState;
  name = "onDrop";
  frame(frame) {
    let result = this.inner.run(frame);
    return {
      ...result,
      dropState: typeof this.onDropState == "function" ? this.onDropState(result.dropState) : this.onDropState
    };
  }
};

// src/ops/reactTo.tsx
import { Fragment as Fragment5, jsx as jsx14, jsxs as jsxs11 } from "react/jsx-runtime";
var ReactToMethod = class {
  /**
   * This drag behavior calls an getter on every frame. When the
   * getter's value changes, a child behavior is re-initialized with
   * the new value.
   */
  reactTo(getter, callback) {
    return operator(ReactToOp)(
      getter,
      callback
    );
  }
}, ReactToOp = class extends Operator {
  constructor(ctx, getter, callback) {
    super(ctx);
    this.getter = getter;
    this.callback = callback;
  }
  getter;
  callback;
  name = "reactTo";
  /** The getter's last value. (A fresh object at first, so it's invalidated.) */
  currentValue = {};
  changeCount = 0;
  /** The child for the current value. */
  current;
  frame(frame) {
    let value = this.getter();
    return value !== this.currentValue && (this.currentValue = value, this.changeCount++, this.current = this.child(null, this.callback(value))), this.current.run(frame);
  }
  treeView(props) {
    return /* @__PURE__ */ jsx14(Box, { label: "reactTo", path: props.path, children: this.current && /* @__PURE__ */ jsxs11(Fragment5, { children: [
      /* @__PURE__ */ jsxs11(
        "div",
        {
          style: {
            fontSize: 9,
            color: "rgb(120, 113, 108)",
            background: "rgba(0,0,0,0.04)",
            borderRadius: 3,
            padding: "2px 4px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all"
          },
          children: [
            "value: ",
            truncate(String(this.currentValue), 40),
            " \xB7 ",
            "changes: ",
            this.changeCount
          ]
        }
      ),
      this.current.treeView(props)
    ] }) });
  }
  overlayVis({ active }) {
    return this.current ? /* @__PURE__ */ jsx14(OverlayVis, { op: this.current.op, active }) : null;
  }
};

// src/paths.ts
function getAtPath(obj, path2) {
  let cur = obj;
  for (let key of path2)
    cur = cur[key];
  return cur;
}
function setAtPath(obj, path2, value) {
  let [first, ...rest] = path2;
  if (rest.length === 0) {
    if (Array.isArray(obj)) {
      let newArr = obj.slice();
      return newArr[first] = value, newArr;
    }
    return objCloneAndSet(obj, first, value);
  }
  if (Array.isArray(obj)) {
    let newArr = obj.slice();
    return newArr[first] = setAtPath(
      obj[first],
      rest,
      value
    ), newArr;
  }
  return objCloneAndSet(
    obj,
    first,
    setAtPath(obj[first], rest, value)
  );
}
function objCloneAndSet(obj, key, value) {
  let clone = Object.assign(
    Object.create(Object.getPrototypeOf(obj)),
    obj
  );
  return clone[key] = value, clone;
}

// src/ops/substate.tsx
import { jsx as jsx15 } from "react/jsx-runtime";
var SubstateMethod = class {
  /**
   * Focus on a sub-path of the state (a lens). The callback receives
   * a DragSpecBuilder for the substate type, and should return a
   * DragSpec for that substate.
   */
  substate(state, path2, fn) {
    let subState = getAtPath(state, path2), innerSpec = fn(new DragSpecBuilder(subState));
    return operator(SubstateOp)(
      state,
      path2,
      innerSpec
    );
  }
}, SubstateOp = class extends Operator {
  constructor(ctx, state, path2, innerSpec) {
    super(ctx);
    this.state = state;
    this.path = path2;
    let lensedDraggable = (props) => ctx.draggable(
      makeDraggableProps({
        state: setAtPath(state, path2, props.state),
        draggedId: props.draggedId,
        setState: props.setState,
        isTracking: props.isTracking
      })
    );
    this.inner = this.child(
      null,
      innerSpec,
      {
        ...ctx,
        draggable: lensedDraggable
      }
    );
  }
  state;
  path;
  name = "substate";
  /** Runs the substate's spec. (Its state type is really `T[path]`.) */
  inner;
  frame(frame) {
    let result = this.inner.run(frame);
    return {
      ...result,
      dropState: setAtPath(this.state, this.path, result.dropState)
    };
  }
  treeView(props) {
    return /* @__PURE__ */ jsx15(Box, { label: `substate [${this.path.join(", ")}]`, path: props.path, children: this.inner.treeView(props) });
  }
  overlayVis({ active }) {
    return /* @__PURE__ */ jsx15(OverlayVis, { op: this.inner.op, active });
  }
};

// src/utils/pipe.ts
function pipe(arg, ...fns) {
  return fns.reduce((acc, fn) => fn(acc), arg);
}

// src/renderDraggable.ts
function renderDraggableInertUnlayered(draggable, state, draggedId, isTracking) {
  return pipe(
    draggable(
      makeDraggableProps({
        state,
        draggedId,
        setState: () => {
          throw new Error("This function should not have been called");
        },
        isTracking
      })
    ),
    assignPaths
  );
}
function renderDraggableInert(draggable, state, draggedId, isTracking) {
  return layerSvg(
    renderDraggableInertUnlayered(draggable, state, draggedId, isTracking)
  );
}

// src/ops/switchToStateAndFollow.tsx
import { jsx as jsx16 } from "react/jsx-runtime";
function switchToStateAndFollow(state, draggedId, followSpec) {
  return operator(SwitchToStateAndFollowOp)(
    state,
    draggedId,
    followSpec && resolveDragSpecLike(followSpec)
  );
}
function findFollowSpec(ctx, state, draggedId, followSpec) {
  if (!followSpec && draggedId) {
    let content = renderDraggableInertUnlayered(
      ctx.draggable,
      state,
      draggedId,
      !0
    ), found = findElement(content, (el) => el.props.id === draggedId);
    assert(!!found, `switchToStateAndFollow: element "${draggedId}" not found`);
    let callback = getOnDragCallbackOnElement(found.element);
    assert(
      !!callback,
      `switchToStateAndFollow: no followSpec and no dragology on "${draggedId}"`
    ), followSpec = callback();
  }
  return assert(!!followSpec, "switchToStateAndFollow: no followSpec"), followSpec;
}
var SwitchToStateAndFollowOp = class extends Modifier {
  constructor(ctx, state, draggedId, followSpec) {
    super(ctx, findFollowSpec(ctx, state, draggedId, followSpec), {
      ...ctx,
      startState: state,
      draggedId,
      draggedPath: draggedId + "/"
    });
    this.state = state;
    this.draggedId = draggedId;
  }
  state;
  draggedId;
  name = "switchToStateAndFollow";
  frame(frame) {
    return this.inner.run(frame);
  }
  treeView(props) {
    return /* @__PURE__ */ jsx16(
      Box,
      {
        label: `switchToStateAndFollow \u2192 ${this.draggedId}`,
        color: props.color,
        path: props.path,
        children: this.inner.treeView(props)
      }
    );
  }
};

// src/math/cobyla.js
var Nlp = {
  arr: function(n) {
    return new Float64Array(n);
  },
  arr2: function(n, m) {
    for (var i = 0, a = new Array(n); i < n; )
      a[i] = this.arr(m), i++;
    return a;
  },
  arraycopy: function(x, a, iox, b, n) {
    for (var i = 0; i < n; )
      iox[i + b] = x[i + a], i++;
  },
  lastNumberOfEvaluations: 0,
  GetLastNumberOfEvaluations: function() {
    return this.lastNumberOfEvaluations;
  },
  // status Variables
  Normal: 0,
  MaxIterationsReached: 1,
  DivergingRoundingErrors: 2,
  /**
   * Minimizes the objective function F with respect to a set of inequality constraints CON,
   * and returns the optimal variable array. F and CON may be non-linear, and should preferably be smooth.
   * Calls {@link JXG.Math.Nlp#cobylb}.
   *
   * @param calcfc Interface implementation for calculating objective function and constraints.
   * @param n Number of variables.
   * @param m Number of constraints.
   * @param x On input initial values of the variables (zero-based array). On output
   * optimal values of the variables obtained in the COBYLA minimization.
   * @param rhobeg Initial size of the simplex.
   * @param rhoend Final value of the simplex.
   * @param iprint Print level, 0 <= iprint <= 3, where 0 provides no output and
   * 3 provides full output to the console.
   * @param maxfun Maximum number of function evaluations before terminating.
   * @param [testForRoundingErrors=false]
   * @returns {Number} Exit status of the COBYLA2 optimization.
   */
  FindMinimum: function(calcfc, n, m, x, rhobeg, rhoend, iprint, maxfun, testForRoundingErrors) {
    var mpp = m + 2, status, iox = this.arr(n + 1), that = this, fcalcfc;
    return this.lastNumberOfEvaluations = 0, testForRoundingErrors && console.log("Experimental feature 'testForRoundingErrors' is activated."), iox[0] = 0, this.arraycopy(x, 0, iox, 1, n), fcalcfc = function(n2, m2, thisx, con) {
      var ix = that.arr(n2), ocon, f;
      return that.lastNumberOfEvaluations = that.lastNumberOfEvaluations + 1, that.arraycopy(thisx, 1, ix, 0, n2), ocon = that.arr(m2), f = calcfc(n2, m2, ix, ocon), that.arraycopy(ocon, 0, con, 1, m2), f;
    }, status = this.cobylb(fcalcfc, n, m, mpp, iox, rhobeg, rhoend, iprint, maxfun, testForRoundingErrors), this.arraycopy(iox, 1, x, 0, n), status;
  },
  //    private static CobylaExitStatus cobylb(Calcfc calcfc, int n, int m, int mpp, double[] x,
  //      double rhobeg, double rhoend, int iprint, int maxfun)
  /**
   * JavaScript implementation of the non-linear optimization method COBYLA.
   * @param {Function} calcfc
   * @param {Number} n
   * @param {Number} m
   * @param {Number} mpp
   * @param {Number} x
   * @param {Number} rhobeg
   * @param {Number} rhoend
   * @param {Number} iprint
   * @param {Number} maxfun
   * @param {Boolean} [testForRoundingErrors=false]
   * @returns {Number} Exit status of the COBYLA2 optimization
   */
  cobylb: function(calcfc, n, m, mpp, x, rhobeg, rhoend, iprint, maxfun, testForRoundingErrors) {
    var status = -1, alpha = 0.25, beta = 2.1, gamma = 0.5, delta = 1.1, f = 0, resmax = 0, total, np = n + 1, mp = m + 1, rho = rhobeg, parmu = 0, iflag = !1, ifull = !1, parsig = 0, prerec = 0, prerem = 0, con = this.arr(1 + mpp), sim = this.arr2(1 + n, 1 + np), simi = this.arr2(1 + n, 1 + n), datmat = this.arr2(1 + mpp, 1 + np), a = this.arr2(1 + n, 1 + mp), vsig = this.arr(1 + n), veta = this.arr(1 + n), sigbar = this.arr(1 + n), dx = this.arr(1 + n), w = this.arr(1 + n), i, j, k, l, temp, tempa, nfvals, jdrop, ibrnch, skipVertexIdent, phimin, nbest, error, pareta, wsig, weta, cvmaxp, cvmaxm, dxsign, resnew, barmu, phi, vmold, vmnew, trured, ratio, edgmax, cmin, cmax, denom, endless = !0;
    for (iprint >= 2 && console.log("The initial value of RHO is " + rho + " and PARMU is set to zero."), nfvals = 0, temp = 1 / rho, i = 1; i <= n; ++i)
      sim[i][np] = x[i], sim[i][i] = rho, simi[i][i] = temp;
    jdrop = np, ibrnch = !1;
    L_40: do {
      if (nfvals >= maxfun && nfvals > 0) {
        status = this.MaxIterationsReached;
        break L_40;
      }
      for (++nfvals, f = calcfc(n, m, x, con), resmax = 0, k = 1; k <= m; ++k)
        resmax = Math.max(resmax, -con[k]);
      if ((nfvals === iprint - 1 || iprint === 3) && this.PrintIterationResult(nfvals, f, resmax, x, n, iprint), con[mp] = f, con[mpp] = resmax, skipVertexIdent = !0, !ibrnch) {
        for (skipVertexIdent = !1, i = 1; i <= mpp; ++i)
          datmat[i][jdrop] = con[i];
        if (nfvals <= np) {
          if (jdrop <= n)
            if (datmat[mp][np] <= f)
              x[jdrop] = sim[jdrop][np];
            else {
              for (sim[jdrop][np] = x[jdrop], k = 1; k <= mpp; ++k)
                datmat[k][jdrop] = datmat[k][np], datmat[k][np] = con[k];
              for (k = 1; k <= jdrop; ++k) {
                for (sim[jdrop][k] = -rho, temp = 0, i = k; i <= jdrop; ++i)
                  temp -= simi[i][k];
                simi[jdrop][k] = temp;
              }
            }
          if (nfvals <= n) {
            jdrop = nfvals, x[jdrop] += rho;
            continue L_40;
          }
        }
        ibrnch = !0;
      }
      L_140: do {
        L_550: do {
          if (!skipVertexIdent) {
            for (phimin = datmat[mp][np] + parmu * datmat[mpp][np], nbest = np, j = 1; j <= n; ++j)
              temp = datmat[mp][j] + parmu * datmat[mpp][j], temp < phimin ? (nbest = j, phimin = temp) : temp === phimin && parmu === 0 && datmat[mpp][j] < datmat[mpp][nbest] && (nbest = j);
            if (nbest <= n) {
              for (i = 1; i <= mpp; ++i)
                temp = datmat[i][np], datmat[i][np] = datmat[i][nbest], datmat[i][nbest] = temp;
              for (i = 1; i <= n; ++i) {
                for (temp = sim[i][nbest], sim[i][nbest] = 0, sim[i][np] += temp, tempa = 0, k = 1; k <= n; ++k)
                  sim[i][k] -= temp, tempa -= simi[k][i];
                simi[nbest][i] = tempa;
              }
            }
            if (error = 0, testForRoundingErrors)
              for (i = 1; i <= n; ++i)
                for (j = 1; j <= n; ++j)
                  temp = this.DOT_PRODUCT_ROW_COL(simi, i, sim, j, 1, n) - (i === j ? 1 : 0), error = Math.max(error, Math.abs(temp));
            if (error > 0.1) {
              status = this.DivergingRoundingErrors;
              break L_40;
            }
            for (k = 1; k <= mp; ++k) {
              for (con[k] = -datmat[k][np], j = 1; j <= n; ++j)
                w[j] = datmat[k][j] + con[k];
              for (i = 1; i <= n; ++i)
                a[i][k] = (k === mp ? -1 : 1) * this.DOT_PRODUCT_ROW_COL(w, -1, simi, i, 1, n);
            }
            for (iflag = !0, parsig = alpha * rho, pareta = beta * rho, j = 1; j <= n; ++j) {
              for (wsig = 0, weta = 0, k = 1; k <= n; ++k)
                wsig += simi[j][k] * simi[j][k], weta += sim[k][j] * sim[k][j];
              vsig[j] = 1 / Math.sqrt(wsig), veta[j] = Math.sqrt(weta), (vsig[j] < parsig || veta[j] > pareta) && (iflag = !1);
            }
            if (!ibrnch && !iflag) {
              for (jdrop = 0, temp = pareta, j = 1; j <= n; ++j)
                veta[j] > temp && (jdrop = j, temp = veta[j]);
              if (jdrop === 0)
                for (j = 1; j <= n; ++j)
                  vsig[j] < temp && (jdrop = j, temp = vsig[j]);
              for (temp = gamma * rho * vsig[jdrop], k = 1; k <= n; ++k)
                dx[k] = temp * simi[jdrop][k];
              for (cvmaxp = 0, cvmaxm = 0, total = 0, k = 1; k <= mp; ++k)
                total = this.DOT_PRODUCT_ROW_COL(dx, -1, a, k, 1, n), k < mp && (temp = datmat[k][np], cvmaxp = Math.max(cvmaxp, -total - temp), cvmaxm = Math.max(cvmaxm, total - temp));
              for (dxsign = parmu * (cvmaxp - cvmaxm) > 2 * total ? -1 : 1, temp = 0, i = 1; i <= n; ++i)
                dx[i] = dxsign * dx[i], sim[i][jdrop] = dx[i], temp += simi[jdrop][i] * dx[i];
              for (k = 1; k <= n; ++k)
                simi[jdrop][k] /= temp;
              for (j = 1; j <= n; ++j) {
                if (j !== jdrop)
                  for (temp = this.DOT_PRODUCT_ROW_COL(simi, j, dx, -1, 1, n), k = 1; k <= n; ++k)
                    simi[j][k] -= temp * simi[jdrop][k];
                x[j] = sim[j][np] + dx[j];
              }
              continue L_40;
            }
            if (ifull = this.trstlp(n, m, a, con, rho, dx), !ifull) {
              for (temp = 0, k = 1; k <= n; ++k)
                temp += dx[k] * dx[k];
              if (temp < 0.25 * rho * rho) {
                ibrnch = !0;
                break L_550;
              }
            }
            for (total = 0, resnew = 0, con[mp] = 0, k = 1; k <= mp; ++k)
              total = con[k] - this.DOT_PRODUCT_ROW_COL(dx, -1, a, k, 1, n), k < mp && (resnew = Math.max(resnew, total));
            if (prerec = datmat[mpp][np] - resnew, barmu = prerec > 0 ? total / prerec : 0, parmu < 1.5 * barmu) {
              for (parmu = 2 * barmu, iprint >= 2 && console.log("Increase in PARMU to " + parmu), phi = datmat[mp][np] + parmu * datmat[mpp][np], j = 1; j <= n; ++j)
                if (temp = datmat[mp][j] + parmu * datmat[mpp][j], temp < phi || temp === phi && parmu === 0 && datmat[mpp][j] < datmat[mpp][np])
                  continue L_140;
            }
            for (prerem = parmu * prerec - total, k = 1; k <= n; ++k)
              x[k] = sim[k][np] + dx[k];
            ibrnch = !0;
            continue L_40;
          }
          for (skipVertexIdent = !1, vmold = datmat[mp][np] + parmu * datmat[mpp][np], vmnew = f + parmu * resmax, trured = vmold - vmnew, parmu === 0 && f === datmat[mp][np] && (prerem = prerec, trured = datmat[mpp][np] - resmax), ratio = trured <= 0 ? 1 : 0, jdrop = 0, j = 1; j <= n; ++j)
            temp = Math.abs(this.DOT_PRODUCT_ROW_COL(simi, j, dx, -1, 1, n)), temp > ratio && (jdrop = j, ratio = temp), sigbar[j] = temp * vsig[j];
          for (edgmax = delta * rho, l = 0, j = 1; j <= n; ++j)
            if (sigbar[j] >= parsig || sigbar[j] >= vsig[j]) {
              if (temp = veta[j], trured > 0) {
                for (temp = 0, k = 1; k <= n; ++k)
                  temp += Math.pow(dx[k] - sim[k][j], 2);
                temp = Math.sqrt(temp);
              }
              temp > edgmax && (l = j, edgmax = temp);
            }
          if (l > 0 && (jdrop = l), jdrop !== 0) {
            for (temp = 0, i = 1; i <= n; ++i)
              sim[i][jdrop] = dx[i], temp += simi[jdrop][i] * dx[i];
            for (k = 1; k <= n; ++k)
              simi[jdrop][k] /= temp;
            for (j = 1; j <= n; ++j)
              if (j !== jdrop)
                for (temp = this.DOT_PRODUCT_ROW_COL(simi, j, dx, -1, 1, n), k = 1; k <= n; ++k)
                  simi[j][k] -= temp * simi[jdrop][k];
            for (k = 1; k <= mpp; ++k)
              datmat[k][jdrop] = con[k];
            if (trured > 0 && trured >= 0.1 * prerem)
              continue L_140;
          }
        } while (!endless);
        if (!iflag) {
          ibrnch = !1;
          continue L_140;
        }
        if (rho <= rhoend) {
          status = this.Normal;
          break L_40;
        }
        if (cmin = 0, cmax = 0, rho *= 0.5, rho <= 1.5 * rhoend && (rho = rhoend), parmu > 0) {
          for (denom = 0, k = 1; k <= mp; ++k) {
            for (cmin = datmat[k][np], cmax = cmin, i = 1; i <= n; ++i)
              cmin = Math.min(cmin, datmat[k][i]), cmax = Math.max(cmax, datmat[k][i]);
            k <= m && cmin < 0.5 * cmax && (temp = Math.max(cmax, 0) - cmin, denom = denom <= 0 ? temp : Math.min(denom, temp));
          }
          denom === 0 ? parmu = 0 : cmax - cmin < parmu * denom && (parmu = (cmax - cmin) / denom);
        }
        iprint >= 2 && console.log("Reduction in RHO to " + rho + "  and PARMU = " + parmu), iprint === 2 && this.PrintIterationResult(
          nfvals,
          datmat[mp][np],
          datmat[mpp][np],
          this.COL(sim, np),
          n,
          iprint
        );
      } while (endless);
    } while (endless);
    switch (status) {
      case this.Normal:
        if (iprint >= 1 && console.log("%nNormal return from subroutine COBYLA%n"), ifull)
          return iprint >= 1 && this.PrintIterationResult(nfvals, f, resmax, x, n, iprint), status;
        break;
      case this.MaxIterationsReached:
        iprint >= 1 && console.log(
          "%nReturn from subroutine COBYLA because the MAXFUN limit has been reached.%n"
        );
        break;
      case this.DivergingRoundingErrors:
        iprint >= 1 && console.log(
          "%nReturn from subroutine COBYLA because rounding errors are becoming damaging.%n"
        );
        break;
    }
    for (k = 1; k <= n; ++k)
      x[k] = sim[k][np];
    return f = datmat[mp][np], resmax = datmat[mpp][np], iprint >= 1 && this.PrintIterationResult(nfvals, f, resmax, x, n, iprint), status;
  },
  trstlp: function(n, m, a, b, rho, dx) {
    var temp = 0, nactx = 0, resold = 0, z = this.arr2(1 + n, 1 + n), zdota = this.arr(2 + m), vmultc = this.arr(2 + m), sdirn = this.arr(1 + n), dxnew = this.arr(1 + n), vmultd = this.arr(2 + m), iact = this.arr(2 + m), mcon = m, nact = 0, icon, resmax, i, k, first, optold, icount, step, stpful, optnew, ratio, isave, vsave, total, kp, kk, sp, alpha, beta, tot, spabs, acca, accb, zdotv, zdvabs, kw, dd, ss, sd, zdotw, zdwabs, kl, sumabs, tempa, endless = !0;
    for (i = 1; i <= n; ++i)
      z[i][i] = 1, dx[i] = 0;
    if (icon = 0, resmax = 0, m >= 1) {
      for (k = 1; k <= m; ++k)
        b[k] > resmax && (resmax = b[k], icon = k);
      for (k = 1; k <= m; ++k)
        iact[k] = k, vmultc[k] = resmax - b[k];
    }
    first = !0;
    do
      L_60: do {
        (!first || first && resmax === 0) && (mcon = m + 1, icon = mcon, iact[mcon] = mcon, vmultc[mcon] = 0), first = !1, optold = 0, icount = 0, step = 0, stpful = 0;
        L_70: do {
          if (optnew = mcon === m ? resmax : -this.DOT_PRODUCT_ROW_COL(dx, -1, a, mcon, 1, n), icount === 0 || optnew < optold ? (optold = optnew, nactx = nact, icount = 3) : nact > nactx ? (nactx = nact, icount = 3) : --icount, icount === 0)
            break L_60;
          if (ratio = 0, icon <= nact) {
            if (icon < nact) {
              isave = iact[icon], vsave = vmultc[icon], k = icon;
              do {
                for (kp = k + 1, kk = iact[kp], sp = this.DOT_PRODUCT(
                  this.PART(this.COL(z, k), 1, n),
                  this.PART(this.COL(a, kk), 1, n)
                ), temp = Math.hypot(sp, zdota[kp]), alpha = zdota[kp] / temp, beta = sp / temp, zdota[kp] = alpha * zdota[k], zdota[k] = temp, i = 1; i <= n; ++i)
                  temp = alpha * z[i][kp] + beta * z[i][k], z[i][kp] = alpha * z[i][k] - beta * z[i][kp], z[i][k] = temp;
                iact[k] = kk, vmultc[k] = vmultc[kp], k = kp;
              } while (k < nact);
              iact[k] = isave, vmultc[k] = vsave;
            }
            if (--nact, mcon > m)
              for (temp = 1 / zdota[nact], k = 1; k <= n; ++k)
                sdirn[k] = temp * z[k][nact];
            else
              for (temp = this.DOT_PRODUCT_ROW_COL(sdirn, -1, z, nact + 1, 1, n), k = 1; k <= n; ++k)
                sdirn[k] -= temp * z[k][nact + 1];
          } else {
            for (kk = iact[icon], k = 1; k <= n; ++k)
              dxnew[k] = a[k][kk];
            for (tot = 0, k = n; k > nact; ) {
              for (sp = 0, spabs = 0, i = 1; i <= n; ++i)
                temp = z[i][k] * dxnew[i], sp += temp, spabs += Math.abs(temp);
              if (acca = spabs + 0.1 * Math.abs(sp), accb = spabs + 0.2 * Math.abs(sp), (spabs >= acca || acca >= accb) && (sp = 0), tot === 0)
                tot = sp;
              else
                for (kp = k + 1, temp = Math.hypot(sp, tot), alpha = sp / temp, beta = tot / temp, tot = temp, i = 1; i <= n; ++i)
                  temp = alpha * z[i][k] + beta * z[i][kp], z[i][kp] = alpha * z[i][kp] - beta * z[i][k], z[i][k] = temp;
              --k;
            }
            if (tot === 0) {
              ratio = -1, k = nact;
              do {
                for (zdotv = 0, zdvabs = 0, i = 1; i <= n; ++i)
                  temp = z[i][k] * dxnew[i], zdotv += temp, zdvabs += Math.abs(temp);
                if (acca = zdvabs + 0.1 * Math.abs(zdotv), accb = zdvabs + 0.2 * Math.abs(zdotv), zdvabs < acca && acca < accb) {
                  if (temp = zdotv / zdota[k], temp > 0 && iact[k] <= m && (tempa = vmultc[k] / temp, (ratio < 0 || tempa < ratio) && (ratio = tempa)), k >= 2)
                    for (kw = iact[k], i = 1; i <= n; ++i)
                      dxnew[i] -= temp * a[i][kw];
                  vmultd[k] = temp;
                } else
                  vmultd[k] = 0;
              } while (--k > 0);
              if (ratio < 0)
                break L_60;
              for (k = 1; k <= nact; ++k)
                vmultc[k] = Math.max(0, vmultc[k] - ratio * vmultd[k]);
              if (icon < nact) {
                isave = iact[icon], vsave = vmultc[icon], k = icon;
                do {
                  for (kp = k + 1, kw = iact[kp], sp = this.DOT_PRODUCT(
                    this.PART(this.COL(z, k), 1, n),
                    this.PART(this.COL(a, kw), 1, n)
                  ), temp = Math.hypot(sp, zdota[kp]), alpha = zdota[kp] / temp, beta = sp / temp, zdota[kp] = alpha * zdota[k], zdota[k] = temp, i = 1; i <= n; ++i)
                    temp = alpha * z[i][kp] + beta * z[i][k], z[i][kp] = alpha * z[i][k] - beta * z[i][kp], z[i][k] = temp;
                  iact[k] = kw, vmultc[k] = vmultc[kp], k = kp;
                } while (k < nact);
                iact[k] = isave, vmultc[k] = vsave;
              }
              if (temp = this.DOT_PRODUCT(
                this.PART(this.COL(z, nact), 1, n),
                this.PART(this.COL(a, kk), 1, n)
              ), temp === 0)
                break L_60;
              zdota[nact] = temp, vmultc[icon] = 0, vmultc[nact] = ratio;
            } else
              ++nact, zdota[nact] = tot, vmultc[icon] = vmultc[nact], vmultc[nact] = 0;
            if (iact[icon] = iact[nact], iact[nact] = kk, mcon > m && kk !== mcon) {
              for (k = nact - 1, sp = this.DOT_PRODUCT(
                this.PART(this.COL(z, k), 1, n),
                this.PART(this.COL(a, kk), 1, n)
              ), temp = Math.hypot(sp, zdota[nact]), alpha = zdota[nact] / temp, beta = sp / temp, zdota[nact] = alpha * zdota[k], zdota[k] = temp, i = 1; i <= n; ++i)
                temp = alpha * z[i][nact] + beta * z[i][k], z[i][nact] = alpha * z[i][k] - beta * z[i][nact], z[i][k] = temp;
              iact[nact] = iact[k], iact[k] = kk, temp = vmultc[k], vmultc[k] = vmultc[nact], vmultc[nact] = temp;
            }
            if (mcon > m)
              for (temp = 1 / zdota[nact], k = 1; k <= n; ++k)
                sdirn[k] = temp * z[k][nact];
            else
              for (kk = iact[nact], temp = (this.DOT_PRODUCT_ROW_COL(sdirn, -1, a, kk, 1, n) - 1) / zdota[nact], k = 1; k <= n; ++k)
                sdirn[k] -= temp * z[k][nact];
          }
          for (dd = rho * rho, sd = 0, ss = 0, i = 1; i <= n; ++i)
            Math.abs(dx[i]) >= 1e-6 * rho && (dd -= dx[i] * dx[i]), sd += dx[i] * sdirn[i], ss += sdirn[i] * sdirn[i];
          if (dd <= 0)
            break L_60;
          if (temp = Math.sqrt(ss * dd), Math.abs(sd) >= 1e-6 * temp && (temp = Math.sqrt(ss * dd + sd * sd)), stpful = dd / (temp + sd), step = stpful, mcon === m) {
            if (acca = step + 0.1 * resmax, accb = step + 0.2 * resmax, step >= acca || acca >= accb)
              break L_70;
            step = Math.min(step, resmax);
          }
          for (k = 1; k <= n; ++k)
            dxnew[k] = dx[k] + step * sdirn[k];
          if (mcon === m)
            for (resold = resmax, resmax = 0, k = 1; k <= nact; ++k)
              kk = iact[k], temp = b[kk] - this.DOT_PRODUCT_ROW_COL(dxnew, -1, a, kk, 1, n), resmax = Math.max(resmax, temp);
          k = nact;
          do {
            for (zdotw = 0, zdwabs = 0, i = 1; i <= n; ++i)
              temp = z[i][k] * dxnew[i], zdotw += temp, zdwabs += Math.abs(temp);
            if (acca = zdwabs + 0.1 * Math.abs(zdotw), accb = zdwabs + 0.2 * Math.abs(zdotw), (zdwabs >= acca || acca >= accb) && (zdotw = 0), vmultd[k] = zdotw / zdota[k], k >= 2)
              for (kk = iact[k], i = 1; i <= n; ++i)
                dxnew[i] -= vmultd[k] * a[i][kk];
          } while (k-- >= 2);
          for (mcon > m && (vmultd[nact] = Math.max(0, vmultd[nact])), k = 1; k <= n; ++k)
            dxnew[k] = dx[k] + step * sdirn[k];
          if (mcon > nact)
            for (kl = nact + 1, k = kl; k <= mcon; ++k) {
              for (kk = iact[k], total = resmax - b[kk], sumabs = resmax + Math.abs(b[kk]), i = 1; i <= n; ++i)
                temp = a[i][kk] * dxnew[i], total += temp, sumabs += Math.abs(temp);
              acca = sumabs + 0.1 * Math.abs(total), accb = sumabs + 0.2 * Math.abs(total), (sumabs >= acca || acca >= accb) && (total = 0), vmultd[k] = total;
            }
          for (ratio = 1, icon = 0, k = 1; k <= mcon; ++k)
            vmultd[k] < 0 && (temp = vmultc[k] / (vmultc[k] - vmultd[k]), temp < ratio && (ratio = temp, icon = k));
          for (temp = 1 - ratio, k = 1; k <= n; ++k)
            dx[k] = temp * dx[k] + ratio * dxnew[k];
          for (k = 1; k <= mcon; ++k)
            vmultc[k] = Math.max(0, temp * vmultc[k] + ratio * vmultd[k]);
          mcon === m && (resmax = resold + ratio * (resmax - resold));
        } while (icon > 0);
        if (step === stpful)
          return !0;
      } while (endless);
    while (mcon === m);
    return !1;
  },
  PrintIterationResult: function(nfvals, f, resmax, x, n, iprint) {
    iprint > 1 && console.log("NFVALS = " + nfvals + "  F = " + f + "  MAXCV = " + resmax), iprint > 1 && console.log("X = " + this.PART(x, 1, n));
  },
  ROW: function(src, rowidx) {
    return src[rowidx].slice();
  },
  COL: function(src, colidx) {
    var row, rows = src.length, dest = [];
    for (row = 0; row < rows; ++row)
      dest[row] = src[row][colidx];
    return dest;
  },
  PART: function(src, from, to) {
    return src.slice(from, to + 1);
  },
  FORMAT: function(x) {
    return x.join(",");
  },
  DOT_PRODUCT: function(lhs, rhs) {
    var i, sum2 = 0, len = lhs.length;
    for (i = 0; i < len; ++i)
      sum2 += lhs[i] * rhs[i];
    return sum2;
  },
  DOT_PRODUCT_ROW_COL: function(lhs, row, rhs, col, start, end) {
    var i, sum2 = 0;
    if (row === -1)
      for (i = start; i <= end; ++i)
        sum2 += lhs[i] * rhs[i][col];
    else if (col === -1)
      for (i = start; i <= end; ++i)
        sum2 += lhs[row][i] * rhs[i];
    else
      for (i = start; i <= end; ++i)
        sum2 += lhs[row][i] * rhs[i][col];
    return sum2;
  }
};
function FindMinimum(calcfc, n, m, x, rhobeg, rhoend, iprint, maxfun) {
  return Nlp.FindMinimum(calcfc, n, m, x, rhobeg, rhoend, iprint, maxfun);
}

// src/math/optimization.ts
var DistanceMinimizer = class {
  curParams;
  numConstraints;
  scales;
  /**
   * For "vary vis": All parameter sets explored during the last call
   * to `minimize()`.
   */
  exploredValues = [];
  /**
   * For "vary vis": Positions corresponding to each explored
   * parameter set.
   */
  exploredPositions = [];
  constructor(initialParams, numConstraints) {
    this.curParams = initialParams.slice(), this.numConstraints = numConstraints;
  }
  get params() {
    return this.curParams;
  }
  /**
   * Estimate per-parameter scaling: how many pixels of element movement
   * does a unit change in each parameter produce? Used to rescale the
   * parameter space so COBYLA's uniform rhobeg works for all dimensions.
   */
  estimateScales(paramsToPoint, baseParams) {
    let n = baseParams.length, basePos = paramsToPoint(baseParams), eps = 1e-3, scales = [];
    for (let i = 0; i < n; i++) {
      let perturbed = baseParams.slice();
      perturbed[i] += eps;
      let sensitivity = paramsToPoint(perturbed).dist(basePos) / eps;
      scales[i] = Math.max(sensitivity, 0.01);
    }
    return scales;
  }
  minimize(target, paramsToPoint, options) {
    let n = this.curParams.length;
    this.scales || (this.scales = this.estimateScales(paramsToPoint, this.curParams));
    let scales = this.scales, toScaled = (params) => params.map((v2, i) => v2 * scales[i]), fromScaled = (scaled) => scaled.map((v2, i) => v2 / scales[i]), sx = toScaled(this.curParams);
    sx.every((v2) => v2 === 0) && (sx[0] = 1e-4);
    let rhoend = 1e-3, rhobeg = Math.max(1, paramsToPoint(fromScaled(sx)).dist(target)), constraints = options?.constraints;
    return this.exploredValues = [], this.exploredPositions = [], FindMinimum(
      (_n, _m, sxArr, con) => {
        let scaledParams = [];
        for (let i = 0; i < n; i++) scaledParams[i] = sxArr[i];
        let params = fromScaled(scaledParams);
        this.exploredValues.push(params.slice());
        let point = paramsToPoint(params);
        this.exploredPositions.push(point);
        let obj = point.dist2(target);
        if (constraints) {
          let gs = constraints(params);
          for (let k = 0; k < gs.length; k++)
            con[k] = -gs[k];
        }
        return obj;
      },
      n,
      this.numConstraints,
      sx,
      rhobeg,
      rhoend,
      0,
      // iprint: silent
      200
      // maxfun
    ), this.curParams = fromScaled(sx), this.curParams;
  }
};
function lessThan(a, b) {
  return a - b;
}
function moreThan(a, b) {
  return b - a;
}
function inOrder(nums) {
  return adjPairs(manyToArray(nums)).map(([a, b]) => lessThan(a, b));
}
function and(...constraints) {
  return constraints;
}

// src/ops/vary.tsx
import { jsx as jsx17, jsxs as jsxs12 } from "react/jsx-runtime";
var VaryMethod = class {
  /**
   * This drag behavior allows you to vary numbers in a state
   * continuously by dragging. Provide a starting state and paths to
   * the parameters you want to vary. An optional final parameter can
   * configure constraints.
   *
   * Note: `vary` starts running immediately – the values of
   * controlled parameters provided in the initial state will be used
   * to initialize numerical optimization, but won't ever be shown
   * directly. You can usually feel free to set them to an arbitrary
   * value.
   */
  vary(state, paramPaths, options) {
    let paths = manyToArray(paramPaths).map(resolveVaryPath), stateFromParams = (params) => {
      let s = state;
      for (let i = 0; i < paths.length; i++)
        s = setAtPath(s, paths[i], params[i]);
      return s;
    };
    return operator(VaryOp)(
      paths.map((path2) => getAtPath(state, path2)),
      stateFromParams,
      options ?? {},
      paths
    );
  }
};
function varyFunc(initParams, stateFromParams, options) {
  return operator(VaryOp)(
    initParams,
    stateFromParams,
    options ?? {},
    void 0
  );
}
var VARY_VIS_DURATION = 0.05, VARY_VIS_FRACTION = 0.3, VaryOp = class extends Operator {
  constructor(ctx, initParams, stateFromParams, options, paramPaths) {
    super(ctx);
    this.initParams = initParams;
    this.stateFromParams = stateFromParams;
    this.options = options;
    this.paramPaths = paramPaths;
    let { constraint, pin } = options, initialState = stateFromParams(initParams), pinTargets = pin ? manyReaderToArray(pin, initialState) : void 0, constraintWithPin = pin ? [
      constraint,
      (s) => manyReaderToArray(pin, s).map((v2, i) => [
        v2 - pinTargets[i],
        pinTargets[i] - v2
      ])
    ] : constraint, numConstraints = constraintWithPin ? manyReaderToArray(constraintWithPin, initialState).length : 0;
    this.minimizer = new DistanceMinimizer(initParams, numConstraints), this.constraintsFn = constraintWithPin ? (params) => manyReaderToArray(constraintWithPin, stateFromParams(params)) : void 0;
  }
  initParams;
  stateFromParams;
  options;
  paramPaths;
  name = "vary";
  minimizer;
  constraintsFn;
  /** The last frame's state, as rendered, and where the element ended up. */
  rendered;
  /** The last frame's parameters. */
  currentParams = [];
  /** Where the optimizer tried, on the last frame (with the vary visualizer on). */
  exploredPositions;
  varyVisLastSwitch = performance.now() / 1e3;
  varyVisSampledParams = null;
  frame(frame) {
    let { ctx, minimizer } = this, getElementPos = (params) => {
      let candidateState = this.stateFromParams(params);
      return getElementPositionCheap(ctx, candidateState) ?? Vec2(1 / 0, 1 / 0);
    };
    minimizer.minimize(frame.pointer, getElementPos, {
      constraints: this.constraintsFn
    });
    let resultParams = minimizer.params;
    if (ctx.debug.varyVisualizer && minimizer.exploredValues.length > 0) {
      let now = performance.now() / 1e3;
      if (now - this.varyVisLastSwitch >= VARY_VIS_DURATION) {
        this.varyVisLastSwitch = now;
        let sampleIdx = Math.floor(
          Math.random() * minimizer.exploredValues.length * VARY_VIS_FRACTION
        );
        this.varyVisSampledParams = minimizer.exploredValues[sampleIdx];
      }
      resultParams = this.varyVisSampledParams ?? minimizer.exploredValues[0] ?? minimizer.params;
    }
    let newState = this.stateFromParams(resultParams), previewLayered = renderStateReadOnly(ctx, newState), achievedPos = getElementPositionOrThrow(ctx, previewLayered), gap = achievedPos.dist(frame.pointer);
    if (ctx.debug.varyVisualizer) {
      let ghosted = minimizer.exploredValues.map(
        (params) => renderStateReadOnly(ctx, this.stateFromParams(params))
      );
      previewLayered = layeredMerge(
        previewLayered,
        layerSvg(
          /* @__PURE__ */ jsx17("g", { id: "vary-cloud", dragologyZIndex: "/-100", dragologyOpaque: !0, children: ghosted.map((g, i) => /* @__PURE__ */ jsx17("g", { opacity: 0.15, children: drawLayered(g) }, `explored-${i}`)) })
        )
      );
    }
    return this.rendered = { layered: previewLayered, position: achievedPos }, this.currentParams = resultParams.slice(), this.exploredPositions = ctx.debug.varyVisualizer ? minimizer.exploredPositions.slice() : void 0, {
      preview: () => previewLayered,
      dropState: newState,
      gap,
      grabPos: achievedPos
    };
  }
  fuzzDropPositions() {
    return this.rendered ? [this.rendered.position] : [];
  }
  treeView({ path: path2, active, color: color2 }) {
    let label = this.paramPaths ? `vary [${this.paramPaths.map((p) => p.join(".")).join(", ")}]` : `varyFunc [${this.initParams.length} params]`, constraintSrc = this.options.constraint ? truncate(this.options.constraint.toString(), 60) : null;
    return /* @__PURE__ */ jsxs12(Box, { label, active, color: color2, path: path2, children: [
      constraintSrc && /* @__PURE__ */ jsxs12(
        "div",
        {
          style: {
            fontSize: 9,
            color: "rgb(120, 113, 108)",
            background: "rgba(0,0,0,0.04)",
            borderRadius: 3,
            padding: "2px 4px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all"
          },
          children: [
            "constraint: ",
            constraintSrc
          ]
        }
      ),
      this.rendered && /* @__PURE__ */ jsx17(StateThumbnails, { renderedStates: [this.rendered] })
    ] });
  }
  overlayVis({ opacity }) {
    if (!this.rendered || !this.lastFrame) return null;
    let { pointer } = this.lastFrame, pos = this.rendered.position, distance = pointer.dist(pos);
    return /* @__PURE__ */ jsxs12("g", { opacity, children: [
      this.exploredPositions?.map((ep, i) => /* @__PURE__ */ jsx17(
        "line",
        {
          ...ep.xy1(),
          ...pointer.xy2(),
          stroke: "magenta",
          strokeWidth: 0.5,
          opacity: 0.5
        },
        i
      )),
      this.exploredPositions?.map((ep, i) => /* @__PURE__ */ jsx17(
        "circle",
        {
          ...ep.cxy(),
          r: 2,
          fill: "magenta",
          opacity: 0.5
        },
        `c${i}`
      )),
      /* @__PURE__ */ jsx17("circle", { ...pos.cxy(), r: 5, fill: "magenta" }),
      /* @__PURE__ */ jsx17(DistanceLine, { from: pos, to: pointer, distance })
    ] });
  }
};

// src/ops/whenFar.tsx
import { jsx as jsx18, jsxs as jsxs13 } from "react/jsx-runtime";
function whenFar(background, opts = {}) {
  let gap = opts.gap ?? 50, gapIn = opts.gapIn ?? gap, gapOut = opts.gapOut ?? gap;
  return assert(
    gapIn <= gapOut,
    `whenFar: gapIn (${gapIn}) must be <= gapOut (${gapOut}), otherwise the behavior oscillates`
  ), operator(WhenFarOp)(
    this,
    resolveDragSpecLike(background),
    gapIn,
    gapOut
  );
}
var WhenFarOp = class extends Operator {
  constructor(ctx, foreground, background, gapIn, gapOut) {
    super(ctx);
    this.gapIn = gapIn;
    this.gapOut = gapOut;
    this.foreground = this.child("fg", foreground), this.background = this.child("bg", background);
  }
  gapIn;
  gapOut;
  name = "whenFar";
  foreground;
  background;
  /** Memory: whether the last frame used the foreground (for hysteresis). */
  inForeground = !0;
  frame(frame) {
    let foregroundResult = this.foreground.run(frame), threshold = this.inForeground ? this.gapOut : this.gapIn;
    return this.inForeground = foregroundResult.gap <= threshold, this.inForeground ? foregroundResult : this.background.run(frame);
  }
  treeView(props) {
    let gapLabel = this.gapIn === this.gapOut ? `gap=${this.gapIn}` : `gapIn=${this.gapIn} gapOut=${this.gapOut}`;
    return /* @__PURE__ */ jsx18(Box, { label: `whenFar (${gapLabel})`, path: props.path, children: /* @__PURE__ */ jsxs13("div", { style: { display: "flex", flexDirection: "row", gap: 4 }, children: [
      /* @__PURE__ */ jsx18(Slot, { label: "fg", children: this.foreground.treeView(props) }),
      /* @__PURE__ */ jsx18(Slot, { label: "bg", children: this.background.treeView(props) })
    ] }) });
  }
  overlayVis({ active }) {
    if (this.frames === 0) return null;
    let foreground = /* @__PURE__ */ jsx18(
      OverlayVis,
      {
        op: this.foreground.op,
        active: active && this.inForeground
      }
    );
    return this.inForeground ? foreground : /* @__PURE__ */ jsxs13("g", { children: [
      foreground,
      /* @__PURE__ */ jsx18(OverlayVis, { op: this.background.op, active })
    ] });
  }
};

// node_modules/.pnpm/d3-ease@3.0.1/node_modules/d3-ease/src/cubic.js
function cubicOut(t) {
  return --t * t * t + 1;
}

// node_modules/.pnpm/d3-ease@3.0.1/node_modules/d3-ease/src/math.js
function tpmt(x) {
  return (Math.pow(2, -10 * x) - 9765625e-10) * 1.0009775171065494;
}

// node_modules/.pnpm/d3-ease@3.0.1/node_modules/d3-ease/src/elastic.js
var tau2 = 2 * Math.PI, amplitude = 1, period = 0.3, elasticIn = (function custom2(a, p) {
  var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau2);
  function elasticIn2(t) {
    return a * tpmt(- --t) * Math.sin((s - t) / p);
  }
  return elasticIn2.amplitude = function(a2) {
    return custom2(a2, p * tau2);
  }, elasticIn2.period = function(p2) {
    return custom2(a, p2);
  }, elasticIn2;
})(amplitude, period), elasticOut = (function custom3(a, p) {
  var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau2);
  function elasticOut2(t) {
    return 1 - a * tpmt(t = +t) * Math.sin((t + s) / p);
  }
  return elasticOut2.amplitude = function(a2) {
    return custom3(a2, p * tau2);
  }, elasticOut2.period = function(p2) {
    return custom3(a, p2);
  }, elasticOut2;
})(amplitude, period), elasticInOut = (function custom4(a, p) {
  var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau2);
  function elasticInOut2(t) {
    return ((t = t * 2 - 1) < 0 ? a * tpmt(-t) * Math.sin((s - t) / p) : 2 - a * tpmt(t) * Math.sin((s + t) / p)) / 2;
  }
  return elasticInOut2.amplitude = function(a2) {
    return custom4(a2, p * tau2);
  }, elasticInOut2.period = function(p2) {
    return custom4(a, p2);
  }, elasticInOut2;
})(amplitude, period);

// src/transition.ts
function applyEasing({ easing, duration }, t) {
  return (typeof easing == "function" ? easing : easing === "cubic-out" ? cubicOut : easing === "elastic-out" ? elasticOut : assertNever(easing))(t / duration);
}
function resolveTransitionLike(t) {
  if (t === !1) return !1;
  if (typeof t == "object")
    return t;
  let transition = {
    easing: "cubic-out",
    duration: 200
  };
  return typeof t == "string" || typeof t == "function" ? transition.easing = t : typeof t == "number" ? transition.duration = t : t === !0 || t === void 0 || assertNever(t), transition;
}

// src/ops/withBranchTransition.tsx
function withBranchTransition(transition) {
  return operator(WithBranchTransitionOp)(
    this,
    resolveTransitionLike(transition)
  );
}
var WithBranchTransitionOp = class extends Modifier {
  constructor(ctx, inner, transition) {
    super(ctx, inner);
    this.transition = transition;
  }
  transition;
  name = "withBranchTransition";
  frame(frame) {
    return {
      ...this.inner.run(frame),
      activePathTransition: this.transition
    };
  }
  treeView(props) {
    return this.wrapperView(props, describeTransition(this.transition));
  }
};

// src/ops/withChaining.tsx
function withChaining({
  transition = !0,
  ...rest
} = {}) {
  return operator(WithChainingOp)(this, {
    ...rest,
    transition: resolveTransitionLike(transition)
  });
}
var WithChainingOp = class extends Modifier {
  constructor(ctx, inner, chaining) {
    super(ctx, inner);
    this.chaining = chaining;
  }
  chaining;
  name = "withChaining";
  frame(frame) {
    let result = this.inner.run(frame);
    return { ...result, chainNow: result.chainNow ?? this.chaining };
  }
};

// src/ops/withDropTransition.tsx
function withDropTransition(transition) {
  return operator(WithDropTransitionOp)(
    this,
    resolveTransitionLike(transition)
  );
}
var WithDropTransitionOp = class extends Modifier {
  constructor(ctx, inner, transition) {
    super(ctx, inner);
    this.transition = transition;
  }
  transition;
  name = "withDropTransition";
  frame(frame) {
    return { ...this.inner.run(frame), dropTransition: this.transition };
  }
  treeView(props) {
    return this.wrapperView(props, describeTransition(this.transition));
  }
};

// src/ops/withFloating.tsx
import { jsx as jsx19, jsxs as jsxs14 } from "react/jsx-runtime";
function withFloating({ ghost, tether } = {}) {
  return operator(WithFloatingOp)(
    this,
    ghost === !0 ? { opacity: 0.5 } : ghost,
    tether
  );
}
var WithFloatingOp = class extends Modifier {
  constructor(ctx, inner, ghost, tether) {
    super(ctx, inner);
    this.ghost = ghost;
    this.tether = tether;
    assert(
      ctx.draggedId !== null,
      "Floating drags require the dragged element to have an id"
    ), this.draggedId = ctx.draggedId;
  }
  ghost;
  tether;
  name = "withFloating";
  draggedId;
  /**
   * The float element (pre-translated to the origin), cached for frames
   * where the inner result doesn't contain the dragged element.
   */
  cachedFloatAnchored = null;
  /** The last frame's preview and float origin, computed lazily. */
  computed;
  /** The last frame's preview. */
  get outputPreview() {
    return this.computed?.().preview;
  }
  /**
   * Where the element is floated FROM on the last frame. Null if the
   * element is not found (is floating from memory).
   */
  get elementPos() {
    return this.computed?.().elementPos;
  }
  frame(frame) {
    let { ctx, draggedId } = this, innerResult = this.inner.run(frame), cached = null, computePreview = () => {
      if (cached) return cached;
      let layered = innerResult.preview(), draggedLayer = layered.byId.get(draggedId), elementPos = null, floatAnchored, backdrop;
      if (draggedLayer) {
        elementPos = localToGlobal(
          draggedLayer.element.props.transform,
          ctx.anchorPos
        );
        let { remaining, extracted } = layeredExtract(layered, draggedId);
        floatAnchored = layeredTransform(
          extracted,
          translate(elementPos.mul(-1))
        ), this.cachedFloatAnchored = floatAnchored, this.ghost !== void 0 ? backdrop = layeredMerge(
          remaining,
          layeredSetAttributes(
            layeredPrefixIds(extracted, "ghost-"),
            this.ghost
          )
        ) : backdrop = remaining;
      } else {
        if (this.cachedFloatAnchored === null) {
          let startLayered = renderDraggableInert(
            ctx.draggable,
            ctx.startState,
            draggedId,
            !1
          ), { extracted } = layeredExtract(startLayered, draggedId), startDraggedLayer = startLayered.byId.get(draggedId), floatPos = startDraggedLayer ? localToGlobal(
            startDraggedLayer.element.props.transform,
            ctx.anchorPos
          ) : Vec2(0);
          this.cachedFloatAnchored = layeredTransform(
            extracted,
            translate(floatPos.mul(-1))
          );
        }
        floatAnchored = this.cachedFloatAnchored, backdrop = layered;
      }
      let target = frame.pointer;
      if (elementPos && this.tether) {
        let v2 = frame.pointer.sub(elementPos), dist2 = v2.len();
        if (dist2 > 1e-6) {
          let newDist = this.tether(dist2);
          target = elementPos.add(v2.mul(newDist / dist2));
        }
      }
      let floatPositioned = layeredTransform(
        floatAnchored,
        translate(target)
      );
      return cached = { preview: layeredMerge(
        backdrop,
        pipe(
          floatPositioned,
          (h) => layeredSetAttributes(h, { dragologyTransition: !1 }),
          (h) => layeredShiftZIndices(h, 1e6)
        )
      ), elementPos }, cached;
    };
    return this.computed = computePreview, {
      ...innerResult,
      preview: () => computePreview().preview,
      // The inner result's transitions and chaining don't apply to
      // the floating preview.
      dropTransition: void 0,
      activePathTransition: void 0,
      chainNow: void 0,
      // without a tether, the float sits right at the pointer
      grabPos: this.tether ? void 0 : frame.pointer
    };
  }
  treeView(props) {
    let preview = this.outputPreview;
    return /* @__PURE__ */ jsxs14(Box, { label: "withFloating", color: props.color, path: props.path, children: [
      preview && /* @__PURE__ */ jsx19(OutputThumbnail, { outputPreview: preview }),
      this.inner.treeView(props)
    ] });
  }
  overlayVis({ active, opacity }) {
    if (!this.lastFrame) return null;
    let { pointer } = this.lastFrame, elementPos = this.elementPos;
    return /* @__PURE__ */ jsxs14("g", { children: [
      /* @__PURE__ */ jsx19(OverlayVis, { op: this.inner.op, active }),
      elementPos && /* @__PURE__ */ jsxs14("g", { opacity, children: [
        /* @__PURE__ */ jsx19("circle", { cx: elementPos.x, cy: elementPos.y, r: 5, fill: "magenta" }),
        /* @__PURE__ */ jsx19(
          DistanceLine,
          {
            from: elementPos,
            to: pointer,
            distance: pointer.dist(elementPos)
          }
        )
      ] })
    ] });
  }
};

// src/ops/withInitContext.tsx
function withInitContext(f) {
  return operator(WithInitContextOp)(this, f);
}
var WithInitContextOp = class extends Modifier {
  constructor(ctx, inner, f) {
    super(ctx, inner, { ...ctx, ...readerToValue(f, ctx) });
    this.f = f;
  }
  f;
  name = "withInitContext";
  frame(frame) {
    return this.inner.run(frame);
  }
};

// src/ops/withOverlay.tsx
import { jsx as jsx20 } from "react/jsx-runtime";
var OVERLAY_Z_SHIFT = 2e6, overlayCount = 0;
function withOverlay(overlay) {
  return operator(WithOverlayOp)(this, overlay);
}
var WithOverlayOp = class extends Modifier {
  name = "withOverlay";
  layer;
  constructor(ctx, inner, overlay) {
    super(ctx, inner), this.layer = layeredShiftZIndices(
      layeredPrefixIds(
        layerSvg(/* @__PURE__ */ jsx20("g", { children: overlay })),
        `overlay-${overlayCount++}-`
      ),
      OVERLAY_Z_SHIFT
    );
  }
  frame(frame) {
    let result = this.inner.run(frame);
    return {
      ...result,
      preview: () => layeredMerge(result.preview(), this.layer)
    };
  }
};

// src/ops/withSnapRadius.tsx
import { jsx as jsx21, jsxs as jsxs15 } from "react/jsx-runtime";
function withSnapRadius(radius, {
  transition = !1,
  chain = !1
} = {}) {
  return operator(WithSnapRadiusOp)(
    this,
    radius,
    resolveTransitionLike(transition),
    chain
  );
}
var WithSnapRadiusOp = class extends Modifier {
  constructor(ctx, inner, radius, transition, chain) {
    super(ctx, inner);
    this.radius = radius;
    this.transition = transition;
    this.chain = chain;
  }
  radius;
  transition;
  chain;
  name = "withSnapRadius";
  /**
   * Drop-state renders and grab positions, by reference identity. For
   * `between` children, the drop state cycles through a small fixed
   * set, so this avoids redundant render passes on every frame.
   */
  dropRendered = memoize_default(
    (state) => renderStateReadOnly(this.ctx, state)
  );
  dropGrabPos = memoize_default(
    (state) => assertDefined(getElementPositionCheap(this.ctx, state))
  );
  /** Whether the last frame snapped. */
  snapped = !1;
  /**
   * With a transition, the last frame's active-path segment between
   * this op and the wrapped spec, so that snapping counts as a branch
   * switch.
   */
  segment;
  /** The last frame's preview, rendered on demand. */
  preview;
  /** The last frame's preview. */
  get outputPreview() {
    return this.preview?.();
  }
  frame(frame) {
    let result = this.inner.run(frame), grabPos = result.grabPos ?? getElementPositionOrThrow(this.ctx, result.preview()), dropGrabPos = this.dropGrabPos(result.dropState), snapped = dropGrabPos.dist2(grabPos) <= this.radius ** 2, preview = snapped ? () => this.dropRendered(result.dropState) : result.preview;
    return this.snapped = snapped, this.preview = preview, this.segment = this.transition ? snapped ? "snapped" : "unsnapped" : void 0, {
      ...result,
      preview,
      grabPos: snapped ? dropGrabPos : grabPos,
      activePath: joinPath(this.segment, result.activePath),
      activePathTransition: this.transition || void 0,
      chainNow: this.chain && snapped ? { transition: this.transition } : void 0
    };
  }
  treeView(props) {
    let { snapped, transition } = this, options = [transition && "transition", this.chain && "chain"].filter(
      Boolean
    ), label = `withSnapRadius (${this.radius}${options.length ? `, ${options.join(", ")}` : ""})`;
    return transition && (label += snapped ? " [snapped]" : " [not snapped]"), /* @__PURE__ */ jsxs15(Box, { label, path: props.path, children: [
      this.outputPreview && /* @__PURE__ */ jsx21(OutputThumbnail, { outputPreview: this.outputPreview }),
      this.inner.treeView({
        ...props,
        childPath: this.segment ? `${props.childPath}${this.segment}/` : props.childPath
      })
    ] });
  }
};

// src/DragSpec.tsx
var DragSpecMethods = class {
  get onDrop() {
    return onDrop;
  }
  get whenFar() {
    return whenFar;
  }
  get withSnapRadius() {
    return withSnapRadius;
  }
  get withDropTransition() {
    return withDropTransition;
  }
  get withOverlay() {
    return withOverlay;
  }
  get withBranchTransition() {
    return withBranchTransition;
  }
  get changeFrame() {
    return changeFrame;
  }
  get changeResult() {
    return changeResult;
  }
  get changeGap() {
    return changeGap;
  }
  get withFloating() {
    return withFloating;
  }
  get withChaining() {
    return withChaining;
  }
  get during() {
    return during;
  }
  get withInitContext() {
    return withInitContext;
  }
  /**
   * Wrap this spec in a modifier, made with `modifier`:
   * `.with(pointerDelay(200))`.
   */
  with(wrap) {
    return wrap(this);
  }
};
function modifier(modifierClass) {
  let make = operator(modifierClass);
  return (...args) => (spec) => make(spec, ...args);
}
function operator(operatorClass) {
  return (...args) => attachMethods({
    opClass: operatorClass,
    args
  });
}
function attachMethods(data) {
  return Object.assign(Object.create(DragSpecMethods.prototype), data);
}
function isDragSpec(value) {
  return typeof value == "object" && value !== null && Object.getPrototypeOf(value) === DragSpecMethods.prototype;
}
function resolveDragSpecLike(specLike) {
  return isDragSpec(specLike) ? specLike : fixed(specLike);
}
var DragSpecBuilder = class {
  state;
  constructor(state) {
    this.state = state;
  }
  get fixed() {
    return fixed;
  }
  get between() {
    return between;
  }
  get closest() {
    return closest;
  }
  get vary() {
    return VaryMethod.prototype.vary;
  }
  get varyFunc() {
    return varyFunc;
  }
  get custom() {
    return custom;
  }
  get dropTarget() {
    return dropTarget;
  }
  get substate() {
    return SubstateMethod.prototype.substate;
  }
  get switchToStateAndFollow() {
    return switchToStateAndFollow;
  }
  get reactTo() {
    return ReactToMethod.prototype.reactTo;
  }
}, VARY_PATH = /* @__PURE__ */ Symbol("VaryPath");
function param(...segments) {
  return { [VARY_PATH]: segments };
}
function resolveVaryPath(p) {
  return p[VARY_PATH];
}

// src/draggable.tsx
function makeDraggableProps(fields) {
  let props = {
    ...fields,
    d: new DragSpecBuilder(fields.state),
    embed(draggable, path2) {
      return embedImpl(draggable, props, path2);
    }
  };
  return props;
}
var DRAGOLOGY_PROP_NAME = "dragologyOnDrag";
function getOnDragCallbackOnElement(element) {
  let callback = element.props[DRAGOLOGY_PROP_NAME];
  return callback || void 0;
}
function embedImpl(draggable, props, path2) {
  let subState = getAtPath(props.state, path2), subProps = makeDraggableProps({
    state: subState,
    draggedId: props.draggedId,
    setState: (action, options) => {
      props.setState((prev) => {
        let prevSub = getAtPath(prev, path2), newSub = typeof action == "function" ? action(
          prevSub
        ) : action;
        return setAtPath(prev, path2, newSub);
      }, options);
    },
    isTracking: props.isTracking
  }), rendered = draggable(subProps);
  return updatePropsDownTree(rendered, (el) => {
    let onDragCallback = getOnDragCallbackOnElement(el);
    if (onDragCallback)
      return {
        [DRAGOLOGY_PROP_NAME]: () => {
          let subSpec = onDragCallback();
          return props.d.substate(props.state, path2, () => subSpec);
        }
      };
  });
}

// src/DragBehavior.tsx
function dragSpecToBehavior(spec, ctx) {
  return opBehavior(new spec.opClass(ctx, ...spec.args));
}
function renderStateReadOnly(ctx, state) {
  return renderDraggableInert(ctx.draggable, state, ctx.draggedId, !1);
}
function getElementPositionCheap(ctx, state) {
  if (ctx.draggedId) {
    let raw = ctx.draggable(
      makeDraggableProps({
        state,
        draggedId: ctx.draggedId,
        setState: () => {
          throw new Error("This function should not have been called");
        },
        isTracking: !0
      })
    ), found2 = findElement(raw, (el) => el.props.id === ctx.draggedId);
    return found2 ? localToGlobal(found2.accumulatedTransform, ctx.anchorPos) : null;
  }
  let content = renderDraggableInertUnlayered(
    ctx.draggable,
    state,
    ctx.draggedId,
    !0
  ), found = findByPath(ctx.draggedPath, content);
  return found ? localToGlobal(found.accumulatedTransform, ctx.anchorPos) : null;
}
function getElementPosition(ctx, layered) {
  let found = findByPathInLayered(ctx.draggedPath, layered);
  return found ? localToGlobal(found.accumulatedTransform, ctx.anchorPos) : null;
}
function getElementPositionOrThrow(ctx, layered) {
  return assertDefined(getElementPosition(ctx, layered));
}

// src/svgx/componentHost.tsx
import { cloneElement as cloneElement3, createElement as createElement2 } from "react";
import { createPortal } from "react-dom";
import { jsx as jsx22 } from "react/jsx-runtime";
var SVG_NS = "http://www.w3.org/2000/svg", ComponentHost = class {
  containers = /* @__PURE__ */ new Map();
  refCallbacks = /* @__PURE__ */ new Map();
  retained = /* @__PURE__ */ new Map();
  /**
   * Replaces component elements in each layer with placeholders, and
   * returns the portals that render them. With `keepAbsent`,
   * components missing from this frame stay mounted (off-screen), so
   * a drag preview that omits one doesn't destroy its state.
   */
  frame(layered, keepAbsent) {
    let current2 = /* @__PURE__ */ new Map(), byId = new Map(
      [...layered.byId].map(([id, layer]) => [
        id,
        {
          ...layer,
          element: this.walk(layer.element, !1, void 0, current2)
        }
      ])
    ), hosted = keepAbsent ? new Map([...this.retained, ...current2]) : current2;
    this.retained = hosted;
    for (let key of [...this.containers.keys()])
      hosted.has(key) || (this.containers.delete(key), this.refCallbacks.delete(key));
    let portals = [...hosted.values()].map((component) => /* @__PURE__ */ jsx22("g", { onPointerDown: component.grab, children: createPortal(
      stripDragologyProps(component.element),
      this.container(component)
    ) }, component.key));
    return { layered: { ...layered, byId }, portals };
  }
  container(component) {
    let existing = this.containers.get(component.key);
    if (existing && existing.html === component.html) return existing.el;
    let el;
    return component.html ? (el = document.createElement("div"), el.style.display = "contents") : el = document.createElementNS(SVG_NS, "g"), this.containers.set(component.key, { el, html: component.html }), el;
  }
  /** Stable per key, so React doesn't detach and reattach every frame. */
  refCallback(key) {
    let cb = this.refCallbacks.get(key);
    return cb || (cb = (node) => {
      let container = this.containers.get(key)?.el;
      node && container && container.parentNode !== node && node.appendChild(container);
    }, this.refCallbacks.set(key, cb)), cb;
  }
  walk(node, html, grab, out) {
    if (isComponentElement(node)) {
      let key = getPath(node);
      return key === void 0 ? node : (out.set(key, { key, element: node, html, grab }), html ? createElement2("div", {
        key: node.key,
        ref: this.refCallback(key),
        style: { display: "contents" }
      }) : createElement2("g", { key: node.key, ref: this.refCallback(key) }));
    }
    let { children, onPointerDown, dragologyOnDrag } = node.props;
    if (children === void 0 || !shouldRecurseIntoChildren(node))
      return node;
    let childGrab = dragologyOnDrag && onPointerDown ? onPointerDown : grab, childHtml = node.type === "foreignObject", changed = !1, walkChild = (child) => {
      if (Array.isArray(child)) {
        let mapped = child.map(walkChild);
        return mapped.some((c, i) => c !== child[i]) ? mapped : child;
      }
      if (!isValidSvgx(child)) return child;
      let result = this.walk(child, childHtml, childGrab, out);
      return result !== child && (changed = !0), result;
    }, newChildren = walkChild(children);
    return changed ? cloneElement3(node, void 0, newChildren) : node;
  }
};
function stripDragologyProps(element) {
  let props = {};
  for (let [k, v2] of Object.entries(element.props))
    k === "data-path" || k.startsWith("dragology") || (props[k] = v2);
  return createElement2(element.type, props);
}

// src/useAnimationLoop.ts
import { useEffect, useRef } from "react";
function useAnimationLoop(callback) {
  let callbackRef = useRef(callback);
  callbackRef.current = callback, useEffect(() => {
    let requestId, loop = () => {
      callbackRef.current(), requestId = requestAnimationFrame(loop);
    };
    return requestId = requestAnimationFrame(loop), () => {
      cancelAnimationFrame(requestId);
    };
  }, []);
}

// src/useRenderError.ts
import { useCallback, useState } from "react";
function useThrowRenderError() {
  let [error, setError] = useState(null);
  if (error)
    throw error;
  return useCallback((err) => {
    throw setError(err), err;
  }, []);
}
function useCatchToRenderError() {
  let throwRenderError = useThrowRenderError();
  return useCallback(
    function(fn) {
      return (...args) => {
        try {
          return fn(...args);
        } catch (error) {
          return throwRenderError(error);
        }
      };
    },
    [throwRenderError]
  );
}

// src/useStateWithRef.ts
import { useCallback as useCallback2, useRef as useRef2, useState as useState2 } from "react";
function useStateWithRef(initialState) {
  let [state, setState] = useState2(initialState), ref = useRef2(state);
  ref.current = state;
  let setStateAndRef = useCallback2((action) => {
    let newValue = typeof action == "function" ? action(ref.current) : action;
    ref.current = newValue, setState(newValue);
  }, []);
  return [state, setStateAndRef, ref];
}

// src/DraggableRenderer.tsx
import { jsx as jsx23, jsxs as jsxs16 } from "react/jsx-runtime";
function makeSpringOrigin(transitionLike, layeredLazy) {
  let transition = resolveTransitionLike(transitionLike);
  return transition === !1 ? null : {
    layered: layeredLazy(),
    time: performance.now(),
    transition
  };
}
function DraggableRenderer({
  state,
  initialState,
  ...rest
}) {
  return assert(
    !(state !== void 0 && initialState !== void 0),
    "DraggableRenderer: provide either 'state' or 'initialState', not both"
  ), state !== void 0 ? /* @__PURE__ */ jsx23(DraggableRendererControlled, { ...rest, state }) : /* @__PURE__ */ jsx23(DraggableRendererUncontrolled, { ...rest, initialState });
}
function DraggableRendererUncontrolled({
  initialState,
  onDropState,
  ...rest
}) {
  let [state, setState] = useState3(initialState), handleStateChange = useCallback3(
    (newState) => {
      setState(newState), onDropState?.(newState);
    },
    [onDropState]
  );
  return /* @__PURE__ */ jsx23(
    DraggableRendererControlled,
    {
      ...rest,
      state,
      onDropState: handleStateChange
    }
  );
}
function DraggableRendererControlled({
  draggable,
  state,
  width,
  height,
  onDropState,
  onDragState,
  onDragStatus,
  showDebugOverlay,
  showVaryVisualizer,
  dragThreshold = 2,
  simulateDrag
}) {
  let catchToRenderError = useCatchToRenderError(), [status, setStatus, statusRef] = useStateWithRef({
    type: "idle",
    state,
    springOrigin: null
  });
  if (status.type === "idle" && status.state !== state) {
    let currentRendered = renderDraggableInert(
      draggable,
      status.state,
      null,
      !1
    ), currentVisual = runSpring(status.springOrigin, currentRendered);
    setStatus({
      ...status,
      state,
      springOrigin: makeSpringOrigin(!0, () => currentVisual)
    });
  }
  useEffect2(() => {
    onDragStatus?.(status);
  }, [status, onDragStatus]);
  let prevDropStateRef = useRef3(void 0);
  useLayoutEffect(() => {
    let dropState = status.type === "dragging" ? status.result.dropState : void 0;
    dropState !== void 0 && dropState !== prevDropStateRef.current && onDragState?.(dropState), prevDropStateRef.current = dropState;
  }, [status, onDragState]);
  let pointerRef = useRef3(void 0), pointerOverrideRef = useRef3(void 0), getPointer = () => pointerOverrideRef.current ?? pointerRef.current, onDropStateRef = useRef3(onDropState);
  onDropStateRef.current = onDropState;
  let onDragStateRef = useRef3(onDragState);
  onDragStateRef.current = onDragState;
  let suppressClickRef = useRef3(!1), [svgElem, setSvgElem] = useState3(null), setPointerFromEvent = useCallback3(
    (e) => {
      assert(!!svgElem);
      let rect = svgElem.getBoundingClientRect(), scale3 = svgElem.width.baseVal.value !== 0 ? rect.width / svgElem.width.baseVal.value : 1, pointer2 = Vec2(
        (e.clientX - rect.left) / scale3,
        (e.clientY - rect.top) / scale3
      );
      return pointerRef.current = pointer2, pointer2;
    },
    [svgElem]
  );
  if (useAnimationLoop(
    catchToRenderError(() => {
      let result = advanceFrame(
        statusRef.current,
        getPointer(),
        performance.now()
      );
      result && setStatus(result);
    })
  ), simulateDrag && status.type === "idle" && !status.pendingDrag) {
    let simId = simulateDrag.id, simOffset = simulateDrag.offset ? Vec2(simulateDrag.offset) : Vec2(0, 0), content = renderDraggableInertUnlayered(
      draggable,
      state,
      simId,
      !0
    ), found = findElement(content, (el) => el.props.id === simId);
    if (found) {
      let localBounds = getLocalBounds(found.element);
      if (!localBounds.empty) {
        let center = boundsCenter(localBounds), pointer2 = localToGlobal(found.accumulatedTransform, center).add(
          simOffset
        );
        pointerOverrideRef.current = pointer2;
        let dragSpec = getOnDragCallbackOnElement(found.element)?.(), draggedPath = getPath(found.element);
        dragSpec && draggedPath && setStatus(initDrag(dragSpec, {
          draggable,
          draggedPath,
          draggedId: simId,
          anchorPos: center,
          startState: state,
          debug: { varyVisualizer: !1 }
        }, state, { pointer: pointer2 }, null));
      }
    }
  }
  useEffect2(() => {
    document.body.style.cursor = status.type === "dragging" ? "grabbing" : "default";
  }, [status.type]);
  let shouldListenToPointer = !simulateDrag && (status.type === "dragging" || status.type === "idle" && !!status.pendingDrag);
  useEffect2(() => {
    if (!shouldListenToPointer) return;
    let onPointerMove = catchToRenderError((e) => {
      let status2 = statusRef.current;
      if (status2.type === "idle" && status2.pendingDrag) {
        let { pendingDrag: pending } = status2;
        Vec2(e.clientX, e.clientY).sub(pending.startClientPos).len2() > pending.threshold * pending.threshold && (setPointerFromEvent(e), setStatus(pending.status));
      } else
        setPointerFromEvent(e);
    }), onPointerUp = catchToRenderError((e) => {
      let status2 = statusRef.current;
      if (status2.type === "idle" && status2.pendingDrag) {
        let newState2 = {
          type: "idle",
          state: status2.state,
          springOrigin: status2.springOrigin
        };
        setStatus(newState2);
        return;
      }
      if (status2.type !== "dragging") return;
      suppressClickRef.current = !0;
      let frame = { pointer: setPointerFromEvent(e) }, result = status2.behavior(frame), dropState = result.dropState, newState = {
        type: "idle",
        state: dropState,
        springOrigin: makeSpringOrigin(
          result.dropTransition,
          () => runSpring(status2.springOrigin, result.preview())
        )
      };
      setStatus(newState), onDropStateRef.current?.(dropState), onDragStateRef.current?.(dropState);
    });
    return document.addEventListener("pointermove", onPointerMove), document.addEventListener("pointerup", onPointerUp), () => {
      document.removeEventListener("pointermove", onPointerMove), document.removeEventListener("pointerup", onPointerUp);
    };
  }, [
    catchToRenderError,
    statusRef,
    shouldListenToPointer,
    setStatus,
    setPointerFromEvent
  ]);
  let renderCtx = useMemo(
    () => ({
      draggable,
      catchToRenderError,
      setPointerFromEvent,
      setStatus,
      onDropState,
      dragThreshold,
      showVaryVisualizer: showVaryVisualizer ?? !1,
      showDebugOverlay: showDebugOverlay ?? !1
    }),
    [
      catchToRenderError,
      draggable,
      dragThreshold,
      onDropState,
      setStatus,
      setPointerFromEvent,
      showVaryVisualizer,
      showDebugOverlay
    ]
  ), componentHost = useRef3(null);
  componentHost.current ??= new ComponentHost();
  let drawn = useMemo(() => {
    let { layered, portals } = componentHost.current.frame(
      status.type === "idle" ? renderIdleMode(status, renderCtx) : runSpring(status.springOrigin, status.result.preview()),
      status.type === "dragging"
    );
    return { layers: drawLayered(layered), portals };
  }, [status, renderCtx]), pointer = getPointer();
  return /* @__PURE__ */ jsxs16(
    "svg",
    {
      ref: setSvgElem,
      width,
      height,
      xmlns: "http://www.w3.org/2000/svg",
      style: {
        overflow: "visible",
        userSelect: "none",
        touchAction: "none",
        ...simulateDrag ? { pointerEvents: "none" } : {}
      },
      onPointerDownCapture: () => {
        suppressClickRef.current = !1;
      },
      onClickCapture: (e) => {
        suppressClickRef.current && (suppressClickRef.current = !1, e.stopPropagation(), e.preventDefault());
      },
      children: [
        drawn.layers,
        drawn.portals,
        status.type === "dragging" && showDebugOverlay && pointer && /* @__PURE__ */ jsx23(ErrorBoundary, { children: /* @__PURE__ */ jsx23(OverlayVis, { op: status.result.op }) }),
        simulateDrag && pointerOverrideRef.current && /* @__PURE__ */ jsx23(
          "circle",
          {
            cx: pointerOverrideRef.current.x,
            cy: pointerOverrideRef.current.y,
            r: 4,
            fill: "red",
            stroke: "white",
            strokeWidth: 1.5,
            opacity: 0.8
          }
        )
      ]
    }
  );
}
function runSpring(springOrigin, target) {
  if (!springOrigin) return target;
  let elapsed = performance.now() - springOrigin.time, t = applyEasing(springOrigin.transition, elapsed), lerped = lerpLayered(target, springOrigin.layered, 1 - t, "a");
  for (let [key, layer] of lerped.byId.entries())
    if (layer.element.props.dragologyTransition === !1) {
      let targetVal = target.byId.get(key);
      targetVal && lerped.byId.set(key, targetVal);
    }
  return lerped;
}
function advanceFrame(status, pointer, now) {
  if (status.type === "dragging") {
    if (!pointer) return null;
    let frame = { pointer }, result = status.behavior(frame), chained = resolveChainNows(status, frame, result);
    if (chained !== status) return chained;
    let springOrigin = status.springOrigin;
    return result.activePath !== status.result.activePath && (springOrigin = makeSpringOrigin(
      result.activePathTransition,
      () => runSpring(springOrigin, status.result.preview())
    )), springOrigin && now - springOrigin.time >= springOrigin.transition?.duration && (springOrigin = null), { ...status, result, springOrigin };
  }
  return status.type === "idle" && status.springOrigin ? now - status.springOrigin.time >= status.springOrigin.transition.duration ? { ...status, springOrigin: null } : { ...status } : null;
}
function resolveChainNows(status, frame, result) {
  if (!result.chainNow || isEqual_default(result.dropState, status.startState))
    return status;
  let newState = result.dropState, newDraggedId = result.chainNow.draggedId ?? status.behaviorCtx.draggedId, content = renderDraggableInertUnlayered(
    status.behaviorCtx.draggable,
    newState,
    newDraggedId,
    !0
  ), found = newDraggedId ? findElement(content, (el) => el.props.id === newDraggedId) : findByPath(status.behaviorCtx.draggedPath, content);
  assert(
    !!found,
    `Chained drag must have a valid dragged element; couldn't find element with id ${newDraggedId}`
  );
  let newDragSpec = result.chainNow.followSpec ?? getOnDragCallbackOnElement(found.element)?.();
  if (!newDragSpec) return status;
  let chainTransition = result.chainNow.transition, newSpringOrigin = makeSpringOrigin(
    chainTransition,
    () => runSpring(status.springOrigin, status.result.preview())
  ), newDraggedPath = getPath(found.element);
  assert(!!newDraggedPath, "Chained element must have a path");
  let anchorPos = status.behaviorCtx.anchorPos;
  return initDrag(
    newDragSpec,
    {
      ...status.behaviorCtx,
      draggedPath: newDraggedPath,
      draggedId: newDraggedId,
      anchorPos,
      startState: newState
    },
    newState,
    frame,
    newSpringOrigin
  );
}
function initDrag(spec, behaviorCtx, state, frame, springOrigin) {
  let behavior = dragSpecToBehavior(spec, behaviorCtx), result = behavior(frame);
  return {
    type: "dragging",
    startState: state,
    behavior,
    specForDropZoneVis: spec,
    behaviorCtx,
    result,
    springOrigin
  };
}
function ancestorOrSelfHasClickHandler(root2, targetPath) {
  let found = findByPath(targetPath, root2);
  return found ? [...found.ancestors, found.element].some(
    (el) => el.props.onClick || el.props.onDoubleClick
  ) : !1;
}
function postProcessForInteraction(content, state, ctx) {
  let withPaths = assignPaths(content);
  return pipe(
    withPaths,
    (el) => updatePropsDownTree(el, (el2) => {
      let onDragCallback = getOnDragCallbackOnElement(el2);
      if (onDragCallback)
        return assert(
          !el2.props.onPointerDown,
          "Elements with dragology cannot have onPointerDown (it is overwritten)"
        ), {
          // put cursor first, so it's overriden by author-defined cursor
          style: { cursor: "grab", ...el2.props.style || {} },
          onPointerDown: ctx.catchToRenderError((e) => {
            e.stopPropagation();
            let pointer = ctx.setPointerFromEvent(e.nativeEvent), dragSpec = onDragCallback(), draggedId = el2.props.id ?? null, draggedPath = getPath(el2);
            assert(!!draggedPath, "Dragged element must have a path");
            let found = findByPath(draggedPath, withPaths);
            assert(!!found, "Dragged element must be findable by path");
            let anchorPos = globalToLocal(
              found.accumulatedTransform,
              pointer
            ), behaviorCtx = {
              draggable: ctx.draggable,
              draggedPath,
              draggedId,
              anchorPos,
              startState: state,
              debug: { varyVisualizer: ctx.showVaryVisualizer }
            }, draggingStatus = initDrag(
              dragSpec,
              behaviorCtx,
              state,
              { pointer },
              null
            ), hasClickHandler = ancestorOrSelfHasClickHandler(
              withPaths,
              draggedPath
            );
            ctx.dragThreshold <= 0 || !hasClickHandler ? ctx.setStatus(draggingStatus) : ctx.setStatus({
              type: "idle",
              state,
              springOrigin: null,
              pendingDrag: {
                startClientPos: Vec2(e.clientX, e.clientY),
                threshold: ctx.dragThreshold,
                status: draggingStatus
              }
            });
          })
        };
    }),
    layerSvg
  );
}
function renderIdleMode(status, ctx) {
  let content = ctx.draggable(
    makeDraggableProps({
      state: status.state,
      draggedId: null,
      setState: ctx.catchToRenderError(
        (newState, { transition } = {}) => {
          let resolved = typeof newState == "function" ? newState(status.state) : newState, newStatus = {
            type: "idle",
            state: resolved,
            springOrigin: makeSpringOrigin(
              transition,
              () => renderDraggableInert(ctx.draggable, status.state, null, !1)
            )
          };
          ctx.setStatus(newStatus), ctx.onDropState?.(resolved);
        }
      ),
      isTracking: !1
    })
  ), layered = postProcessForInteraction(content, status.state, ctx);
  return runSpring(status.springOrigin, layered);
}

// node_modules/.pnpm/immer@11.0.0/node_modules/immer/dist/immer.mjs
var NOTHING = /* @__PURE__ */ Symbol.for("immer-nothing"), DRAFTABLE = /* @__PURE__ */ Symbol.for("immer-draftable"), DRAFT_STATE = /* @__PURE__ */ Symbol.for("immer-state"), errors = [
  // All error codes, starting by 0:
  function(plugin) {
    return `The plugin for '${plugin}' has not been loaded into Immer. To enable the plugin, import and call \`enable${plugin}()\` when initializing your application.`;
  },
  function(thing) {
    return `produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '${thing}'`;
  },
  "This object has been frozen and should not be mutated",
  function(data) {
    return "Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + data;
  },
  "An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.",
  "Immer forbids circular references",
  "The first or second argument to `produce` must be a function",
  "The third argument to `produce` must be a function or undefined",
  "First argument to `createDraft` must be a plain object, an array, or an immerable object",
  "First argument to `finishDraft` must be a draft returned by `createDraft`",
  function(thing) {
    return `'current' expects a draft, got: ${thing}`;
  },
  "Object.defineProperty() cannot be used on an Immer draft",
  "Object.setPrototypeOf() cannot be used on an Immer draft",
  "Immer only supports deleting array indices",
  "Immer only supports setting array indices and the 'length' property",
  function(thing) {
    return `'original' expects a draft, got: ${thing}`;
  }
  // Note: if more errors are added, the errorOffset in Patches.ts should be increased
  // See Patches.ts for additional errors
];
function die(error, ...args) {
  {
    let e = errors[error], msg = isFunction2(e) ? e.apply(null, args) : e;
    throw new Error(`[Immer] ${msg}`);
  }
  throw new Error(
    `[Immer] minified error nr: ${error}. Full error at: https://bit.ly/3cXEKWf`
  );
}
var O = Object, getPrototypeOf = O.getPrototypeOf, CONSTRUCTOR = "constructor", PROTOTYPE = "prototype", CONFIGURABLE = "configurable", ENUMERABLE = "enumerable", WRITABLE = "writable", VALUE = "value", isDraft = (value) => !!value && !!value[DRAFT_STATE];
function isDraftable(value) {
  return value ? isPlainObject2(value) || isArray3(value) || !!value[DRAFTABLE] || !!value[CONSTRUCTOR]?.[DRAFTABLE] || isMap(value) || isSet(value) : !1;
}
var objectCtorString = O[PROTOTYPE][CONSTRUCTOR].toString(), cachedCtorStrings = /* @__PURE__ */ new WeakMap();
function isPlainObject2(value) {
  if (!value || !isObjectish(value))
    return !1;
  let proto = getPrototypeOf(value);
  if (proto === null || proto === O[PROTOTYPE])
    return !0;
  let Ctor = O.hasOwnProperty.call(proto, CONSTRUCTOR) && proto[CONSTRUCTOR];
  if (Ctor === Object)
    return !0;
  if (!isFunction2(Ctor))
    return !1;
  let ctorString = cachedCtorStrings.get(Ctor);
  return ctorString === void 0 && (ctorString = Function.toString.call(Ctor), cachedCtorStrings.set(Ctor, ctorString)), ctorString === objectCtorString;
}
function each(obj, iter, strict = !0) {
  getArchtype(obj) === 0 ? (strict ? Reflect.ownKeys(obj) : O.keys(obj)).forEach((key) => {
    iter(key, obj[key], obj);
  }) : obj.forEach((entry, index) => iter(index, entry, obj));
}
function getArchtype(thing) {
  let state = thing[DRAFT_STATE];
  return state ? state.type_ : isArray3(thing) ? 1 : isMap(thing) ? 2 : isSet(thing) ? 3 : 0;
}
var has = (thing, prop, type = getArchtype(thing)) => type === 2 ? thing.has(prop) : O[PROTOTYPE].hasOwnProperty.call(thing, prop), get2 = (thing, prop, type = getArchtype(thing)) => (
  // @ts-ignore
  type === 2 ? thing.get(prop) : thing[prop]
), set = (thing, propOrOldValue, value, type = getArchtype(thing)) => {
  type === 2 ? thing.set(propOrOldValue, value) : type === 3 ? thing.add(value) : thing[propOrOldValue] = value;
};
function is(x, y) {
  return x === y ? x !== 0 || 1 / x === 1 / y : x !== x && y !== y;
}
var isArray3 = Array.isArray, isMap = (target) => target instanceof Map, isSet = (target) => target instanceof Set, isObjectish = (target) => typeof target == "object", isFunction2 = (target) => typeof target == "function", isBoolean = (target) => typeof target == "boolean";
var latest = (state) => state.copy_ || state.base_;
var getFinalValue = (state) => state.modified_ ? state.copy_ : state.base_;
function shallowCopy(base, strict) {
  if (isMap(base))
    return new Map(base);
  if (isSet(base))
    return new Set(base);
  if (isArray3(base))
    return Array[PROTOTYPE].slice.call(base);
  let isPlain = isPlainObject2(base);
  if (strict === !0 || strict === "class_only" && !isPlain) {
    let descriptors = O.getOwnPropertyDescriptors(base);
    delete descriptors[DRAFT_STATE];
    let keys2 = Reflect.ownKeys(descriptors);
    for (let i = 0; i < keys2.length; i++) {
      let key = keys2[i], desc = descriptors[key];
      desc[WRITABLE] === !1 && (desc[WRITABLE] = !0, desc[CONFIGURABLE] = !0), (desc.get || desc.set) && (descriptors[key] = {
        [CONFIGURABLE]: !0,
        [WRITABLE]: !0,
        // could live with !!desc.set as well here...
        [ENUMERABLE]: desc[ENUMERABLE],
        [VALUE]: base[key]
      });
    }
    return O.create(getPrototypeOf(base), descriptors);
  } else {
    let proto = getPrototypeOf(base);
    if (proto !== null && isPlain)
      return { ...base };
    let obj = O.create(proto);
    return O.assign(obj, base);
  }
}
function freeze(obj, deep = !1) {
  return isFrozen(obj) || isDraft(obj) || (getArchtype(obj) > 1 && O.defineProperties(obj, {
    set: dontMutateMethodOverride,
    add: dontMutateMethodOverride,
    clear: dontMutateMethodOverride,
    delete: dontMutateMethodOverride
  }), O.freeze(obj), deep && each(
    obj,
    (_key, value) => {
      freeze(value, !0);
    },
    !1
  )), obj;
}
function dontMutateFrozenCollections() {
  die(2);
}
var dontMutateMethodOverride = {
  [VALUE]: dontMutateFrozenCollections
};
function isFrozen(obj) {
  return obj === null || !isObjectish(obj) ? !0 : O.isFrozen(obj);
}
var PluginMapSet = "MapSet", PluginPatches = "Patches", plugins = {};
function getPlugin(pluginKey) {
  let plugin = plugins[pluginKey];
  return plugin || die(0, pluginKey), plugin;
}
var isPluginLoaded = (pluginKey) => !!plugins[pluginKey];
var currentScope, getCurrentScope = () => currentScope, createScope = (parent_, immer_) => ({
  drafts_: [],
  parent_,
  immer_,
  // Whenever the modified draft contains a draft from another scope, we
  // need to prevent auto-freezing so the unowned draft can be finalized.
  canAutoFreeze_: !0,
  unfinalizedDrafts_: 0,
  handledSet_: /* @__PURE__ */ new Set(),
  processedForPatches_: /* @__PURE__ */ new Set(),
  mapSetPlugin_: isPluginLoaded(PluginMapSet) ? getPlugin(PluginMapSet) : void 0
});
function usePatchesInScope(scope, patchListener) {
  patchListener && (scope.patchPlugin_ = getPlugin(PluginPatches), scope.patches_ = [], scope.inversePatches_ = [], scope.patchListener_ = patchListener);
}
function revokeScope(scope) {
  leaveScope(scope), scope.drafts_.forEach(revokeDraft), scope.drafts_ = null;
}
function leaveScope(scope) {
  scope === currentScope && (currentScope = scope.parent_);
}
var enterScope = (immer2) => currentScope = createScope(currentScope, immer2);
function revokeDraft(draft) {
  let state = draft[DRAFT_STATE];
  state.type_ === 0 || state.type_ === 1 ? state.revoke_() : state.revoked_ = !0;
}
function processResult(result, scope) {
  scope.unfinalizedDrafts_ = scope.drafts_.length;
  let baseDraft = scope.drafts_[0];
  if (result !== void 0 && result !== baseDraft) {
    baseDraft[DRAFT_STATE].modified_ && (revokeScope(scope), die(4)), isDraftable(result) && (result = finalize(scope, result));
    let { patchPlugin_ } = scope;
    patchPlugin_ && patchPlugin_.generateReplacementPatches_(
      baseDraft[DRAFT_STATE].base_,
      result,
      scope
    );
  } else
    result = finalize(scope, baseDraft);
  return maybeFreeze(scope, result, !0), revokeScope(scope), scope.patches_ && scope.patchListener_(scope.patches_, scope.inversePatches_), result !== NOTHING ? result : void 0;
}
function finalize(rootScope, value) {
  if (isFrozen(value))
    return value;
  let state = value[DRAFT_STATE];
  if (!state)
    return handleValue(value, rootScope.handledSet_, rootScope);
  if (!isSameScope(state, rootScope))
    return value;
  if (!state.modified_)
    return state.base_;
  if (!state.finalized_) {
    let { callbacks_ } = state;
    if (callbacks_)
      for (; callbacks_.length > 0; )
        callbacks_.pop()(rootScope);
    generatePatchesAndFinalize(state, rootScope);
  }
  return state.copy_;
}
function maybeFreeze(scope, value, deep = !1) {
  !scope.parent_ && scope.immer_.autoFreeze_ && scope.canAutoFreeze_ && freeze(value, deep);
}
function markStateFinalized(state) {
  state.finalized_ = !0, state.scope_.unfinalizedDrafts_--;
}
var isSameScope = (state, rootScope) => state.scope_ === rootScope, EMPTY_LOCATIONS_RESULT = [];
function updateDraftInParent(parent, draftValue, finalizedValue, originalKey) {
  let parentCopy = latest(parent), parentType = parent.type_;
  if (originalKey !== void 0 && get2(parentCopy, originalKey, parentType) === draftValue) {
    set(parentCopy, originalKey, finalizedValue, parentType);
    return;
  }
  if (!parent.draftLocations_) {
    let draftLocations = parent.draftLocations_ = /* @__PURE__ */ new Map();
    each(parentCopy, (key, value) => {
      if (isDraft(value)) {
        let keys2 = draftLocations.get(value) || [];
        keys2.push(key), draftLocations.set(value, keys2);
      }
    });
  }
  let locations = parent.draftLocations_.get(draftValue) ?? EMPTY_LOCATIONS_RESULT;
  for (let location of locations)
    set(parentCopy, location, finalizedValue, parentType);
}
function registerChildFinalizationCallback(parent, child, key) {
  parent.callbacks_.push(function(rootScope) {
    let state = child;
    if (!state || !isSameScope(state, rootScope))
      return;
    rootScope.mapSetPlugin_?.fixSetContents(state);
    let finalizedValue = getFinalValue(state);
    updateDraftInParent(parent, state.draft_ ?? state, finalizedValue, key), generatePatchesAndFinalize(state, rootScope);
  });
}
function generatePatchesAndFinalize(state, rootScope) {
  if (state.modified_ && !state.finalized_ && (state.type_ === 3 || (state.assigned_?.size ?? 0) > 0)) {
    let { patchPlugin_ } = rootScope;
    if (patchPlugin_) {
      let basePath = patchPlugin_.getPath(state);
      basePath && patchPlugin_.generatePatches_(state, basePath, rootScope);
    }
    markStateFinalized(state);
  }
}
function handleCrossReference(target, key, value) {
  let { scope_ } = target;
  if (isDraft(value)) {
    let state = value[DRAFT_STATE];
    isSameScope(state, scope_) && state.callbacks_.push(function() {
      prepareCopy(target);
      let finalizedValue = getFinalValue(state);
      updateDraftInParent(target, value, finalizedValue, key);
    });
  } else isDraftable(value) && target.callbacks_.push(function() {
    let targetCopy = latest(target);
    get2(targetCopy, key, target.type_) === value && scope_.drafts_.length > 1 && (target.assigned_.get(key) ?? !1) === !0 && target.copy_ && handleValue(
      get2(target.copy_, key, target.type_),
      scope_.handledSet_,
      scope_
    );
  });
}
function handleValue(target, handledSet, rootScope) {
  return !rootScope.immer_.autoFreeze_ && rootScope.unfinalizedDrafts_ < 1 || isDraft(target) || handledSet.has(target) || !isDraftable(target) || isFrozen(target) || (handledSet.add(target), each(target, (key, value) => {
    if (isDraft(value)) {
      let state = value[DRAFT_STATE];
      if (isSameScope(state, rootScope)) {
        let updatedValue = getFinalValue(state);
        set(target, key, updatedValue, target.type_), markStateFinalized(state);
      }
    } else isDraftable(value) && handleValue(value, handledSet, rootScope);
  })), target;
}
function createProxyProxy(base, parent) {
  let baseIsArray = isArray3(base), state = {
    type_: baseIsArray ? 1 : 0,
    // Track which produce call this is associated with.
    scope_: parent ? parent.scope_ : getCurrentScope(),
    // True for both shallow and deep changes.
    modified_: !1,
    // Used during finalization.
    finalized_: !1,
    // Track which properties have been assigned (true) or deleted (false).
    // actually instantiated in `prepareCopy()`
    assigned_: void 0,
    // The parent draft state.
    parent_: parent,
    // The base state.
    base_: base,
    // The base proxy.
    draft_: null,
    // set below
    // The base copy with any updated values.
    copy_: null,
    // Called by the `produce` function.
    revoke_: null,
    isManual_: !1,
    // `callbacks` actually gets assigned in `createProxy`
    callbacks_: void 0
  }, target = state, traps = objectTraps;
  baseIsArray && (target = [state], traps = arrayTraps);
  let { revoke, proxy } = Proxy.revocable(target, traps);
  return state.draft_ = proxy, state.revoke_ = revoke, [proxy, state];
}
var objectTraps = {
  get(state, prop) {
    if (prop === DRAFT_STATE)
      return state;
    let source = latest(state);
    if (!has(source, prop, state.type_))
      return readPropFromProto(state, source, prop);
    let value = source[prop];
    if (state.finalized_ || !isDraftable(value))
      return value;
    if (value === peek(state.base_, prop)) {
      prepareCopy(state);
      let childKey = state.type_ === 1 ? +prop : prop, childDraft = createProxy(state.scope_, value, state, childKey);
      return state.copy_[childKey] = childDraft;
    }
    return value;
  },
  has(state, prop) {
    return prop in latest(state);
  },
  ownKeys(state) {
    return Reflect.ownKeys(latest(state));
  },
  set(state, prop, value) {
    let desc = getDescriptorFromProto(latest(state), prop);
    if (desc?.set)
      return desc.set.call(state.draft_, value), !0;
    if (!state.modified_) {
      let current2 = peek(latest(state), prop), currentState = current2?.[DRAFT_STATE];
      if (currentState && currentState.base_ === value)
        return state.copy_[prop] = value, state.assigned_.set(prop, !1), !0;
      if (is(value, current2) && (value !== void 0 || has(state.base_, prop, state.type_)))
        return !0;
      prepareCopy(state), markChanged(state);
    }
    return state.copy_[prop] === value && // special case: handle new props with value 'undefined'
    (value !== void 0 || prop in state.copy_) || // special case: NaN
    Number.isNaN(value) && Number.isNaN(state.copy_[prop]) || (state.copy_[prop] = value, state.assigned_.set(prop, !0), handleCrossReference(state, prop, value)), !0;
  },
  deleteProperty(state, prop) {
    return prepareCopy(state), peek(state.base_, prop) !== void 0 || prop in state.base_ ? (state.assigned_.set(prop, !1), markChanged(state)) : state.assigned_.delete(prop), state.copy_ && delete state.copy_[prop], !0;
  },
  // Note: We never coerce `desc.value` into an Immer draft, because we can't make
  // the same guarantee in ES5 mode.
  getOwnPropertyDescriptor(state, prop) {
    let owner = latest(state), desc = Reflect.getOwnPropertyDescriptor(owner, prop);
    return desc && {
      [WRITABLE]: !0,
      [CONFIGURABLE]: state.type_ !== 1 || prop !== "length",
      [ENUMERABLE]: desc[ENUMERABLE],
      [VALUE]: owner[prop]
    };
  },
  defineProperty() {
    die(11);
  },
  getPrototypeOf(state) {
    return getPrototypeOf(state.base_);
  },
  setPrototypeOf() {
    die(12);
  }
}, arrayTraps = {};
each(objectTraps, (key, fn) => {
  arrayTraps[key] = function() {
    let args = arguments;
    return args[0] = args[0][0], fn.apply(this, args);
  };
});
arrayTraps.deleteProperty = function(state, prop) {
  return isNaN(parseInt(prop)) && die(13), arrayTraps.set.call(this, state, prop, void 0);
};
arrayTraps.set = function(state, prop, value) {
  return prop !== "length" && isNaN(parseInt(prop)) && die(14), objectTraps.set.call(this, state[0], prop, value, state[0]);
};
function peek(draft, prop) {
  let state = draft[DRAFT_STATE];
  return (state ? latest(state) : draft)[prop];
}
function readPropFromProto(state, source, prop) {
  let desc = getDescriptorFromProto(source, prop);
  return desc ? VALUE in desc ? desc[VALUE] : (
    // This is a very special case, if the prop is a getter defined by the
    // prototype, we should invoke it with the draft as context!
    desc.get?.call(state.draft_)
  ) : void 0;
}
function getDescriptorFromProto(source, prop) {
  if (!(prop in source))
    return;
  let proto = getPrototypeOf(source);
  for (; proto; ) {
    let desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (desc)
      return desc;
    proto = getPrototypeOf(proto);
  }
}
function markChanged(state) {
  state.modified_ || (state.modified_ = !0, state.parent_ && markChanged(state.parent_));
}
function prepareCopy(state) {
  state.copy_ || (state.assigned_ = /* @__PURE__ */ new Map(), state.copy_ = shallowCopy(
    state.base_,
    state.scope_.immer_.useStrictShallowCopy_
  ));
}
var Immer2 = class {
  constructor(config) {
    this.autoFreeze_ = !0, this.useStrictShallowCopy_ = !1, this.useStrictIteration_ = !1, this.produce = (base, recipe, patchListener) => {
      if (isFunction2(base) && !isFunction2(recipe)) {
        let defaultBase = recipe;
        recipe = base;
        let self2 = this;
        return function(base2 = defaultBase, ...args) {
          return self2.produce(base2, (draft) => recipe.call(this, draft, ...args));
        };
      }
      isFunction2(recipe) || die(6), patchListener !== void 0 && !isFunction2(patchListener) && die(7);
      let result;
      if (isDraftable(base)) {
        let scope = enterScope(this), proxy = createProxy(scope, base, void 0), hasError = !0;
        try {
          result = recipe(proxy), hasError = !1;
        } finally {
          hasError ? revokeScope(scope) : leaveScope(scope);
        }
        return usePatchesInScope(scope, patchListener), processResult(result, scope);
      } else if (!base || !isObjectish(base)) {
        if (result = recipe(base), result === void 0 && (result = base), result === NOTHING && (result = void 0), this.autoFreeze_ && freeze(result, !0), patchListener) {
          let p = [], ip = [];
          getPlugin(PluginPatches).generateReplacementPatches_(base, result, {
            patches_: p,
            inversePatches_: ip
          }), patchListener(p, ip);
        }
        return result;
      } else
        die(1, base);
    }, this.produceWithPatches = (base, recipe) => {
      if (isFunction2(base))
        return (state, ...args) => this.produceWithPatches(state, (draft) => base(draft, ...args));
      let patches, inversePatches;
      return [this.produce(base, recipe, (p, ip) => {
        patches = p, inversePatches = ip;
      }), patches, inversePatches];
    }, isBoolean(config?.autoFreeze) && this.setAutoFreeze(config.autoFreeze), isBoolean(config?.useStrictShallowCopy) && this.setUseStrictShallowCopy(config.useStrictShallowCopy), isBoolean(config?.useStrictIteration) && this.setUseStrictIteration(config.useStrictIteration);
  }
  createDraft(base) {
    isDraftable(base) || die(8), isDraft(base) && (base = current(base));
    let scope = enterScope(this), proxy = createProxy(scope, base, void 0);
    return proxy[DRAFT_STATE].isManual_ = !0, leaveScope(scope), proxy;
  }
  finishDraft(draft, patchListener) {
    let state = draft && draft[DRAFT_STATE];
    (!state || !state.isManual_) && die(9);
    let { scope_: scope } = state;
    return usePatchesInScope(scope, patchListener), processResult(void 0, scope);
  }
  /**
   * Pass true to automatically freeze all copies created by Immer.
   *
   * By default, auto-freezing is enabled.
   */
  setAutoFreeze(value) {
    this.autoFreeze_ = value;
  }
  /**
   * Pass true to enable strict shallow copy.
   *
   * By default, immer does not copy the object descriptors such as getter, setter and non-enumrable properties.
   */
  setUseStrictShallowCopy(value) {
    this.useStrictShallowCopy_ = value;
  }
  /**
   * Pass false to use faster iteration that skips non-enumerable properties
   * but still handles symbols for compatibility.
   *
   * By default, strict iteration is enabled (includes all own properties).
   */
  setUseStrictIteration(value) {
    this.useStrictIteration_ = value;
  }
  shouldUseStrictIteration() {
    return this.useStrictIteration_;
  }
  applyPatches(base, patches) {
    let i;
    for (i = patches.length - 1; i >= 0; i--) {
      let patch = patches[i];
      if (patch.path.length === 0 && patch.op === "replace") {
        base = patch.value;
        break;
      }
    }
    i > -1 && (patches = patches.slice(i + 1));
    let applyPatchesImpl = getPlugin(PluginPatches).applyPatches_;
    return isDraft(base) ? applyPatchesImpl(base, patches) : this.produce(
      base,
      (draft) => applyPatchesImpl(draft, patches)
    );
  }
};
function createProxy(rootScope, value, parent, key) {
  let [draft, state] = isMap(value) ? getPlugin(PluginMapSet).proxyMap_(value, parent) : isSet(value) ? getPlugin(PluginMapSet).proxySet_(value, parent) : createProxyProxy(value, parent);
  return (parent?.scope_ ?? getCurrentScope()).drafts_.push(draft), state.callbacks_ = parent?.callbacks_ ?? [], state.key_ = key, parent && key !== void 0 ? registerChildFinalizationCallback(parent, state, key) : state.callbacks_.push(function(rootScope2) {
    rootScope2.mapSetPlugin_?.fixSetContents(state);
    let { patchPlugin_ } = rootScope2;
    state.modified_ && patchPlugin_ && patchPlugin_.generatePatches_(state, [], rootScope2);
  }), draft;
}
function current(value) {
  return isDraft(value) || die(10, value), currentImpl(value);
}
function currentImpl(value) {
  if (!isDraftable(value) || isFrozen(value))
    return value;
  let state = value[DRAFT_STATE], copy, strict = !0;
  if (state) {
    if (!state.modified_)
      return state.base_;
    state.finalized_ = !0, copy = shallowCopy(value, state.scope_.immer_.useStrictShallowCopy_), strict = state.scope_.immer_.shouldUseStrictIteration();
  } else
    copy = shallowCopy(value, !0);
  return each(
    copy,
    (key, childValue) => {
      set(copy, key, currentImpl(childValue));
    },
    strict
  ), state && (state.finalized_ = !1), copy;
}
var immer = new Immer2(), produce = immer.produce;

// src/amb.ts
var AmbError = class extends Error {
  constructor(optionsLength) {
    super("AmbError");
    this.optionsLength = optionsLength;
  }
  optionsLength;
}, FailError = class extends Error {
  constructor() {
    super("FailError");
  }
}, currentPath = [], currentAmbIndex = 0;
function amb(options) {
  let myIndex = currentAmbIndex++;
  if (myIndex < currentPath.length)
    return options[currentPath[myIndex]];
  throw new AmbError(options.length);
}
function generateAmb(fn) {
  return generateAmbHelper(fn, []);
}
function* generateAmbHelper(fn, path2) {
  try {
    currentPath = path2, currentAmbIndex = 0, yield fn();
  } catch (error) {
    if (error instanceof AmbError)
      for (let i = 0; i < error.optionsLength; i++)
        yield* generateAmbHelper(fn, [...path2, i]);
    else {
      if (error instanceof FailError)
        return;
      throw error;
    }
  }
}
function runAmb(fn) {
  return [...generateAmb(fn)];
}
function fail() {
  throw new FailError();
}
function require2(condition) {
  condition || fail();
}
function produceAmb(base, recipe) {
  return runAmb(() => produce(base, recipe));
}
export {
  Box,
  DefaultValueView,
  DistanceLine,
  DraggableRenderer,
  Modifier,
  Operator,
  OutputThumbnail,
  OverlayVis,
  Slot,
  StateThumbnails,
  ValueView,
  ValueViewProvider,
  Vec2,
  amb,
  and,
  dragSpecToBehavior,
  draggableLine,
  fail,
  getElementPosition,
  getElementPositionCheap,
  inOrder,
  lessThan,
  modifier,
  moreThan,
  operator,
  param,
  path,
  produceAmb,
  renderStateReadOnly,
  require2 as require,
  resolveDragSpecLike,
  rotateDeg,
  rotateRad,
  runAmb,
  scale2 as scale,
  translate
};
/*! Bundled license information:

lodash-es/lodash.js:
  (**
   * @license
   * Lodash (Custom Build) <https://lodash.com/>
   * Build: `lodash modularize exports="es" --repo lodash/lodash#4.18.1 -o ./`
   * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
   * Released under MIT license <https://lodash.com/license>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   *)
*/
