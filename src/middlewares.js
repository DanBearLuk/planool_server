const { verifyJWT } = require('./jwt');
const ers = require('./errorHandlers');

function attachUser(db) {
    return async (req, res, next) => {
        const token = req.cookies.token;

        if (!token) {
            return ers.handleForbiddenError(res, 'Token not found');
        }

        let userId;

        try {
            userId = (await verifyJWT(token)).id;
        } catch {
            return ers.handleForbiddenError(res, 'Token expired');
        }

        try {
            const record = await db.findUserRecord(null, userId);

            if (!record) {
                return ers.handleForbiddenError(res, 'User not found');
            }

            req.user = record;

            next();
        } catch (e) {
            return ers.handleInternalError(res, e);
        }
    }
}

function attachPlan(db) {
    return async (req, res, next) => {
        const planId = +req.params.planId;

        try {
            const record = await db.findPlanRecord(planId);

            if (!record) {
                return ers.handleNotFoundError(res, 'Plan not found');
            }

            req.plan = record;

            next();
        } catch (e) {
            return ers.handleInternalError(res, e);  
        }
    }
}

function checkAccess(isCreator = true) {
    return async (req, res, next) => {
        if (!req.user) {
            throw new Error('attachUser need to be called before this middleware')
        }
        
        if (!req.plan) {
            throw new Error('attachPlan need to be called before this middleware')
        }

        if (req.plan.author === req.user.id) {
            next();
        } else if (!isCreator && req.plan.collaborators.includes(req.user.id)) {
            next();
        } else {
            return ers.handleForbiddenError(res, 'Access denied');
        }
    }
}

module.exports = {
    attachUser, attachPlan, checkAccess
};
