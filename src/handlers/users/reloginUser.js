const ers = require('../../errorHandlers');
const { createJWT } = require('../../jwt');

async function reloginUser(req, res) {
    const user = req.user;

    try {
        const token = await createJWT({ 
            id: user.id
        }, '168h');

        delete user.password;

        res.cookie('token', token, { maxAge: 2592000000, httpOnly: true });
        return res.status(200).json({
            user: user
        });
    } catch (e) {
        return ers.handleInternalError(res, e);
    }
}

module.exports = reloginUser;
