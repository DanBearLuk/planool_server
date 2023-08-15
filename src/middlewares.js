const { verifyJWT } = require('./jwt');
const ers = require('./errorHandlers');
const db = require('./db');

const Roles = {
    CREATOR: 0x001,
    EDITOR: 0x010,
    VIEWER: 0x100
};

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
            const record = await db.findUserRecord({ userId: userId });

            if (!record) {
                return ers.handleForbiddenError(res, 'User not found');
            }

            delete record._id;
            req.user = record;

            next();
        } catch (e) {
            return ers.handleInternalError(res, e);
        }
    }
}

function attachPlan(db) {
    return async (req, res, next) => {
        const planId = req.params.planId;

        try {
            const record = await db.findPlanRecord(planId);

            if (!record) {
                return ers.handleNotFoundError(res, 'Plan not found');
            }

            delete record._id;
            req.plan = record;

            next();
        } catch (e) {
            return ers.handleInternalError(res, e);  
        }
    }
}

function checkAccess(role = Roles.VIEWER) {
    return async (req, res, next) => {
        if (!req.user) {
            throw new Error('attachUser need to be called before this middleware')
        }
        
        if (!req.plan) {
            throw new Error('attachPlan need to be called before this middleware')
        }

        const isUserCreator = req.plan.author === req.user.id;
        const isUserEditor = isUserCreator || req.plan.collaborators.includes(req.user.id);
        let isUserViewer = isUserCreator || isUserEditor;

        if (!req.plan.blacklist.includes(req.user.id)) {
            if (req.plan.visibility === 'public' || req.plan.visibility === 'link_access') {
                isUserViewer = true;
            } else if (req.plan.whitelist.includes(req.user.id)) {
                isUserViewer = true;
            } else if (req.plan.visibility === 'friends') {
                const author = await db.findUserRecord({ userId: req.plan.author });
    
                if (author && author.friends.includes(req.user.id)) {
                    isUserViewer = true;
                }
            }   
        }

        req.userLocalRoles = {
            isCreator: isUserCreator,
            isEditor: isUserEditor,
            isViewer: isUserViewer
        };

        if ((role & Roles.VIEWER) && isUserViewer) {
            next();
        } else if ((role & Roles.EDITOR) && isUserEditor) {
            next();
        } else if ((role & Roles.CREATOR) && isUserCreator) {
            next();
        } else {
            return ers.handleForbiddenError(res, 'Access denied');
        }
    }
}

module.exports = {
    attachUser, attachPlan, checkAccess,
    Roles
};
