const Config = require('../config').default;
const Database = require('./db').default;
const reg_cleanup = require('./cleanup').reg_cleanup;

const express = require('express');
const cors = require('cors');
const rateLimiter = require('express-rate-limit');
const validator = require('validator');
const bodyParser = require('body-parser');

const corsOptions = {
    origin: Config.CLIENT_URL,
    credentials: true,
    optionsSuccessStatus: 200
}

const limit = (period, amount) => rateLimiter({
    windowMs: period,
    max: amount,
    standardHeaders: true,
    legacyHeaders: false
});

const app = express();

app.use(cors(corsOptions));
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

app.use('/api/users/register', limit(3 * 60 * 1000, 5));
app.use('/api/users/register', bodyParser.json());
app.post('/api/users/register', async (req, res) => {
    if (!req.body || !req.body.username || !req.body.password) {
        return res.status(400).json({
          message: 'Bad request'
        });
    }

    const username = req.body.username.toString();
    const password = req.body.password.toString();

    const isUsernameValid = 
        validator.isAlphanumeric(username, 'en-US', { ignore: ' -_' }) && 
        validator.isLength(username, { min: 3, max: 16 });

    const isPasswordValid = 
        validator.isStrongPassword(password) &&
        validator.isLength(password, { min: 8, max: 24 });

    if (!isUsernameValid || !isPasswordValid) {
        return res.status(400).json({
            message: 'Invalid fields'
        });   
    }

    try {
        const record = await db.addUserRecord(username, password);

        return res.status(200).json({
            user: record
        })
    } catch (e) {
        if (e.message === 'User already exists') {
            return res.status(409).json({
                message: 'User already exists'
            });  
        }

        return res.status(500).json({
            message: 'Internal error'
        });  
    }
});

app.listen(Config.SERVER_PORT);
console.log('Server started');
