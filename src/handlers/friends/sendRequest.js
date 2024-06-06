const ers = require('../../errorHandlers');
const { db } = require('../../db');
const { socketManager } = require('../../socketManager');
const { INCOMING_FRIEND_REQUEST, useTemplate } = require('../../../notificationTemplates');

async function sendRequest(req, res) {
    const user = req.user;
    const friendId = +req.params.friendId;

    if (!Number.isInteger(friendId) || req.user.id === friendId) {
        return ers.handleBadRequestError(res);
    }

    if (user.friendRequests.outbox.some(r => r.userId === friendId) || 
        user.friendRequests.inbox.some(r => r.userId === friendId)) {
        return ers.handleConflictError(res, 'Duplicated request');
    }

    try {
        const friendRecord = await db.findUserRecord({ userId: friendId });
    
        if (!friendRecord) {
            return ers.handleNotFoundError(res, 'User not found');
        }

        notification = await addRequestNotification(user, friendId);
        await updateUsers(user.id, friendId, notification.id);
        emitSocketEvents(user, friendId, +req.query.socketId || null);

        return res.status(200);
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

async function addRequestNotification(user, friendId) {
    const notification = await db.addNotification(friendId, useTemplate(INCOMING_FRIEND_REQUEST, { user }));

    return notification;
}

async function updateUsers(userId, friendId, relatedNotificationId) {
    await db.updateUserRecord(friendId, {
        push: {
            'friendRequests.inbox': {
                userId: userId,
                relatedNotificationId: relatedNotificationId
            }
        }
    });

    await db.updateUserRecord(userId, {
        push: {
            'friendRequests.outbox': { 
                userId: friendId 
            }
        }
    });
}

function emitSocketEvents(user, friendId, userSocketId) {
    socketManager.emitToClients(friendId, 'sentFriendRequest', {
        type: 'inbox',
        userId: user.id,
        username: user.username
    });

    socketManager.emitToClients(user.id, 'sentFriendRequest', {
        type: 'outbox',
        userId: friendId
    }, excludedSocket = userSocketId);
}

module.exports = sendRequest;
