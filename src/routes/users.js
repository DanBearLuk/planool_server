const validator = require('../validate');
const ers = require('../errorHandlers');
const socketManager = require('../socketManager');
const { db } = require('../db');
const { attachUser } = require('../middlewares');
const { createJWT } = require('../jwt');

const express = require('express');
const rateLimiter = require('express-rate-limit');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const router = express.Router();

const limit = (period, amount) => rateLimiter({
    windowMs: period,
    max: amount,
    standardHeaders: true,
    legacyHeaders: false
});

//router.use('/register', limit(3 * 60 * 1000, 5));
router.use('/register', bodyParser.json());
router.post('/register', async (req, res) => {
    const body = req.body;

    if (!body || !body.username || !body.password) {
        return ers.handleBadRequestError(res);
    }

    try {
        validator.validateUserInfo(body)
    } catch (e) {
        return ers.handleForbiddenError(res, e.message);
    }

    try {
        const record = await db.addUserRecord(body.username, body.password);

        delete record.password;
        return res.status(200).json({
            user: record
        });
    } catch (e) {
        if (e.message === 'User already exists') {
            return ers.handleConflictError(res, e.message);
        }

        return ers.handleInternalError(res, e);
    }
});

//router.use('/login', limit(3 * 60 * 1000, 5));
router.use('/login', bodyParser.json());
router.post('/login', async (req, res) => {
    const body = req.body;

    if (!body || !body.username || !body.password) {
        return ers.handleBadRequestError(res);
    }

    try {
        validator.validateUserInfo(body)
    } catch (e) {
        return ers.handleForbiddenError(res, e.message);
    }

    try {
        const record = await db.findUserRecord({ username: body.username });

        if (!record) {
            return ers.handleForbiddenError(res, 'Username is incorrect');
        }

        if (!await bcrypt.compare(body.password, record.password)) {
            return ers.handleForbiddenError(res, 'Password is incorrect');
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
        return ers.handleInternalError(res, e);
    }
});

//router.use('/relogin', limit(30 * 1000, 5));
router.use('/relogin', attachUser(db));
router.get('/relogin', async (req, res) => {
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
        return ers.handleInternalError(res, e);
    }
});

//router.use('/isUsernameAvailable', limit(2 * 60 * 1000, 1));
router.use('/isUsernameAvailable', bodyParser.json());
router.post('/isUsernameAvailable', async (req, res) => {
    const body = req.body;

    if (!body || !body.username) {
        return ers.handleBadRequestError(res);
    }

    try {
        validator.validateUserInfo({ username: body.username })
    } catch (e) {
        return ers.handleBadRequestError(res, e.message);
    }

    try {
        const result = await db.findUserRecord({ username: body.username });

        return res.status(200).json({
            isAvailable: !result
        });
    } catch (e) {
        return ers.handleInternalError(res, e);       
    }
});

//router.use('/updateInfo', limit(5 * 60 * 1000, 1));
router.use('/updateInfo', attachUser(db));
router.use('/updateInfo', bodyParser.json());
router.put('/updateInfo', async (req, res) => {
    const body = req.body;

    if (!body || !body.new) {
        return ers.handleBadRequestError(res);
    }

    try {
        validator.validateUserInfo(body.new)
    } catch (e) {
        return ers.handleBadRequestError(res, e.message);
    }

    if (body.new.password) {
        if (!body.old || !body.old.password || typeof(body.old.password) !== 'string') {
            return ers.handleForbiddenError(res, 'Old password is missing');
        }

        if (!await bcrypt.compare(body.old.password, req.user.password)) {
            return ers.handleForbiddenError(res, 'Old password is incorrect');
        }
    }

    try {
        const record = await db.updateUserRecord(req.user.id, { set: body.new });

        delete record.password;
        return res.status(200).json({
            user: record
        });
    } catch (e) {
        if (
            e.message === 'Username is already taken' ||
            e.message === 'User not found'
        ) {
            return ers.handleConflictError(res, e.message);
        }

        return ers.handleInternalError(res, e);
    }
});

module.exports = router;
