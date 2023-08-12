const validator = require('../validate');
const ers = require('../errorHandlers');
const db = require('../db');
const { attachUser } = require('../middlewares');

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

//router.use('/create', limit(3 * 60 * 1000, 5));
router.use('/create', attachUser(db));
router.use('/create', bodyParser.json());
router.post('/create', async (req, res) => {
    const body = req.body;
    const reqFields = [
        'title', 'visibility', 'type',
        'isOnlyApproved'
    ];

    if (!body || !validator.checkRequiredFields(body, reqFields)) {
        return ers.handleBadRequestError(res);
    }

    try {
        validator.validatePlanInfo(body)
    } catch (e) {
        return ers.handleBadRequestError(res, e.message);
    }

    try {
        const record = await db.addPlanRecord({ 
            author: req.user.id, 
            ...req.body 
        });

        await db.updateUserRecord(req.user.id, {
            push: {
                createdPlans: record.id
            }
        })

        return res.status(200).json({
            plan: record
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
});

module.exports = router;
