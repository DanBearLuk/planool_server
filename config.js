const Config = {
    CLIENT_URL: 'http://localhost:9000',
    CLIENT_PORT: process.env.CLIENT_PORT || 3000,
    SERVER_PORT: process.env.SERVER_PORT || 2700,
    SOCKET_PORT: process.env.SOCKET_PORT || 5000,
    DB: {
        USERNAME: 'admin',
        PASSWORD: encodeURIComponent('clTHezxZXOVSgkOj'),
        ADDRESS: 'planool.qtanxeq.mongodb.net'
    }
};

module.exports = Config;
