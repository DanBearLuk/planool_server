const { db } = require('../../db');

async function hideNotification(req, res) {
    const notificationId = req.data.notificationId;

    if (!Number.isInteger(notificationId)) {
        return res(400, { message: 'Bad Request' });
    }

    try {
        const result = await db.deleteNotification(req.user.id, notificationId);

        if (!result) {
            return res(409, { message: 'Notification not found' });
        }

        return res(200, {});
    } catch (e) {
        return res(409, { message: 'Internal error' });
    }
}

module.exports = hideNotification;
