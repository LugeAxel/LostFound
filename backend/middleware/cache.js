const mcache = require('memory-cache');

const cache = (durationSeconds) => {
    return (req, res, next) => {
        const key = '__express__' + (req.originalUrl || req.url);
        const cachedBody = mcache.get(key);
        if (cachedBody) {
            return res.json(cachedBody);
        }
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                mcache.put(key, body, durationSeconds * 1000);
            }
            originalJson(body);
        };
        next();
    };
};

const invalidateCache = (pattern) => {
    const keys = mcache.keys();
    keys.forEach(key => {
        if (key.includes(pattern)) {
            mcache.del(key);
        }
    });
};

module.exports = { cache, invalidateCache };
