const ers = require('../errorHandlers');
const { db } = require('../db');
const { attachUser } = require('../middlewares');

const express = require('express');
const rateLimiter = require('express-rate-limit');

const router = express.Router();

const limit = (period, amount) => rateLimiter({
    windowMs: period,
    max: amount,
    standardHeaders: true,
    legacyHeaders: false
});

//router.use('/hide/:notificationId', limit(15 * 1000, 5));
router.use('/hide/:notificationId', attachUser(db));
router.delete('/hide/:notificationId', async (req, res) => {
    const notificationId = +req.params.notificationId;

    if (!Number.isInteger(notificationId)) {
        return ers.handleBadRequestError(res);
    }

    try {
        const result = await db.deleteNotification(req.user.id, notificationId);

        if (!result) {
            return ers.handleConflictError(res, 'Notification not found');
        }

        return res.status(200).json({
            ok: true
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
});

module.exports = router;
