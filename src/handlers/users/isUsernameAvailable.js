const validator = require('../../validate');
const ers = require('../../errorHandlers');
const { db } = require('../../db');

async function isUsernameAvailable(req, res) {
    const body = req.body;

    if (!body || !body.username) {
        return ers.handleBadRequestError(res);
    }

    try {
        validator.validateUserInfo({ username: body.username })
    } catch (e) {
        return ers.handleBadRequestError(res, e.message);
    }

    try {
        const result = await db.findUserRecord({ username: body.username });

        return res.status(200).json({
            isAvailable: !result
        });
    } catch (e) {
        return ers.handleInternalError(res, e);       
    }
}

module.exports = isUsernameAvailable;
