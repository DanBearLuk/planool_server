const ers = require('../../errorHandlers');
const { db } = require('../../db');
const { socketManager } = require('../../socketManager');

async function rejectRequest(req, res) {
    const user = req.user;
    const friendId = +req.params.friendId;

    if (!Number.isInteger(friendId)) {
        return ers.handleBadRequestError(res);
    }

    if (!req.user.friendRequests.inbox.some(r => r.userId === friendId)) {
        return ers.handleConflictError(res, 'Friend request doesnt exist');
    }

    try {
        deleteRequestNotification(user, friendId);
        await updateUsers(user.id, friendId);
        emitSocketEvents(user.id, friendId, +req.query.socketId || null);

        return res.status(200);
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

async function deleteRequestNotification(user, friendId) {
    const relatedNotificationId = user.friendRequests.inbox.find(
        r => r.userId === friendId
    ).relatedNotificationId;

    if (relatedNotificationId !== undefined) {
        await db.deleteNotification(user.id, relatedNotificationId);
    }
}

async function updateUsers(userId, friendId) {
    await db.updateUserRecord(userId, {
        pull: {
            'friendRequests.inbox': {
                userId: friendId
            }
        }
    });

    const friendRecord = await db.findUserRecord({ userId: friendId });

    if (!friendRecord) return;

    await db.updateUserRecord(friendId, {
        pull: {
            'friendRequests.outbox': {
                userId: user.id
            }
        }
    });
}

function emitSocketEvents(userId, friendId, userSocketId) {
    socketManager.emitToClients(friendId, 'rejectedFriendRequest', {
        type: 'outbox',
        userId: userId
    });

    socketManager.emitToClients(userId, 'rejectedFriendRequest', {
        type: 'inbox',
        userId: friendId
    }, excludedSocket = userSocketId);
}

module.exports = rejectRequest;
