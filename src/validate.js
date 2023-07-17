const validator = require('validator');

function validateAuthInfo(username, password) {
    const isUsernameValid = 
        validator.isAlphanumeric(username, 'en-US', { ignore: ' -_' }) && 
        validator.isLength(username, { min: 3, max: 16 });

    const isPasswordValid = 
        validator.isStrongPassword(password) &&
        validator.isLength(password, { min: 8, max: 24 });

    return isUsernameValid && isPasswordValid;
}

module.exports = {
    validateAuthInfo
}
