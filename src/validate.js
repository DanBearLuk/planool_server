const validator = require('validator');

function isAllowedKeys(obj, keys) {
    return Object.keys(obj).every(k => keys.includes(k));
}

function isTrimmable(str) {
    return str.trim().length !== str.length;
}

function checkRequiredFields(body, fields) {
    return fields.every(f => Object.keys(body).includes(f));
}

function validateUserInfo(userInfo) {
    const allowedFields = [
        'username', 'password', 'firstName', 
        'secondName', 'info', 'age', 
        'isFavoritesVisible'
    ];

    if (!isAllowedKeys(userInfo, allowedFields)) {
        throw new Error('Invalid parameters');
    }

    if (userInfo.username) {
        const check =
            typeof(userInfo.username) === 'string' &&
            validator.isAlphanumeric(userInfo.username, 'en-US', { ignore: ' -_' }) && 
            !isTrimmable(userInfo.username) &&
            validator.isLength(userInfo.username, { min: 3, max: 16 });
        
        if (!check) {
            throw new Error('Invalid username');
        }
    }

    if (userInfo.password) {
        const check =
            typeof(userInfo.password) === 'string' &&
            validator.isStrongPassword(userInfo.password) &&
            !isTrimmable(userInfo.password) &&
            validator.isLength(userInfo.password, { min: 8, max: 24 });
        
        if (!check) {
            throw new Error('Invalid password');
        }
    }

    if (userInfo.firstName) {
        const check =
            typeof(userInfo.firstName) === 'string' &&
            validator.isAlpha(userInfo.firstName, 'en-US', { ignore: ' -'}) &&
            !isTrimmable(userInfo.firstName) &&
            validator.isLength(userInfo.firstName, { min: 1, max: 36 });
        
        if (!check) {
            throw new Error('Invalid firstname');
        }
    }

    if (userInfo.secondName) {
        const check =
            typeof(userInfo.secondName) === 'string' &&
            validator.isAlpha(userInfo.secondName, 'en-US', { ignore: ' -'}) &&
            !isTrimmable(userInfo.secondName) &&
            validator.isLength(userInfo.secondName, { min: 1, max: 36 });
        
        if (!check) {
            throw new Error('Invalid secondname');
        }
    }

    if (userInfo.info) {
        const check =
            typeof(userInfo.info) === 'string' &&
            validator.isLength(userInfo.info, { min: 1, max: 1000 });
        
        if (!check) {
            throw new Error('Invalid info');
        }
    }

    if (userInfo.age) {
        const check =
            Number.isInteger(userInfo.age) &&
            userInfo.age > 0 &&
            userInfo.age < 150;
        
        if (!check) {
            throw new Error('Invalid age');
        }
    }

    if (userInfo.isFavoritesVisible) {
        const check =
            typeof(userInfo.isFavoritesVisible) === 'boolean';
        
        if (!check) {
            throw new Error('Invalid favorites visibility');
        }
    }
}

function validatePlanInfo(planInfo, checkRequired = false) {
    const requiredFields = [
        'title', 'visibility', 'type',
        'isOnlyApproved'
    ];

    const allowedFields = [
        'title', 'visibility', 'type',
        'venue', 'isOnlyApproved'
    ];

    const venueAllowedFields = [
        'gameTitle', 'country', 'place'
    ];

    const visibilityTypes = [
        'public', 'private', 'friends',
        'link_access'
    ];

    const types = [
        'worldtravel', 'countrytravel', 
        'game', 'tour', 'indoorparty',
        'outdoorparty', 'virtualparty'
    ];

    if (checkRequired && !checkRequiredFields(planInfo, requiredFields)) {
        throw new Error('Invalid parameters');
    }

    if (!isAllowedKeys(planInfo, allowedFields)) {
        throw new Error('Invalid parameters');
    }
    
    if (planInfo.venue && !isAllowedKeys(planInfo.venue, venueAllowedFields)) {
        throw new Error('Invalid parameters');
    }

    if (planInfo.title) {
        const check =
            typeof(planInfo.title) === 'string' && 
            !isTrimmable(planInfo.title) &&
            validator.isLength(planInfo.title, { min: 3, max: 64 });
        
        if (!check) {
            throw new Error('Invalid title');
        }
    }

    if (planInfo.visibility) {
        planInfo.visibility = planInfo.visibility.toLowerCase();

        const check =
            typeof(planInfo.visibility) === 'string' &&
            validator.isIn(planInfo.visibility, visibilityTypes);
        
        if (!check) {
            throw new Error('Invalid visibility');
        }
    }

    if (planInfo.isOnlyApproved) {
        const check =
            typeof(planInfo.isOnlyApproved) === 'boolean';
        
        if (!check) {
            throw new Error('Invalid value for only approved field');
        }
    }

    if (planInfo.type) {
        planInfo.type = planInfo.type.toLowerCase();

        let check =
            typeof(planInfo.type) === 'string' &&
            validator.isIn(planInfo.type, types);

        if (!check) {
            throw new Error('Invalid type');
        }

        const venue = planInfo.venue;
        if (planInfo.type === 'game') {
            check =
                venue && 
                venue.gameTitle &&
                typeof(venue.gameTitle) === 'string';
        } else if (planInfo.type !== 'virtualparty') {
            check =
                venue && 
                venue.country &&
                venue.city &&
                typeof(venue.country) === 'string' &&
                typeof(venue.city) === 'string';
        }
        
        if (!check) {
            throw new Error('Invalid venue info');
        }
    }
}

function validateMessage(message) {
    const allowedFields = [
        'text'
    ];

    if (!isAllowedKeys(message, allowedFields)) {
        throw new Error('Invalid parameters');
    }

    const check =
        message.text !== undefined &&
        typeof(message.text) === 'string' && 
        !isTrimmable(message.text) &&
        validator.isLength(message.text, { min: 1, max: 4096 });
    
    if (!check) {
        throw new Error('Invalid text');
    }
}

module.exports = {
    validateUserInfo, 
    validatePlanInfo, 
    checkRequiredFields,
    validateMessage
};
