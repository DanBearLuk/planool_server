const ers = require('../../errorHandlers');

async function viewPlan(req, res) {
    try {
        let planInfo = req.plan;

        if (!req.userLocalRoles.isEditor && !req.userLocalRoles.isCreator) {
            delete planInfo.participants;
            delete planInfo.blacklist;
            delete planInfo.whitelist;
            delete planInfo.collaborators;
        }

        return res.status(200).json({
            plan: planInfo,
            userLocalRoles: req.userLocalRoles
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

module.exports = viewPlan;
