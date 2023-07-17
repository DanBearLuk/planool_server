const Config = {
    CLIENT_PORT: process.env.CLIENT_PORT || 3000,
    API_SERVER_PORT: process.env.SERVER_PORT || 2700,
    DB: {
        USERNAME: 'admin',
        PASSWORD: encodeURIComponent('UxBR2cXoq4W3C0ON'),
        ADDRESS: 'planool.qtanxeq.mongodb.net'
    }
};

module.exports = { default: Config };
