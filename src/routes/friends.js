const ers = require('../errorHandlers');
const socketManager = require('../socketManager');
const { db } = require('../db');
const { attachUser } = require('../middlewares');

const express = require('express');
const rateLimiter = require('express-rate-limit');

const router = express.Router();

const limit = (period, amount) => rateLimiter({
    windowMs: period,
    max: amount,
    standardHeaders: true,
    legacyHeaders: false
});

//router.use('/sendRequest/:friendId', limit(15 * 1000, 1));
router.use('/sendRequest/:friendId', attachUser(db));
router.post('/sendRequest/:friendId', async (req, res) => {
    const friendId = +req.params.friendId;

    if (!Number.isInteger(friendId)) {
        return ers.handleBadRequestError(res);
    }

    if (req.user.friendRequests.outbox.some(r => r.userId === friendId)
        || req.user.friendRequests.inbox.some(r => r.userId === friendId)) {
        return ers.handleConflictError(res, 'Duplicate request');
    }

    if (req.user.id === friendId) {
        return ers.handleBadRequestError(res);
    }

    if (!await db.findUserRecord({ userId: friendId })) {
        return ers.handleNotFoundError(res, 'User not found');
    }

    try {
        const notification = await db.addNotification(friendId, {
            text: `New friend request from <a href="users/${req.user.id}">${req.user.username}</a>.`,
            icon: req.user.avatarUrl,
            buttons: [
                { type: 'accept', url: '' },
                { type: 'reject', url: '' }
            ]
        });

        await db.updateUserRecord(friendId, {
            push: {
                'friendRequests.inbox': {
                    userId: req.user.id,
                    relatedNotificationId: notification.id
                }
            }
        });

        const updatedRecord = await db.updateUserRecord(req.user.id, {
            push: {
                'friendRequests.outbox': { 
                    userId: friendId 
                }
            }
        });

        socketManager.emit(friendId, 'newFriendRequest', {
            id: req.user.id,
            username: req.user.username,
            avatarUrl: req.user.avatarUrl
        });

        delete updatedRecord.password;
        return res.status(200).json({
            ok: true
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
});

//router.use('/remove/:friendId', limit(15 * 1000, 1));
router.use('/remove/:friendId', attachUser(db));
router.delete('/remove/:friendId', async (req, res) => {
    const friendId = +req.params.friendId;

    if (!Number.isInteger(friendId)) {
        return ers.handleBadRequestError(res);
    }

    if (!req.user.friends.includes(friendId)) {
        return ers.handleConflictError(res, 'Friend not found');
    }

    try {
        if (await db.findUserRecord({ userId: friendId })) {
            await db.updateUserRecord(friendId, {
                pull: {
                    friends: req.user.id
                }
            });
        }

        const updatedRecord = await db.updateUserRecord(req.user.id, {
            pull: {
                friends: friendId
            }
        });

        socketManager.emit(friendId, 'deleteFriend', {
            userId: req.user.id
        });

        delete updatedRecord.password;
        return res.status(200).json({
            ok: true
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
});

//router.use('/rejectRequest/:friendId', limit(15 * 1000, 1));
router.use('/rejectRequest/:friendId', attachUser(db));
router.post('/rejectRequest/:friendId', async (req, res) => {
    const friendId = +req.params.friendId;

    if (!Number.isInteger(friendId)) {
        return ers.handleBadRequestError(res);
    }

    if (!req.user.friendRequests.inbox.some(r => r.userId === friendId)) {
        return ers.handleConflictError(res, 'Friend request doesnt exist');
    }

    try {
        const relatedNotificationId = req.user.friendRequests.inbox.find(
            r => r.userId === friendId
        ).relatedNotificationId;

        if (relatedNotificationId !== undefined) {
            await db.deleteNotification(req.user.id, relatedNotificationId);
        }

        if (await db.findUserRecord({ userId: friendId })) {
            await db.updateUserRecord(friendId, {
                pull: {
                    'friendRequests.outbox': {
                        userId: req.user.id
                    }
                }
            });
        }

        const updatedRecord = await db.updateUserRecord(req.user.id, {
            pull: {
                'friendRequests.inbox': {
                    userId: friendId
                }
            }
        });

        delete updatedRecord.password;
        return res.status(200).json({
            ok: true
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
});

//router.use('/acceptRequest/:friendId', limit(15 * 1000, 1));
router.use('/acceptRequest/:friendId', attachUser(db));
router.post('/acceptRequest/:friendId', async (req, res) => {
    const friendId = +req.params.friendId;

    if (!Number.isInteger(friendId)) {
        return ers.handleBadRequestError(res);
    }

    if (!req.user.friendRequests.inbox.some(r => r.userId === friendId)) {
        return ers.handleConflictError(res, 'Friend request doesnt exist');
    }

    try {
        const relatedNotificationId = req.user.friendRequests.inbox.find(
            r => r.userId === friendId
        ).relatedNotificationId;

        if (relatedNotificationId !== undefined) {
            await db.deleteNotification(req.user.id, relatedNotificationId);
        }

        if (await db.findUserRecord({ userId: friendId })) {
            await db.updateUserRecord(friendId, {
                push: {
                    friends: req.user.id
                },
                pull: {
                    'friendRequests.outbox': {
                        userId: req.user.id
                    }
                }
            });
        }

        const updatedRecord = await db.updateUserRecord(req.user.id, {
            push: {
                friends: friendId
            },
            pull: {
                'friendRequests.inbox': {
                    userId: friendId
                }
            }
        });

        await db.addNotification(friendId, {
            text: `Friend request to <a href="users/${req.user.id}">${req.user.username}</a> has been accepted.`,
            icon: req.user.avatarUrl
        });

        socketManager.emit(friendId, 'acceptedFriendRequest', {
            userId: req.user.id
        });

        delete updatedRecord.password;
        return res.status(200).json({
            ok: true
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
});

//router.use('/cancelRequest/:friendId', limit(15 * 1000, 1));
router.use('/cancelRequest/:friendId', attachUser(db));
router.post('/cancelRequest/:friendId', async (req, res) => {
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
            const relatedNotificationId = friendRecord.friendRequests.inbox.find(
                r => r.userId === req.user.id
            )?.relatedNotificationId;

            if (relatedNotificationId !== undefined) {
                await db.deleteNotification(friendId, relatedNotificationId);
            }

            await db.updateUserRecord(friendId, {
                pull: {
                    'friendRequests.inbox': {
                        userId: req.user.id
                    }
                }
            });
        }

        const updatedRecord = await db.updateUserRecord(req.user.id, {
            pull: {
                'friendRequests.outbox': {
                    userId: friendId
                }
            }
        });

        delete updatedRecord.password;
        return res.status(200).json({
            ok: true
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
});

module.exports = router;
