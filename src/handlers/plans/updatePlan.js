const validator = require('../../validate');
const ers = require('../../errorHandlers');
const { db } = require('../../db');

async function updatePlan(req, res) {
    const updatedPlanInfo = req.body;

    if (!updatedPlanInfo) {
        return ers.handleBadRequestError(res);
    }

    try {
        validator.validatePlanInfo(updatedPlanInfo)
    } catch (e) {
        return ers.handleBadRequestError(res, e.message);
    }

    try {
        const record = await db.updatePlanRecord(req.plan.id, updatedPlanInfo);

        return res.status(200).json({
            plan: record
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

module.exports = updatePlan;
