const { db } = require('./db');
const { verifyJWT } = require('./jwt');

class SocketManager {
    constructor() {
        this.clientSockets = new Map();
        this.sockets = new Map();

        this._lastSocketId = -1;
        this._routes = new Map();

        db.emitter.on('addNotification', (userId, notification) => {
            this.emitToClients(userId, 'newNotification', notification);
        });

        db.emitter.on('deleteNotification', (userId, notificationId) => {
            this.emitToClients(userId, 'dismissNotification', notificationId);
        });
    }

    async _authorize(request) {
        const token = request.cookies.token;
        let userId;

        if (!token) {
            throw new Error('Socket connection attempt without token')
        }

        try {
            userId = (await verifyJWT(token)).id;
        } catch {
            throw new Error('Socket connection attempt using invalid token')
        }

        try {
            const record = await db.findUserRecord({ userId });

            if (!record) {
                throw new Error('Socket authorization error')
            }
        } catch (e) {
            throw new Error('Internal server error')
        }

        return userId;
    }

    async onConnection(clientSocket, request) {
        let userId;

        try {
            userId = await this._authorize(request);
        } catch (e) {
            clientSocket.close(1002, e.message);
        }

        if (!this.clientSockets.has(userId)) {
            this.clientSockets.set(userId, []);
        }

        const userSockets = this.clientSockets.get(userId);

        const socketInfo = {
            userId,
            socketId: ++this._lastSocketId,
            socket: clientSocket,
            lastReceivedMessageId: -1,
            lastSentMessageId: -1,
            pending: new Map()
        };

        userSockets.push(socketInfo.socketId);
        this.sockets.set(socketInfo.socketId, socketInfo);

        this._configureClientSocket(socketInfo);

        this.emit(socketInfo.socketId, 'handshake', {
            socketId: socketInfo.socketId 
        });
    }

    _useRoutesMap(localRoutes, routesMap) {
        for (const [key, value] of routesMap) {
            if (key === '/') {
                if (localRoutes.has('/')) {
                    localRoutes.get('/').push(...value);
                } else {
                    localRoutes.set('/', [...value]);
                }

                continue;
            }

            if (localRoutes.has(key)) {
                this._useRoutesMap(localRoutes.get(key), value);
            } else {
                const newRoute = new Map();

                localRoutes.set(key, newRoute);
                this._useRoutesMap(newRoute, value);
            }
        }
    }

    use(route, handler) {
        const paths = route.split('/').filter(p => p !== '');
        
        let curRoute = this._routes;

        for (const path of paths) {
            if (curRoute.has(path)) {
                curRoute = curRoute.get(path);
            } else {
                curRoute.set(path, new Map());
                curRoute = curRoute.get(path);
            }
        }

        if (handler instanceof SocketRouter) {
            this._useRoutesMap(curRoute, handler.routes);
            return;
        }

        if (curRoute.has('/')) {
            curRoute.get('/').push(handler);
        } else {
            curRoute.set('/', [handler]);
        }
    }

    _getHandlers(route) {
        const paths = route.split('/').filter(p => p !== '');

        let curRoute = this._routes;

        for (const path of paths) {
            if (!curRoute.has(path)) {
                return undefined;
            }

            curRoute = curRoute.get(path);
        }

        return curRoute.get('/');
    }

    getSocketIds(userIds) {
        if (!Array.isArray(userIds)) {
            userIds = [userIds];
        }

        const socketIds = [];

        for (let userId of userIds) {
            const userSockets = this.clientSockets.get(userId) || [];
            socketIds.push(...userSockets);
        }

        return socketIds;
    }

    _configureClientSocket(socketInfo) {
        socketInfo.socket.onmessage = (m) => {
            let request;

            try {
                request = JSON.parse(m.data.toString());

                if (typeof(request.route) !== 'string' || request.data === undefined) {
                    throw new Error('Invalid request');
                }
            } catch (e) {
                socketInfo.socket.send(JSON.stringify({ 
                    route: 'error', 
                    data: 'Received invalid request'
                }));

                return;
            }

            if (request.route === 'reply') {
                this._handleReply(socketInfo, request.data);
                
                return;
            } else if (!Number.isInteger(request.messageId)) {
                socketInfo.socket.send(JSON.stringify({ 
                    route: 'error', 
                    data: 'Invalid messageId'
                }));

                return;
            }

            const { isDuplicate } = this._reply(socketInfo, request.messageId);
            if (isDuplicate) return;

            const handlers = this._getHandlers(request.route);

            const response = (code, data) => this.emit(
                socketInfo.socketId,
                'response',
                { 
                    toMessage: request.messageId,
                    code: code, 
                    result: data
                }
            );

            if (handlers) {
                const req = {
                    socketInfo,
                    data: request.data
                };
                
                const executeHandler = (handlerIndex) => {
                    const next = () => {
                        if (handlerIndex < handlers.length - 1) {
                            executeHandler(++handlerIndex);
                        }
                    };

                    handlers[handlerIndex](req, response, next);
                }

                executeHandler(0);
            } else {
                response(400, { message: 'Unknown route' });
            }
        };
    }

    _reply(socketInfo, messageId) {
        if (!socketInfo) {
            throw new Error('Incorrect socket\'s info');
        }

        const isDuplicate = socketInfo.lastReceivedMessageId >= messageId;

        if (!isDuplicate) {
            socketInfo.lastReceivedMessageId = messageId;
        }

        socketInfo.socket.send(JSON.stringify({ 
            route: 'reply', 
            data: messageId, 
        }));

        return { isDuplicate };
    }

    _handleReply(socketInfo, messageId) {
        const timeout = socketInfo.pending.get(messageId);

        if (timeout) {
            clearTimeout(timeout);
            socketInfo.pending.delete(messageId);
        }
    }

    emit(socketIds, route, data) {
        if (!Array.isArray(socketIds)) {
            socketIds = [socketIds];
        }

        const msg = { route, data };

        const tryToSend = (socketInfo, message, attemptsLeft) => {
            const socket = socketInfo.socket;

            if (socket.readyState === 1) {
                socket.send(JSON.stringify(message));
            } else if (socket.readyState !== 0) {
                return;
            }

            const timeout = setTimeout(() => {
                if (attemptsLeft > 1) {
                    tryToSend(socketInfo, message, --attemptsLeft);
                } else {
                    this.close(socketInfo.userId, socketInfo.socketId, 1002, 'No response');
                }
            }, 1500);

            socketInfo.pending.set(message.messageId, timeout);
        };

        for (let socketId of socketIds) {
            const socketInfo = this.sockets.get(socketId);

            const updatedMsg = {
                messageId: ++socketInfo.lastSentMessageId,
                ...msg
            };

            tryToSend(socketInfo, updatedMsg, 5);
        }
    }

    emitToClients(userIds, route, data, excludedSocket = null) {
        const sockets = this.getSocketIds(userIds);

        if (excludedSocket !== null) {
            const index = sockets.indexOf(excludedSocket);
            
            if (index > -1) {
                sockets.splice(index, 1);
            }
        }

        this.emit(sockets, route, data);
    }

    close(socketId, code = 1000, reason = null) {
        const socketInfo = this.sockets.get(socketId);
        if (!socketInfo) {
            return;
        }

        socketInfo.pending.forEach((_, timeout) => {
            clearTimeout(timeout);
        });

        if (reason) socketInfo.socket.close(code, reason);
        else socketInfo.socket.close(code);

        const userSockets = this.clientSockets.get(socketInfo.userId);
        if (userSockets) {
            const index = userSockets.indexOf(socketId);

            if (index > -1) {
                userSockets.splice(index, 1);
            }
        }

        if (userSockets.length === 0) {
            this.clientSockets.delete(socketInfo.userId);
        }
    }
}

class SocketRouter {
    constructor() {
        this.routes = new Map();
    }

    use(route, handler) {
        const paths = route.split('/').filter(p => p !== '');
        
        let curRoute = this.routes;

        for (const path of paths) {
            if (curRoute.has(path)) {
                curRoute = curRoute.get(path);
            } else {
                curRoute.set(path, new Map());
                curRoute = curRoute.get(path);
            }
        }

        if (curRoute.has('/')) {
            curRoute.get('/').push(handler);
        } else {
            curRoute.set('/', [handler]);
        }
    }
}

const socketManager = new SocketManager();

// test
socketManager.use('test/command', async (request, response) => {
    const parts = request.data.split(' ');

    switch (parts[0]) {
        case 'whoami':
            const record = await db.findUserRecord({ userId: request.socketInfo.userId });

            const { socket, ...socketInfo } = request.socketInfo;
            return response(200, { user: record, socket: socketInfo });

        default:
            socketManager.emit(request.socketInfo.socketId, 'error', 'Invalid command');
            break;
    }
});

module.exports = { 
    socketManager,
    SocketRouter
};
