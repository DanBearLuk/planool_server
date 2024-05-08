const { db } = require('../db');
const { attachUser } = require('../middlewares/httpMiddlewares');

const express = require('express');
const rateLimiter = require('express-rate-limit');
const bodyParser = require('body-parser');

const router = express.Router();

const limit = (period, amount) => rateLimiter({
    windowMs: period,
    max: amount,
    standardHeaders: true,
    legacyHeaders: false
});

const { 
    updateUserInfo, 
    registerUser, 
    loginUser,
    isUsernameAvailable,
    reloginUser
} = require('../handlers/users');

//router.use('/register', limit(3 * 60 * 1000, 5));
router.use('/register', bodyParser.json());
router.post('/register', registerUser);

//router.use('/login', limit(3 * 60 * 1000, 5));
router.use('/login', bodyParser.json());
router.post('/login', loginUser);

//router.use('/relogin', limit(30 * 1000, 5));
router.use('/relogin', attachUser(db));
router.get('/relogin', reloginUser);

//router.use('/isUsernameAvailable', limit(2 * 60 * 1000, 1));
router.use('/isUsernameAvailable', bodyParser.json());
router.post('/isUsernameAvailable', isUsernameAvailable);

//router.use('/updateInfo', limit(5 * 60 * 1000, 1));
router.use('/updateInfo', attachUser(db));
router.use('/updateInfo', bodyParser.json());
router.put('/updateInfo', updateUserInfo);

module.exports = {
    router
};
