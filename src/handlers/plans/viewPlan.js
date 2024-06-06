const ers = require('../../errorHandlers');
const { db } = require('../../db');

async function viewPlan(req, res) {
    try {
        let planInfo = req.plan;

        if (!req.userPlanRoles.isEditor && !req.userPlanRoles.isCreator) {
            delete planInfo.participants;
            delete planInfo.blacklist;
            delete planInfo.whitelist;
            delete planInfo.collaborators;
        }

        const author = await db.findUserRecord({ userId: planInfo.author });

        return res.status(200).json({
            plan: planInfo,
            roles: req.userPlanRoles,
            authorInfo: author
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

module.exports = viewPlan;
