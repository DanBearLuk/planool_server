const Config = {
    CLIENT_URL: 'localhost:3000',
    CLIENT_PORT: process.env.CLIENT_PORT || 3000,
    SERVER_PORT: process.env.SERVER_PORT || 2700,
    DB: {
        USERNAME: 'admin',
        PASSWORD: encodeURIComponent('UxBR2cXoq4W3C0ON'),
        ADDRESS: 'planool.qtanxeq.mongodb.net'
    }
};

module.exports = Config;
