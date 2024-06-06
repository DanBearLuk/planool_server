const ers = require('../../errorHandlers');
const { db } = require('../../db');

async function deletePlan(req, res) {
    try {
        await db.deletePlanRecord(req.user.id, req.plan.id);

        return res.status(200);
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

module.exports = deletePlan;
