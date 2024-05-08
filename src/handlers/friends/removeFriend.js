const ers = require('../../errorHandlers');
const { db } = require('../../db');
const { socketManager } = require('../../socketManager');

async function removeFriend (req, res) {
    const user = req.user;
    const friendId = +req.params.friendId;

    if (!Number.isInteger(friendId)) {
        return ers.handleBadRequestError(res);
    }

    if (!req.user.friends.includes(friendId)) {
        return ers.handleConflictError(res, 'Friend not found');
    }

    try {
        await updateUsers(user.id, friendId);
        emitSocketEvents(user.id, friendId, +req.query.socketId || null);

        return res.status(200).json({
            ok: true
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

async function updateUsers(userId, friendId) {
    await db.updateUserRecord(userId, {
        pull: {
            friends: friendId
        }
    });

    const friendRecord = await db.findUserRecord({ userId: friendId });

    if (!friendRecord) return;

    await db.updateUserRecord(friendId, {
        pull: {
            friends: userId
        }
    });
}

function emitSocketEvents(userId, friendId, userSocketId) {
    socketManager.emitToClients(friendId, 'deletedFriend', {
        userId: userId
    });

    socketManager.emitToClients(userId, 'deletedFriend', {
        userId: friendId
    }, excludedSocket = userSocketId);
}

module.exports = removeFriend;
