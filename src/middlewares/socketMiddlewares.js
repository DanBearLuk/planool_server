const { db } = require('../db');

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

module.exports = {
    attachUserToSocket, attachChatToSocket
};
