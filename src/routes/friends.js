const express = require('express');
const rateLimiter = require('express-rate-limit');

const { db } = require('../db');
const { attachUser } = require('../middlewares/httpMiddlewares');

const router = express.Router();

const limit = (period, amount) => rateLimiter({
    windowMs: period,
    max: amount,
    standardHeaders: true,
    legacyHeaders: false
});

const { 
    sendRequest, 
    cancelRequest,
    acceptRequest,
    rejectRequest,
    removeFriend
} = require('../handlers/friends');

//router.use('/sendRequest/:friendId', limit(15 * 1000, 1));
router.use('/sendRequest/:friendId', attachUser(db));
router.post('/sendRequest/:friendId', sendRequest);

//router.use('/remove/:friendId', limit(15 * 1000, 1));
router.use('/remove/:friendId', attachUser(db));
router.delete('/remove/:friendId', removeFriend);

//router.use('/rejectRequest/:friendId', limit(15 * 1000, 1));
router.use('/rejectRequest/:friendId', attachUser(db));
router.post('/rejectRequest/:friendId', rejectRequest);

//router.use('/acceptRequest/:friendId', limit(15 * 1000, 1));
router.use('/acceptRequest/:friendId', attachUser(db));
router.post('/acceptRequest/:friendId', acceptRequest);

//router.use('/cancelRequest/:friendId', limit(15 * 1000, 1));
router.use('/cancelRequest/:friendId', attachUser(db));
router.post('/cancelRequest/:friendId', cancelRequest);

module.exports = {
    router
};
