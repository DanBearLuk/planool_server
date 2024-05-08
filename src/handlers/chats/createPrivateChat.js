const ers = require('../../errorHandlers');
const { db } = require('../../db');

async function createPrivateChat(req, res) {
    const user = req.user;
    const companionId = +req.params.companionId;

    if (!Number.isInteger(companionId) || companionId === req.user.id) {
        return ers.handleBadRequestError(res);
    }

    try {
        const companion = await db.findUserRecord({ userId: companionId });

        if (!companion) {
            return ers.handleNotFoundError(res, 'Companion not found');
        }

        const chatId = formChatId(user.id, companionId);

        if (req.user.chats.some(c => c.id === chatId)) {
            return ers.handleConflictError(res, 'Chat already exists');
        }

        const record = await createChat(user.id, companionId, chatId);

        return res.status(200).json({
            chat: record
        });
    } catch (e) {
        if (e.message === 'Chat already exists') {
            return ers.handleConflictError(res, e.message);
        }

        return ers.handleInternalError(res, e);
    }
}

function formChatId(userId, companionId) {
    if (companionId > userId) {
        return Buffer.from(companionId + '/' + userId).toString('base64url');
    } else {
        return Buffer.from(userId + '/' + companionId).toString('base64url');
    }
}

async function createChat(userId, companionId, chatId) {
    return await db.createChat({
        type: 'private',
        members: [
            { id: userId, role: 'owner' },
            { id: companionId, role: 'owner' }
        ]
    }, chatId = chatId);
}

module.exports = createPrivateChat;
