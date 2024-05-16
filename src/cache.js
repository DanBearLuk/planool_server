const NodeCache = require('node-cache');

class Cache {
    constructor(categories, options = null) {
        if (!options) {
            options = {
                stdTTL: 600,
                checkperiod: 300,
                useClones: false
            };
        }

        this._caches = {};

        for (let category of categories) {
            this._caches[category.toString()] = new NodeCache(options);
        }
    }

    get(category, key) {
        this._caches[category.toString()].get(key);
    }

    set(category, key, value, ttl = undefined) {
        this._caches[category.toString()].set(key, value, ttl);
    }

    has(category, key) {
        this._caches[category.toString()].has(key);
    }

    del(category, key) {
        this._caches[category.toString()].del(key);
    }

    ttl(category, key, ttl) {
        this._caches[category.toString()].ttl(key, ttl);
    }

    on(category, eventName, callback) {
        this._caches[category.toString()].on(eventName, callback);
    }
}

module.exports = Cache;
