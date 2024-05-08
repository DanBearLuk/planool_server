const bcrypt = require('bcrypt');

const validator = require('../../validate');
const ers = require('../../errorHandlers');
const { db } = require('../../db');

async function registerUser(req, res) {
    const registerInfo = req.body;

    if (!registerInfo || !registerInfo.username || !registerInfo.password) {
        return ers.handleBadRequestError(res);
    }

    try {
        validator.validateUserInfo(registerInfo)
    } catch (e) {
        return ers.handleForbiddenError(res, e.message);
    }

    try {
        const userRecord = await db.findUserRecord({ username: registerInfo.username });

        if (userRecord !== null) {
            return ers.handleConflictError(res, 'Username is taken');
        }

        const userInfo = await db.addUserRecord(registerInfo.username, registerInfo.password);

        delete userInfo.password;
        return res.status(200).json({
            user: userInfo
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

module.exports = registerUser;
