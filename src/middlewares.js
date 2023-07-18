const { verifyJWT } = require('./jwt');

function attachUser(db) {
    return async (req, res, next) => {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                message: 'Token not found'
            });       
        }

        let userId;

        try {
            userId = (await verifyJWT(token)).id;
        } catch {
            return res.status(401).json({
                message: 'Token expired'
            });  
        }

        try {
            const record = await db.findUserRecord(null, userId);

            if (!record) {
                return res.status(401).json({
                    message: 'User not found'
                });
            }

            delete record.password;
            req.user = record;

            next();
        } catch (e) {
            console.error(e);

            return res.status(500).json({
                message: 'Internal error'
            });  
        }
    }
}

function attachPlan(db) {
    return async (req, res, next) => {
        const planId = req.params.planId;

        try {
            const record = await db.findPlanRecord(planId);

            if (!record) {
                return res.status(404).json({
                    message: 'Plan not found'
                });
            }

            req.plan = record;

            next();
        } catch (e) {
            console.error(e);

            return res.status(500).json({
                message: 'Internal error'
            });  
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

        if (req.user.createdPlans.includes(req.plan.id)) {
            next();
        }

        if (!isCreator && req.plan.editors.includes(req.user.id)) {
            next();
        } else {
            return res.status(401).json({
                message: 'Access denied'
            })
        }
    }
}

module.exports = {
    attachUser, attachPlan, checkAccess
};
