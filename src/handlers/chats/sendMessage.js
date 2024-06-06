const { validateMessage } = require('../../validate');
const { db } = require('../../db');

async function sendMessage(req, res) {
    const msg = req.data.msg;

    try {
        validateMessage(msg);
    } catch(e) {
        res(400, { message: e.message });
    }

    try {
        await db.addNewMessage(req.chat.id, req.user.id, msg);

        res(200, {});
    } catch (e) {
        console.error(e);
        res(500, { message: 'Internal error' });
    }
}

module.exports = sendMessage;
