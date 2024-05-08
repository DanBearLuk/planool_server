const bcrypt = require('bcrypt');

const validator = require('../../validate');
const ers = require('../../errorHandlers');
const { db } = require('../../db');

async function updateUserInfo(req, res) {
    const user = req.user;
    const updatedInfo = req.body;

    if (!updatedInfo || !updatedInfo.new) {
        return ers.handleBadRequestError(res);
    }

    try {
        validator.validateUserInfo(updatedInfo.new)
    } catch (e) {
        return ers.handleBadRequestError(res, e.message);
    }

    if (updatedInfo.new.password) {
        try {
            await checkPassword(user, updatedInfo);
        } catch (e) {
            return ers.handleForbiddenError(res, e.message);
        }

        updatedInfo.new.password = await bcrypt.hash(updatedInfo.new.password, 10);;
    }

    try {
        if (await db.findUserRecord({ username: updatedInfo.new.username }) !== null) {
            return res.handleConflictError(res, 'Username is taken');
        }

        const updatedUser = await db.updateUserRecord(user.id, { set: updatedInfo.new });

        delete updatedUser.password;
        return res.status(200).json({
            user: updatedUser
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

async function checkPassword(userInfo, updatedInfo) {
    if (!updatedInfo?.old?.password || typeof(updatedInfo.old.password) !== 'string') {
        throw new Error('Current password is missing');
    }

    const isPasswordValid = await bcrypt.compare(updatedInfo.old.password, userInfo.password);
    if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
    }
}

module.exports = updateUserInfo;
