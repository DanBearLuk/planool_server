const validator = require('../validate');
const ers = require('../errorHandlers');
const db = require('../db');
const { attachUser, attachPlan, checkAccess } = require('../middlewares');

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

//router.use('/create', limit(60 * 60 * 1000, 5));
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

        return res.status(200).json({
            plan: record
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
});

//router.use('/:planId/update', limit(1 * 60 * 1000, 2));
router.use('/:planId/update', [attachUser(db), attachPlan(db), checkAccess()]);
router.use('/:planId/update', bodyParser.json());
router.put('/:planId/update', async (req, res) => {
    const body = req.body;

    if (!body) {
        return ers.handleBadRequestError(res);
    }

    try {
        validator.validatePlanInfo(body)
    } catch (e) {
        return ers.handleBadRequestError(res, e.message);
    }

    try {
        const record = await db.updatePlanRecord(req.plan.id, body);

        return res.status(200).json({
            plan: record
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
});

//router.use('/:planId/delete', limit(1 * 60 * 1000, 2));
router.use('/:planId/delete', [attachUser(db), attachPlan(db), checkAccess()]);
router.use('/:planId/delete', bodyParser.json());
router.delete('/:planId/delete', async (req, res) => {
    try {
        await db.deletePlanRecord(req.user.id, req.plan.id);

        return res.status(200).json({
            ok: true
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
});

module.exports = router;
