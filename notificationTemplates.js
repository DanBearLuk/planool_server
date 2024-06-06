const Config = require("./config");

const useTemplate = (template, vars) => {
    const templateCopy = structuredClone(template);
    const re = /\{.+?\}/g;
    
    const setValues = (txt) => {
        const replacer = (match) => match.split('.').reduce((obj, key) => obj?.[key], vars);
        txt.replace(re, replacer);
    }

    templateCopy.text = setValues(templateCopy.text);
    templateCopy.icon = setValues(templateCopy.icon);

    if (templateCopy.buttons) {
        templateCopy.buttons.forEach(button => {
            if (Object.hasOwn(button, 'url')) {
                button.url = setValues(button.url);
            }
        });
    }

    return templateCopy;
};

const INCOMING_FRIEND_REQUEST = {
    text: 'New friend request from <a href="users/{user.id}">{user.username}</a>.',
    icon: `${Config.SERVER_ADDRESS}:${Config.SERVER_PORT}/public/avatars/{user.id}`,
    buttons: [
        { type: 'accept', url: '' },
        { type: 'reject', url: '' }
    ]
};

const ACCEPTED_FRIEND_REQUEST = {
    text: 'Friend request to <a href="users/{user.id}">{user.username}</a> has been accepted.',
    icon: `${Config.SERVER_ADDRESS}:${Config.SERVER_PORT}/public/avatars/{user.id}`
};

module.exports = {
    useTemplate,
    INCOMING_FRIEND_REQUEST,
    ACCEPTED_FRIEND_REQUEST
};
