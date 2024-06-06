const Config = require('../config');

const express = require('express');
const wsInit = require('express-ws');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { db } = require('./db');
const { socketManager } = require('./socketManager');
const PlanEditorManager = require('./planEditorManager');

const corsOptions = {
    origin: Config.CLIENT_URL,
    credentials: true,
    optionsSuccessStatus: 200
};

const app = express();
const ws = wsInit(app);
const planEditorManager = new PlanEditorManager(socketManager, db);

app.use(cors(corsOptions));
app.use(cookieParser());
app.use('/public', express.static('public', { maxAge: 31557600 }));

app.use('/api/users', require('./routes/users').router);
app.use('/api/plans', require('./routes/plans').router);
app.use('/api/chats', require('./routes/chats').router);
app.use('/api/friends', require('./routes/friends').router);

socketManager.use('/chats', require('./routes/chats').socketRouter);
socketManager.use('/notifications', require('./routes/notifications').socketRouter);

app.ws('/socket', (socket, req) => socketManager.onConnection(socket, req));

const server = app.listen(Config.SERVER_PORT, '127.0.0.1', () => {
    const address = server.address().address;
    const port = server.address().port;

    console.log(`Server listening at http://${address}:${port}`);
});
