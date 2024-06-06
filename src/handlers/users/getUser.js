const validator = require('../../validate');
const ers = require('../../errorHandlers');
const { db } = require('../../db');

async function getUser(req, res) {
    const userInfo = req.body;

    if (!userInfo || !(userInfo.username || userInfo.userId)) {
        return ers.handleBadRequestError(res);
    }

    if (userInfo.username) {
        try {
            validator.validateUserInfo({ username: userInfo.username })
        } catch (e) {
            return ers.handleBadRequestError(res, 'Invalid user info');
        }
    } else if (!Number.isInteger(userInfo.userId)) {
        return ers.handleBadRequestError(res, 'Invalid user info');
    }

    try {
        const userInfo = await db.findUserRecord(userInfo);

        const publicInfo = {
            id: userInfo.id,
            username: userInfo.username,
            firstName: userInfo.username,
            secondName: userInfo.secondName,
            info: userInfo.info,
            age: userInfo.age,
            friends: userInfo.friends,
            createdPlans: userInfo.createdPlans,
            favoritePlans: userInfo.isFavoritesVisible ? userInfo.favoritePlans : []
        };

        return res.status(200).json({
            user: publicInfo
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

module.exports = getUser;
