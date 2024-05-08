const { db } = require('../db');
const { attachUserToSocket } = require('../middlewares/socketMiddlewares');

const { SocketRouter } = require('../socketManager');

const socketRouter = new SocketRouter();

const {
    hideNotification
} = require('../handlers/notifications');

socketRouter.use('/hide', attachUserToSocket(db));
socketRouter.use('/hide', hideNotification);

module.exports = {
    socketRouter
};
