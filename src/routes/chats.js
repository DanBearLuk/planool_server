const { db } = require('../db');
const { attachUser, attachChat } = require('../middlewares/httpMiddlewares');

const { 
    attachUserToSocket, 
    attachChatToSocket
} = require('../middlewares/socketMiddlewares');

const {
    SocketRouter
} = require('../socketManager');

const express = require('express');
const rateLimiter = require('express-rate-limit');
const bodyParser = require('body-parser');

const router = express.Router();
const socketRouter = new SocketRouter();

const limit = (period, amount) => rateLimiter({
    windowMs: period,
    max: amount,
    standardHeaders: true,
    legacyHeaders: false
});

const { 
    createPrivateChat, 
    sendMessage 
} = require('../handlers/chats');

//router.use('/createPrivate/:companionId', limit(60 * 1000, 1));
router.use('/createPrivate/:companionId', attachUser(db));
router.post('/createPrivate/:companionId', createPrivateChat);

socketRouter.use('/sendMessage', attachUserToSocket(db));
socketRouter.use('/sendMessage', attachChatToSocket(db));
socketRouter.use('/sendMessage', sendMessage);

module.exports = {
    router,
    socketRouter
};
