const validator = require('../validate');
const ers = require('../errorHandlers');
const { db } = require('../db');

const { 
    attachUser, 
    attachPlan, 
    checkPlanAccess, 
    PlanRoles 
} = require('../middlewares/httpMiddlewares');

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
    viewPlan, 
    createPlan,
    updatePlan,
    deletePlan
} = require('../handlers/plans');

//router.use('/create', limit(60 * 60 * 1000, 5));
router.use('/create', attachUser(db));
router.use('/create', bodyParser.json());
router.post('/create', createPlan);

//router.use('/:planId/update', limit(1 * 60 * 1000, 2));
router.use('/:planId/update', attachUser(db));
router.use('/:planId/update', attachPlan(db));
router.use('/:planId/update', checkPlanAccess(db, PlanRoles.CREATOR));
router.use('/:planId/update', bodyParser.json());
router.put('/:planId/update', updatePlan);

//router.use('/:planId/delete', limit(1 * 60 * 1000, 2));
router.use('/:planId/delete', attachUser(db));
router.use('/:planId/delete', attachPlan(db));
router.use('/:planId/delete', checkPlanAccess(db, PlanRoles.CREATOR));
router.delete('/:planId/delete', deletePlan);

//router.use('/:planId/view', limit(1 * 60 * 1000, 2));
router.use('/:planId/view', attachUser(db));
router.use('/:planId/view', attachPlan(db));
router.use('/:planId/view', checkPlanAccess(db, PlanRoles.CREATOR));
router.get('/:planId/view', viewPlan);

module.exports = {
    router
};
