const { db } = require('../../db');

async function hideNotification(req, res) {
    const notificationId = req.data.notificationId;

    if (!Number.isInteger(notificationId)) {
        return res(400, { ok: false, message: 'Bad Request' });
    }

    try {
        const result = await db.deleteNotification(req.user.id, notificationId);

        if (!result) {
            return res(409, { ok: false, message: 'Notification not found' });
        }

        return res(200, { ok: true });
    } catch (e) {
        return res(409, { ok: false, message: 'Internal error' });
    }
}

module.exports = hideNotification;
