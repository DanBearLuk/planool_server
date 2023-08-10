const Config = require('../config');
const db = require('./db');
const validator = require('./validate');
const ers = require('./errorHandlers');
const { attachUser } = require('./middlewares');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const corsOptions = {
    origin: Config.CLIENT_URL,
    credentials: true,
    optionsSuccessStatus: 200
};

const app = express();

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.static('public', { maxAge: 31557600 }));

app.use('/api/users', require('./routes/users'));

const server = app.listen(Config.SERVER_PORT, '127.0.0.1', () => {
    const address = server.address().address;
    const port = server.address().port;

    console.log(`Server listening at http://${address}:${port}`);
});
