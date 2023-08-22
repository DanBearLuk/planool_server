const { db, notificationEmitter } = require('./db');
const { verifyJWT } = require('./jwt');

class SocketManager {
    constructor() {
        this.clientSockets = new Map();
        this.planSockets = new Map();

        this._eventListeners = new Map();

        notificationEmitter.on('addNotification', this.showNotification.bind(this));
        notificationEmitter.on('deleteNotification', this.hideNotification.bind(this));
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
            this.clientSockets.set(userId, {
                lastSocketId: 0,
                sockets: new Map()
            });
        }

        const userSockets = this.clientSockets.get(userId);

        const socketInfo = {
            userId,
            socketId: ++userSockets.lastSocketId,
            socket: clientSocket,
            lastReceivedMessageId: -1,
            lastSentMessageId: -1,
            pending: new Map()
        };

        userSockets.sockets.set(socketInfo.socketId, socketInfo);

        this.configureClientSocket(socketInfo);
    }

    addEventListener(event, handler) {
        this._eventListeners.set(event, handler);
    }

    configureClientSocket(socketInfo) {
        socketInfo.socket.onmessage = (m) => {
            let eventData;

            try {
                eventData = JSON.parse(m.data.toString());

                if (typeof(eventData.event) !== 'string' || eventData.data === undefined) {
                    throw new Error('Invalid json data');
                }
            } catch (e) {
                socketInfo.socket.send(JSON.stringify({ 
                    event: 'error', 
                    data: 'Received invalid json data'
                }));

                return;
            }

            if (eventData.event === 'reply') {
                this._handleReply(socketInfo, eventData.data);
                
                return;
            } else if (!Number.isInteger(eventData.messageId)) {
                socketInfo.socket.send(JSON.stringify({ 
                    event: 'error', 
                    data: 'Invalid messageId'
                }));

                return;
            }

            const { isDuplicate } = this.reply(socketInfo, eventData.messageId);
            if (isDuplicate) return;

            const handler = this._eventListeners.get(eventData.event);

            if (handler) {
                handler(socketInfo, eventData.data);
            } else {
                socketInfo.socket.send(JSON.stringify({ 
                    event: 'error', 
                    data: 'Unkown event type'
                }));
            }
        };
    }

    reply(socketInfo, messageId) {
        const isDuplicate = socketInfo.lastReceivedMessageId >= messageId;

        if (!isDuplicate) {
            socketInfo.lastReceivedMessageId = messageId;
        }

        socketInfo.socket.send(JSON.stringify({ 
            event: 'reply', 
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

    showNotification(userId, notification) {
        this.emit(userId, 'showNotification', notification);
    }

    hideNotification(userId, notificationId) {
        this.emit(userId, 'hideNotification', notificationId);
    }

    emit(userIds, event, data) {
        if (!Array.isArray(userIds)) {
            userIds = [ userIds ];
        }

        const eventData = { event, data };

        const tryToSend = (socketInfo, dataToSend, attemptsLeft) => {
            const socket = socketInfo.socket;

            if (socket.readyState === 1) {
                socket.send(JSON.stringify(dataToSend));
            } else if (socket.readyState !== 0) {
                return;
            }

            const timeout = setTimeout(() => {
                if (attemptsLeft > 1) {
                    tryToSend(socketInfo, dataToSend, --attemptsLeft);
                } else {
                    this.close(socketInfo.userId, socketInfo.socketId, 1002, 'No response');
                }
            }, 1500);

            socketInfo.pending.set(dataToSend.messageId, timeout);
        };

        userIds.forEach(userId => {
            const userSocketsInfo = this.clientSockets.get(userId);
            if (!userSocketsInfo) {
                return;
            }

            const sockets = Array.from(userSocketsInfo.sockets.values());
            if (sockets.length === 0) {
                return;
            }

            sockets.forEach(socketInfo => {
                const updatedData = {
                    messageId: ++socketInfo.lastSentMessageId,
                    ...eventData
                };

                tryToSend(socketInfo, updatedData, 5);
            });
        });
    }

    send(userIds, message) {
        this.emit(userIds, 'message', message);
    }

    close(userId, socketId, code = 1000, reason = null) {
        const userSocketsInfo = this.clientSockets.get(userId);
        if (!userSocketsInfo) {
            return;
        }

        const socketInfo = userSocketsInfo.sockets.get(socketId);
        if (!socketInfo) {
            return;
        }

        socketInfo.pending.forEach((_, timeout) => {
            clearTimeout(timeout);
        });

        if (reason) socketInfo.socket.close(code, reason);
        else socketInfo.socket.close(code);

        userSocketsInfo.sockets.delete(socketId);

        if (userSocketsInfo.sockets.size === 0) {
            this.clientSockets.delete(userId);
        }
    }
}

const socketManager = new SocketManager();

// test
socketManager.addEventListener('command', async (sInfo, cmd) => {
    const parts = cmd.split(' ');

    switch (parts[0]) {
        case 'send':
            socketManager.send(sInfo.userId, parts[1]);
            break;

        case 'emit':
            socketManager.emit(sInfo.userId, parts[1], parts[2]);
            break;

        case 'whoami':
            const record = await db.findUserRecord({ userId: sInfo.userId });
            socketManager.send(sInfo.userId, record);
            break;

        default:
            socketManager.emit(sInfo.userId, 'error', 'Invalid command');
            break;
    }
})

module.exports = socketManager;
