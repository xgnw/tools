(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["@abraham/reflection"] = {}));
})(this, (function (exports) { 'use strict';

    const Metadata = new WeakMap();
    function isObject(value) {
        return ((typeof value === 'object' && value !== null) || typeof value === 'function');
    }
    function isPropertyKey(value) {
        return typeof value === 'string' || typeof value === 'symbol';
    }
    function toPropertyKey(value) {
        return typeof value === 'symbol' ? value : String(value);
    }
    function decorateProperty(decorators, target, propertyKey, descriptor) {
        let result = descriptor;
        for (const decorator of [...decorators].reverse()) {
            const decorated = decorator.call(null, target, propertyKey, result);
            if (isObject(decorated)) {
                result = decorated;
            }
            else if (decorated !== undefined) {
                throw new TypeError();
            }
        }
        return result;
    }
    function decorateConstructor(decorators, target) {
        let result = target;
        for (const decorator of [...decorators].reverse()) {
            const decorated = decorator.call(null, result);
            if (typeof decorated === 'function') {
                result = decorated;
            }
            else if (decorated !== undefined) {
                throw new TypeError();
            }
        }
        return result;
    }
    function decorate(decorators, target, propertyKey, attributes) {
        if (!Array.isArray(decorators) ||
            !isObject(target) ||
            (attributes !== undefined && !isObject(attributes)) ||
            !decorators.every(isObject)) {
            throw new TypeError();
        }
        if (propertyKey === undefined && attributes === undefined) {
            if (typeof target !== 'function') {
                throw new TypeError();
            }
            return decorateConstructor(decorators, target);
        }
        return decorateProperty(decorators, target, toPropertyKey(propertyKey), attributes);
    }
    function getMetadataMap(target, propertyKey) {
        return Metadata.get(target)?.get(propertyKey);
    }
    function ordinaryGetOwnMetadata(metadataKey, target, propertyKey) {
        return getMetadataMap(target, propertyKey)?.get(metadataKey);
    }
    function createMetadataMap(target, propertyKey) {
        const targetMetadata = Metadata.get(target) ||
            new Map();
        Metadata.set(target, targetMetadata);
        const metadataMap = targetMetadata.get(propertyKey) || new Map();
        targetMetadata.set(propertyKey, metadataMap);
        return metadataMap;
    }
    function ordinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey) {
        (getMetadataMap(target, propertyKey) ||
            createMetadataMap(target, propertyKey)).set(metadataKey, metadataValue);
    }
    function ordinaryHasOwnMetadata(metadataKey, target, propertyKey) {
        const metadataMap = getMetadataMap(target, propertyKey);
        return !!metadataMap && metadataMap.has(metadataKey);
    }
    function ordinaryHasMetadata(metadataKey, target, propertyKey) {
        if (ordinaryHasOwnMetadata(metadataKey, target, propertyKey)) {
            return true;
        }
        const parent = Object.getPrototypeOf(target);
        return (parent !== null && ordinaryHasMetadata(metadataKey, parent, propertyKey));
    }
    function ordinaryGetMetadata(metadataKey, target, propertyKey) {
        if (ordinaryHasOwnMetadata(metadataKey, target, propertyKey)) {
            return ordinaryGetOwnMetadata(metadataKey, target, propertyKey);
        }
        const parent = Object.getPrototypeOf(target);
        return parent !== null
            ? ordinaryGetMetadata(metadataKey, parent, propertyKey)
            : undefined;
    }
    function ordinaryOwnMetadataKeys(target, propertyKey) {
        return [...(getMetadataMap(target, propertyKey)?.keys() ?? [])];
    }
    function ordinaryMetadataKeys(target, propertyKey) {
        const ownKeys = ordinaryOwnMetadataKeys(target, propertyKey);
        const parent = Object.getPrototypeOf(target);
        if (parent === null) {
            return ownKeys;
        }
        const parentKeys = ordinaryMetadataKeys(parent, propertyKey);
        return [...new Set([...ownKeys, ...parentKeys])];
    }
    function metadata(metadataKey, metadataValue) {
        return function decorator(target, propertyKey) {
            defineMetadata(metadataKey, metadataValue, target, propertyKey);
        };
    }
    function getMetadata(metadataKey, target, propertyKey) {
        if (!isObject(target)) {
            throw new TypeError();
        }
        return ordinaryGetMetadata(metadataKey, target, propertyKey);
    }
    function getOwnMetadata(metadataKey, target, propertyKey) {
        if (!isObject(target)) {
            throw new TypeError();
        }
        return ordinaryGetOwnMetadata(metadataKey, target, propertyKey);
    }
    function hasOwnMetadata(metadataKey, target, propertyKey) {
        if (!isObject(target)) {
            throw new TypeError();
        }
        return ordinaryHasOwnMetadata(metadataKey, target, propertyKey);
    }
    function hasMetadata(metadataKey, target, propertyKey) {
        if (!isObject(target)) {
            throw new TypeError();
        }
        return ordinaryHasMetadata(metadataKey, target, propertyKey);
    }
    function defineMetadata(metadataKey, metadataValue, target, propertyKey) {
        if (!isObject(target) ||
            (propertyKey !== undefined && !isPropertyKey(propertyKey))) {
            throw new TypeError();
        }
        ordinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
    }
    function getMetadataKeys(target, propertyKey) {
        if (!isObject(target)) {
            throw new TypeError();
        }
        return ordinaryMetadataKeys(target, propertyKey);
    }
    function getOwnMetadataKeys(target, propertyKey) {
        if (!isObject(target)) {
            throw new TypeError();
        }
        return ordinaryOwnMetadataKeys(target, propertyKey);
    }
    function deleteMetadata(metadataKey, target, propertyKey) {
        if (!isObject(target)) {
            throw new TypeError();
        }
        return getMetadataMap(target, propertyKey)?.delete(metadataKey) ?? false;
    }
    const Reflection = {
        decorate,
        defineMetadata,
        deleteMetadata,
        getMetadata,
        getMetadataKeys,
        getOwnMetadata,
        getOwnMetadataKeys,
        hasMetadata,
        hasOwnMetadata,
        metadata,
    };
    Object.assign(Reflect, Reflection);

    exports.Reflection = Reflection;
    exports.decorate = decorate;
    exports.defineMetadata = defineMetadata;
    exports.deleteMetadata = deleteMetadata;
    exports.getMetadata = getMetadata;
    exports.getMetadataKeys = getMetadataKeys;
    exports.getOwnMetadata = getOwnMetadata;
    exports.getOwnMetadataKeys = getOwnMetadataKeys;
    exports.hasMetadata = hasMetadata;
    exports.hasOwnMetadata = hasOwnMetadata;
    exports.metadata = metadata;

}));
