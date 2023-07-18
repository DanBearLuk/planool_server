const validator = require('validator');

function validateUserInfo(userInfo) {
    let validateResult = true;

    const allowedFields = [
        'username', 'password', 'firstName', 
        'secondName', 'info', 'age', 
        'isFavoritesVisible'
    ];

    if (!Object.keys(userInfo).every(k => allowedFields.includes(k))) {
        return false;
    }

    if (userInfo.username) {
        validateResult = validateResult &&
            typeof(userInfo.username) === 'string' &&
            validator.isAlphanumeric(userInfo.username, 'en-US', { ignore: ' -_' }) && 
            validator.isLength(userInfo.username, { min: 3, max: 16 });
    }

    if (userInfo.password) {
        validateResult = validateResult &&
            typeof(userInfo.password) === 'string' &&
            validator.isStrongPassword(userInfo.password) &&
            validator.isLength(userInfo.password, { min: 8, max: 24 });
    }

    if (userInfo.firstName) {
        validateResult = validateResult &&
            typeof(userInfo.firstName) === 'string' &&
            validator.isAlpha(userInfo.firstName, 'en-US', { ignore: ' -'}) &&
            validator.isLength(userInfo.firstName, { min: 1, max: 36 });
    }

    if (userInfo.secondName) {
        validateResult = validateResult &&
            typeof(userInfo.secondName) === 'string' &&
            validator.isAlpha(userInfo.secondName, 'en-US', { ignore: ' -'}) &&
            validator.isLength(userInfo.secondName, { min: 1, max: 36 });
    }

    if (userInfo.info) {
        validateResult = validateResult &&
            typeof(userInfo.info) === 'string' &&
            validator.isLength(userInfo.info, { min: 1, max: 1000 });
    }

    if (userInfo.age) {
        validateResult = validateResult &&
            Number.isInteger(userInfo.age) &&
            userInfo.age > 0 &&
            userInfo.age < 150;
    }

    if (userInfo.isFavoritesVisible) {
        validateResult = validateResult &&
            typeof(userInfo.isFavoritesVisible) === 'boolean';
    }

    return validateResult;
}

module.exports = {
    validateUserInfo
}
