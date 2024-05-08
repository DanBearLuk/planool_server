function handleInternalError(res, e, additional = {}) {
    console.error(e);

    return res.status(500).json({
        ...additional,
        ok: false,
        message: 'Internal error'
    });
}

function handleConflictError(res, message = 'Server Conflict', additional = {}) {
    return res.status(409).json({
        ...additional,
        ok: false,
        message
    });
}

function handleForbiddenError(res, message = 'Forbidden', additional = {}) {
    return res.status(401).json({
        ...additional,
        ok: false,
        message
    });
}

function handleBadRequestError(res, message = 'Bad Request', additional = {}) {
    return res.status(400).json({
        ...additional,
        ok: false,
        message
    });
}

function handleNotFoundError(res, message = 'Not Found', additional = {}) {
    return res.status(404).json({
        ...additional,
        ok: false,
        message
    });
}

module.exports = {
    handleInternalError, 
    handleConflictError,
    handleForbiddenError, 
    handleBadRequestError,
    handleNotFoundError
};
