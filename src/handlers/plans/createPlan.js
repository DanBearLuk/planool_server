const validator = require('../../validate');
const ers = require('../../errorHandlers');
const { db } = require('../../db');

async function createPlan(req, res) {
    const planInfo = req.body;

    if (!planInfo) {
        return ers.handleBadRequestError(res);
    }

    try {
        validator.validatePlanInfo(planInfo, checkRequired = true);
    } catch (e) {
        return ers.handleBadRequestError(res, e.message);
    }

    try {
        const record = await db.addPlanRecord({ 
            author: req.user.id, 
            ...planInfo
        });

        return res.status(200).json({
            plan: record
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

module.exports = createPlan;
