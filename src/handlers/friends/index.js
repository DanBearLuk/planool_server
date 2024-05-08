const acceptRequest = require('./acceptRequest');
const cancelRequest = require('./cancelRequest');
const rejectRequest = require('./rejectRequest');
const removeFriend = require('./removeFriend');
const sendRequest = require('./sendRequest');

module.exports = {
    sendRequest,
    removeFriend,
    rejectRequest,
    acceptRequest,
    cancelRequest
};
