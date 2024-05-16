const PlanRoles = {
    CREATOR: 0b00,
    EDITOR:  0b01,
    VIEWER:  0b10
};

function attachUserToSocket(db) {
    return async (req, res, next) => {
        const userId = req.socketInfo.userId;

        try {
            const record = await db.findUserRecord({ userId });

            if (!record) {
                return res(401, 'User not found');
            }

            delete record._id;
            req.user = record;

            next();
        } catch (e) {
            console.error(e);
            return res(500, 'Internal Error');
        }
    }
}

function attachChatToSocket(db) {
    return async (req, res, next) => {
        const chatId = req.data.chatId;

        if (!chatId) {
            return res(400, 'Incorrect chat\'s id');
        }

        try {
            const record = await db.findChatRecord(chatId);

            if (!record) {
                return res(404, 'Chat not found');
            }

            if (!req.user) {
                throw new Error('attachUserToSocket need to be called before this middleware')
            }

            const memberInfo = record.members.find(m => m.id === req.user.id);

            if (!memberInfo) {
                return res(401, 'User is not member of chat');
            }

            req.chat = record;
            req.chatRole = memberInfo.role;

            next();
        } catch (e) {
            console.error(e);
            return res(500, 'Internal Error');
        }
    }
}

function attachPlanToSocket(db) {
    return async (req, res, next) => {
        const planId = req.data.planId;

        if (!planId) {
            return res(400, 'Incorrect plan\'s id');
        }

        try {
            const record = await db.findPlanRecord(planId);

            if (!record) {
                return res(400, 'Plan not found');
            }

            req.plan = record;

            next();
        } catch (e) {
            console.error(e);
            return res(500, 'Internal error');  
        }
    }
}

function checkPlanAccessFromSocket(db, role = PlanRoles.VIEWER) {
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
            return res(401, 'Access denied');
        }
    }
}

module.exports = {
    attachUserToSocket, 
    attachChatToSocket,
    attachPlanToSocket,
    checkPlanAccessFromSocket,
    PlanRoles
};
