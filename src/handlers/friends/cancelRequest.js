const ers = require('../../errorHandlers');
const { db } = require('../../db');
const { socketManager } = require('../../socketManager');

async function cancelRequest(req, res) {
    const user = req.user;
    const friendId = +req.params.friendId;

    if (!Number.isInteger(friendId)) {
        return ers.handleBadRequestError(res);
    }

    if (!req.user.friendRequests.outbox.some(r => r.userId === friendId)) {
        return ers.handleConflictError(res, 'Friend request doesnt exist');
    }

    try {
        const friendRecord = await db.findUserRecord({ userId: friendId });

        if (friendRecord) {
            deleteRequestNotification(user.id, friendRecord);
        }

        await updateUsers(user.id, friendId, friendRecord !== null);
        emitSocketEvents(user.id, friendId, +req.query.socketId || null);
        
        return res.status(200);
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

async function deleteRequestNotification(userId, friendRecord) {
    const relatedNotificationId = friendRecord.friendRequests.inbox.find(
        r => r.userId === userId
    )?.relatedNotificationId;

    if (relatedNotificationId !== undefined) {
        await db.deleteNotification(friendRecord.id, relatedNotificationId);
    }
}

async function updateUsers(userId, friendId, friendAvailable = true) {
    await db.updateUserRecord(userId, {
        pull: {
            'friendRequests.outbox': {
                userId: friendId
            }
        }
    });

    if (!friendAvailable) return;
    
    await db.updateUserRecord(friendId, {
        pull: {
            'friendRequests.inbox': {
                userId: userId
            }
        }
    });
    
}

function emitSocketEvents(userId, friendId, userSocketId) {
    socketManager.emitToClients(friendId, 'canceledFriendRequest', {
        type: 'inbox',
        userId: userId
    });

    socketManager.emitToClients(userId, 'canceledFriendRequest', {
        type: 'outbox',
        userId: friendId
    }, excludedSocket = userSocketId);
}

module.exports = cancelRequest;
