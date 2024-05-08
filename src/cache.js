const NodeCache = require('node-cache');

class Cache {
    constructor(...categories) {
        const options = {
            stdTTL: 600,
            checkperiod: 300,
            useClones: false
        };

        this._caches = {};

        for (let category of categories) {
            this._caches[category.toString()] = new NodeCache(options);
        }
    }

    get(category, key) {
        this._caches[category.toString()].get(key);
    }

    set(category, key, value) {
        this._caches[category.toString()].set(key, value);
    }

    has(category, key) {
        this._caches[category.toString()].has(key);
    }

    del(category, key) {
        this._caches[category.toString()].del(key);
    }
}

module.exports = Cache;
