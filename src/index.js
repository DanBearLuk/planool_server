const Config = require('../config').default;
const Database = require('./db').default;
const validator = require('./validate');
const reg_cleanup = require('./cleanup').reg_cleanup;
const { createJWT } = require('./jwt');
const { attachUser } = require('./middlewares');

const express = require('express');
const cors = require('cors');
const rateLimiter = require('express-rate-limit');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

const corsOptions = {
    origin: Config.CLIENT_URL,
    credentials: true,
    optionsSuccessStatus: 200
};

const limit = (period, amount) => rateLimiter({
    windowMs: period,
    max: amount,
    standardHeaders: true,
    legacyHeaders: false
});

const app = express();

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.static('public', { maxAge: 31557600 }));

const db = new Database(Config.DB.ADDRESS, Config.DB.USERNAME, Config.DB.PASSWORD);

db.run().then(() => {
    console.log('MongoDB connected');

    reg_cleanup(db);
}).catch(e => {
    db.close();

    console.error('MongoDB connection error');
    console.dir(e);
});

//app.use('/api/users/register', limit(3 * 60 * 1000, 5));
app.use('/api/users/register', bodyParser.json());
app.post('/api/users/register', async (req, res) => {
    if (!req.body || !req.body.username || !req.body.password) {
        return res.status(400).json({
          message: 'Bad request'
        });
    }

    const username = req.body.username.toString();
    const password = req.body.password.toString();

    if (!validator.validateUserInfo({ username, password })) {
        return res.status(401).json({
            message: 'Invalid username or password'
        });   
    }

    try {
        const record = await db.addUserRecord(username, password);

        delete record.password;
        return res.status(200).json({
            user: record
        });
    } catch (e) {
        if (e.message === 'User already exists') {
            return res.status(409).json({
                message: 'User already exists'
            });  
        }

        console.error(e);

        return res.status(500).json({
            message: 'Internal error'
        });  
    }
});

//app.use('/api/users/login', limit(3 * 60 * 1000, 5));
app.use('/api/users/login', bodyParser.json());
app.post('/api/users/login', async (req, res) => {
    if (!req.body || !req.body.username || !req.body.password) {
        return res.status(400).json({
          message: 'Bad request'
        });
    }

    const username = req.body.username.toString();
    const password = req.body.password.toString();

    if (!validator.validateUserInfo({ username, password })) {
        return res.status(401).json({
            message: 'Invalid username or password'
        });   
    }

    try {
        const record = await db.findUserRecord(username);

        if (!record) {
            return res.status(401).json({
                message: 'User not found'
            });
        }

        if (!await bcrypt.compare(password, record.password)) {
            return res.status(401).json({
                message: 'Password is incorrect'
            });            
        }

        delete record.password;

        const token = await createJWT({ 
            id: record.id
        }, '168h');

        res.cookie('token', token, { maxAge: 2592000000, httpOnly: true });
        return res.status(200).json({
            user: record
        });
    } catch (e) {
        console.error(e);

        return res.status(500).json({
            message: 'Internal error'
        });  
    }
});

//app.use('/api/users/relogin', limit(30 * 1000, 5));
app.use('/api/users/relogin', attachUser(db));
app.get('/api/users/relogin', async (req, res) => {
    try {
        const token = await createJWT({ 
            id: req.user.id
        }, '168h');

        delete req.user.password;

        res.cookie('token', token, { maxAge: 2592000000, httpOnly: true });
        return res.status(200).json({
            user: req.user
        });
    } catch (e) {
        console.error(e);

        return res.status(500).json({
            message: 'Internal error'
        });
    }
});

//app.use('/api/users/isUsernameAvailable', limit(2 * 60 * 1000, 1));
app.use('/api/users/isUsernameAvailable', bodyParser.json());
app.post('/api/users/isUsernameAvailable', async (req, res) => {
    if (!req.body || !req.body.username) {
        return res.status(400).json({
          message: 'Bad request'
        });
    }

    if (!validator.validateUserInfo({ username: req.body.username })) {
        return res.status(400).json({
            message: 'Invalid username'
        });
    }

    try {
        const result = await db.findUserRecord(req.body.username);

        return res.status(200).json({
            isAvailable: !result
        });
    } catch (e) {
        console.error(e);

        return res.status(500).json({
            message: 'Internal error'
        });          
    }
});

//app.use('/api/users/updateInfo', limit(5 * 60 * 1000, 1));
app.use('/api/users/updateInfo', attachUser(db));
app.use('/api/users/updateInfo', bodyParser.json());
app.post('/api/users/updateInfo', async (req, res) => {
    if (!req.body || !req.body.new) {
        return res.status(400).json({
          message: 'Bad request'
        });
    }

    if (!validator.validateUserInfo(req.body.new)) {
        return res.status(400).json({
            message: 'Invalid user info'
        });
    }

    if (req.body.new.password) {
        if (!req.body.old || !req.body.old.password || typeof(req.body.old.password) !== 'string') {
            return res.status(401).json({
              message: 'Old password is missing'
            });
        }

        if (!await bcrypt.compare(req.body.old.password, req.user.password)) {
            return res.status(401).json({
                message: 'Old password is incorrect'
            });            
        }
    }

    try {
        const record = await db.updateUserRecord(req.user.id, req.body.new);

        delete record.password;
        return res.status(200).json({
            user: record
        });
    } catch (e) {
        if (e.message === 'Username is already taken') {
            return res.status(409).json({
                message: 'Username is already taken'
            });  
        } else if (e.message === 'User not found') {
            return res.status(409).json({
                message: 'User not found'
            });  
        }

        console.error(e);

        return res.status(500).json({
            message: 'Internal error'
        });  
    }
});



app.listen(Config.SERVER_PORT);
console.log('Server started');