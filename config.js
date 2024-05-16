const Config = Object.freeze({
    CLIENT_URL: 'http://localhost:9000',
    CLIENT_PORT: process.env.CLIENT_PORT || 3000,
    SERVER_PORT: process.env.SERVER_PORT || 2700,
    SOCKET_PORT: process.env.SOCKET_PORT || 5000,
    DB: {
        ADDRESS: 'mongodb://127.0.0.1:27017/?retryWrites=true&w=majority'
    }
});

module.exports = Config;
