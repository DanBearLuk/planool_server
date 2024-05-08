const bcrypt = require('bcrypt');

const validator = require('../../validate');
const ers = require('../../errorHandlers');
const { db } = require('../../db');
const { createJWT } = require('../../jwt');

async function loginUser(req, res) {
    const loginInfo = req.body;

    if (!loginInfo || !loginInfo.username || !loginInfo.password) {
        return ers.handleBadRequestError(res);
    }

    try {
        validator.validateUserInfo(loginInfo)
    } catch (e) {
        return ers.handleForbiddenError(res, e.message);
    }

    try {
        const userInfo = await db.findUserRecord({ username: loginInfo.username });

        try {
            await verifyUserInfo(userInfo, loginInfo);
        } catch (e) {
            return ers.handleForbiddenError(res, e.message);
        }

        delete userInfo.password;

        await assignToken(res, userInfo);
        return res.status(200).json({
            user: userInfo
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

async function verifyUserInfo(userInfo, loginInfo) {
    if (!userInfo) {
        throw new Error('Username is incorrect');
    }

    const isPasswordValid = await bcrypt.compare(loginInfo.password, userInfo.password);
    if (!isPasswordValid) {
        throw new Error('Password is incorrect');
    }
}

async function assignToken(res, userInfo) {
    const token = await createJWT({ 
        id: userInfo.id
    }, '168h');

    res.cookie('token', token, { maxAge: 2592000000, httpOnly: true });
}

module.exports = loginUser;
