const ers = require('../../errorHandlers');
const { db } = require('../../db');

async function getPlans(req, res) {
    try {
        let planIds = req.body.planIds;

        const plans = await db.findPlanRecords(planIds);

        return res.status(200).json(plans.map(plan => ({
            id: plan.id,
            title: plan.title
        })));
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

module.exports = getPlans;
