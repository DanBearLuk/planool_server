const { validateMessage } = require('../../validate');
const { db } = require('../../db');

async function sendMessage(req, res) {
    const msg = req.data.msg;

    try {
        validateMessage(msg);
    } catch(e) {
        res(400, { ok: false, message: e.message });
    }

    try {
        await db.addNewMessage(req.chat.id, req.user.id, msg);

        res(200, { ok: true });
    } catch (e) {
        console.error(e);
        res(500, { ok: false, message: 'Internal error' });
    }
}

module.exports = sendMessage;
