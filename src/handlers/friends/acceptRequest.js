const ers = require('../../errorHandlers');
const { db } = require('../../db');
const { socketManager } = require('../../socketManager');
const { ACCEPTED_FRIEND_REQUEST } = require('../../../notificationTemplates');

async function acceptRequest(req, res) {
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
        addAcceptNotification(user);
        emitSocketEvents(user.id, friendId, +req.query.socketId || null);

        return res.status(200).json({
            ok: true
        });
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

async function addAcceptNotification(user) {
    await db.addNotification(friendId, useTemplate(ACCEPTED_FRIEND_REQUEST, { user }));
}

async function updateUsers(userId, friendId) {
    await db.updateUserRecord(req.user.id, {
        push: {
            friends: friendId
        },
        pull: {
            'friendRequests.inbox': {
                userId: friendId
            }
        }
    });

    const friendRecord = await db.findUserRecord({ userId: friendId });

    if (!friendRecord) return;

    await db.updateUserRecord(friendId, {
        push: {
            friends: userId
        },
        pull: {
            'friendRequests.outbox': {
                userId: userId
            }
        }
    });
}

function emitSocketEvents(userId, friendId, userSocketId) {
    socketManager.emitToClients(friendId, 'acceptedFriendRequest', {
        type: 'outbox',
        userId: userId
    });

    socketManager.emitToClients(userId, 'acceptedFriendRequest', {
        type: 'inbox',
        userId: friendId
    }, excludedSocket = userSocketId);
}

module.exports = acceptRequest;
