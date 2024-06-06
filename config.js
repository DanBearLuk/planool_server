const Config = Object.freeze({
    CLIENT_URL: 'http://localhost:3000',
    SERVER_ADDRESS: 'http://localhost',
    SERVER_PORT: process.env.SERVER_PORT || 2700,
    DB: {
        ADDRESS: 'mongodb://127.0.0.1:27017/?retryWrites=true&w=majority'
    }
});

module.exports = Config;
