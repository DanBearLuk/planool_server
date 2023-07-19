function handleInternalError(res, e) {
    console.error(e);

    return res.status(500).json({
        message: 'Internal error'
    });
}

function handleConflictError(res, message = 'Server Conflict') {
    return res.status(409).json({
        message
    });
}

function handleForbiddenError(res, message = 'Forbidden') {
    return res.status(401).json({
        message
    });
}

function handleBadRequestError(res, message = 'Bad Request') {
    return res.status(400).json({
        message
    });
}

function handleNotFoundError(res, message = 'Not Found') {
    return res.status(404).json({
        message
    });
}

module.exports = {
    handleInternalError, handleConflictError,
    handleForbiddenError, handleBadRequestError,
    handleNotFoundError
};
