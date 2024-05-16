const ers = require('../errorHandlers');
const { verifyJWT } = require('../jwt');

const PlanRoles = {
    CREATOR: 0b00,
    EDITOR:  0b01,
    VIEWER:  0b10
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
            const record = await db.findUserRecord({ userId });

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

        if (!planId) {
            return ers.handleBadRequestError(res, 'Incorrect plan\'s id');
        }

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

function attachChat(db) {
    return async (req, res, next) => {
        const chatId = req.params.chatId;

        if (!chatId) {
            return ers.handleBadRequestError(res, 'Incorrect chat\'s id');
        }

        try {
            const record = await db.findChatRecord(chatId);

            if (!record) {
                return ers.handleNotFoundError(res, 'Chat not found');
            }

            if (!req.user) {
                throw new Error('attachUser need to be called before this middleware')
            }

            const memberInfo = record.members.find(m => m.id === req.user.id);

            if (!memberInfo) {
                return ers.handleForbiddenError(res, 'User is not member of chat');
            }

            req.chat = record;
            req.chatRole = memberInfo.role;

            next();
        } catch (e) {
            return ers.handleInternalError(res, e);  
        }
    }
}

function checkPlanAccess(db, role = PlanRoles.VIEWER) {
    return async (req, res, next) => {
        if (!req.user) {
            throw new Error('attachUser need to be called before this middleware')
        }
        
        if (!req.plan) {
            throw new Error('attachPlan need to be called before this middleware')
        }

        const isUserCreator = req.plan.author === req.user.id;
        const isUserEditor = isUserCreator || req.plan.collaborators.includes(req.user.id);
        let isUserViewer = isUserEditor;

        if (!req.plan.blacklist.includes(req.user.id) && !isUserViewer) {
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

        if ((role & PlanRoles.VIEWER) && isUserViewer) {
            next();
        } else if ((role & PlanRoles.EDITOR) && isUserEditor) {
            next();
        } else if ((role & PlanRoles.CREATOR) && isUserCreator) {
            next();
        } else {
            return ers.handleForbiddenError(res, 'Access denied');
        }
    }
}

module.exports = {
    attachUser, attachPlan, 
    checkPlanAccess, attachChat,
    PlanRoles
};
