const Config = require('../config');

const express = require('express');
const wsInit = require('express-ws');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const socketManager = require('./socketManager');

const corsOptions = {
    origin: Config.CLIENT_URL,
    credentials: true,
    optionsSuccessStatus: 200
};

const app = express();
const ws = wsInit(app);

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.static('public', { maxAge: 31557600 }));

app.use('/api/users', require('./routes/users'));
app.use('/api/plans', require('./routes/plans'));

app.ws('/socket', (socket, req) => socketManager.onConnection(socket, req));

const server = app.listen(Config.SERVER_PORT, '127.0.0.1', () => {
    const address = server.address().address;
    const port = server.address().port;

    console.log(`Server listening at http://${address}:${port}`);
});
