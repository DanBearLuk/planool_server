const Config = require('../config');
const regCleanup = require('./cleanup');
const Cache = require('./cache');

const bcrypt = require('bcrypt');
const EventEmitter = require('events');
const { MongoClient, ServerApiVersion } = require('mongodb');

const Counters = {
    USERS: 'users',
    PLANS: 'plans',
    CHATS: 'chats'
};

class Database {
    constructor(address) {
        this._client = new MongoClient(address, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
        });

        this.usersCollection = this._client.db('planool').collection('users');
        this.plansCollection = this._client.db('planool').collection('plans');
        this.chatsCollection = this._client.db('planool').collection('chats');
        this.messagesCollection = this._client.db('planool').collection('messages');
        this.countersCollection = this._client.db('planool').collection('counters');

        this.emitter = new EventEmitter();
        this.cache = new Cache('users', 'chats', 'plans');
    }

    async run() {
        await this._client.connect();
        await this._client.db('admin').command({ ping: 1 });
    }

    async close() {
        await this._client.close();
    }

    async getNewId(counterType) {
        if (!Counters[counterType.toUpperCase()]) {
            throw new Error('Unknown type');
        }

        const result = await this.countersCollection.findOneAndUpdate(
            { type: counterType },
            { $inc: { seq_value: 1 }}, 
            { returnDocument: 'after' }
        );

        return result.value.seq_value;
    }

    async findUserRecord({ username = null, userId = null }) {
        if (!username && !userId) {
            throw new Error('Incorrect arguments');
        }

        if (userId && this.cache.has('users', userId)) {
            return this.cache.get('users', userId);
        }

        let record;
        
        if (username) {
            record = await this.usersCollection.findOne({
                username: username
            });
        } else {
            record = await this.usersCollection.findOne({
                id: userId
            });
        }

        if (record) {
            delete record._id;
            this.cache.set('users', record.id, record);
        }

        return record;
    }

    async addUserRecord(username, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newId = await this.getNewId(Counters.USERS);

        const user = {
            id: newId,
            username,
            password: hashedPassword,
            avatarUrl: '',
            firstName: '',
            secondName: '',
            info: '',
            age: 0,
            chats: [],
            friends: [],
            friendRequests: {
                inbox: [],
                outbox: []
            },
            createdPlans: [],
            favoritePlans: [],
            lastNotificationId: 0,
            notifications: [],
            isFavoritesVisible: true
        };
        
        await this.usersCollection.insertOne(user);

        this.cache.set('users', user.id, user);
        return user;
    }

    async updateUserRecord(userId, info) {
        const instructions = {
            $set: info.set ?? {},
            $push: info.push ?? {},
            $pull: info.pull ?? {}
        };

        const record = (await this.usersCollection.findOneAndUpdate(
            { id: userId },
            instructions,
            { returnDocument: 'after' }
        )).value;

        if (!record) {
            throw new Error('User not found');
        }

        delete record._id;
        this.cache.set('users', record.id, record);

        return record;
    }

    async addNotification(userId, notification) {
        const result = (await this.usersCollection.findOneAndUpdate(
            { id: userId },
            [
                {
                    $set: {
                        lastNotificationId: { 
                            $add: ['$lastNotificationId', 1] 
                        }
                    }
                },
                {
                    $set: {
                        notifications: {
                            $concatArrays: ['$notifications', [
                                {
                                    ...notification,
                                    id: '$lastNotificationId',
                                    datetime: new Date()
                                }
                            ]]
                        }
                    }
                }
            ],
            { returnDocument: 'after' }
        )).value;

        if (!result) {
            throw new Error('User not found');
        }

        delete result._id;
        this.cache.set('users', result.id, result);
        
        const notifications = result.notifications;
        const notificationRecord = notifications[notifications.length - 1];

        this.emitter.emit('addNotification', result.id, notificationRecord);
        return notificationRecord;
    }

    async deleteNotification(userId, notificationId) {
        const result = (await this.usersCollection.findOneAndUpdate(
            { id: userId },
            { $pull: { notifications: { id: notificationId }}},
            { returnDocument: 'after' }
        )).value;

        if (!result) {
            throw new Error('User not found');
        }

        delete result._id;
        this.cache.set('users', result.id, result);

        this.emitter.emit('deleteNotification', result.id, notificationId);
        return result.ok;
    }

    async addPlanRecord(planInfo) {
        const newId = await this.getNewId(Counters.PLANS);
        const encodedId = Buffer.from(newId.toString()).toString('base64url');

        const plan = {
            id: encodedId,
            author: planInfo.author,
            title: planInfo.title,
            startDate: null,
            endDate: null,
            description: '',
            visibility: planInfo.visibility,
            isOnlyApproved: planInfo.isOnlyApproved,
            participants: [],
            whitelist: [],
            blacklist: [],
            collaborators: [],
            isFinished: false,
            type: planInfo.type,
            theme: 'default',
            cards: []
        };

        if (planInfo.venue) {
            plan.venue = planInfo.venue;
        }
        
        await this.plansCollection.insertOne(plan);

        const userRecord = (await this.usersCollection.findOneAndUpdate(
            { id: planInfo.author },
            { $push: { createdPlans: plan.id }},
            { returnDocument: 'after' }
        )).value;

        delete userRecord._id;
        this.cache.set('plans', plan.id, record);
        this.cache.set('users', userRecord.id, userRecord);

        return plan;
    }

    async updatePlanRecord(planId, info) {
        const record = (await this.plansCollection.findOneAndUpdate(
            { id: planId },
            { $set: info },
            { returnDocument: 'after' }
        )).value;

        if (!record) {
            throw new Error('Plan not found');
        }

        delete record._id;
        this.cache.set('plans', record.id, record);

        return record;
    }

    async deletePlanRecord(userId, planId) {
        const result = (await this.plansCollection.deleteOne(
            { id: planId}
        ));

        const userRecord = (await this.usersCollection.findOneAndUpdate(
            { id: userId },
            { $pull: { createdPlans: planId }},
            { returnDocument: 'after' }
        )).value;

        if (result.deletedCount === 1 && this.cache.has('plans', planId)) {
            this.cache.del('plans', planId);
        }

        if (userRecord) {
            delete userRecord._id;
            this.cache.set('users', userId, userRecord);
        }

        return result.deletedCount === 1;
    }

    async findPlanRecord(planId) {
        if (this.cache.has('plans', planId)) {
            return this.cache.get('plans', planId);
        }

        const record = await this.plansCollection.findOne({
            id: planId
        });

        if (record) {
            delete record._id;
            this.cache.set('plans', record.id, record);
        }

        return record;
    }

    async createChat(chatInfo, chatId = '') {
        if (!chatId) {
            const newId = (await this.getNewId(Counters.CHATS)).toString();
            chatId = Buffer.from(newId).toString('base64url');
        }

        chatInfo.id = chatId;
        chatInfo.lastMessageId = -1;
        chatInfo.lastMessage = {};

        try {
            await this.chatsCollection.insertOne(chatInfo);
        } catch (e) {
            if (e.code === 11000) {
                throw new Error('Chat already exists');
            } else {
                throw e;
            }
        }

        const shortChatInfo = {
            type: chatInfo.type,
            id: chatInfo.id
        };

        const membersIds = chatInfo.members.map(m => m.id);

        await this.usersCollection.updateMany(
            { id: { $in: membersIds }},
            { $addToSet: { 
                chats: shortChatInfo
            }}
        );

        this.cache.set('chats', chatInfo.id, chatInfo);

        for (let member of memberIds) {
            if (this.cache.has('users', member)) {
                const user = this.cache.get('users', member);

                if (!user.chats.includes(c => c.id === chatInfo.id)) {
                    user.chats.push(shortChatInfo);
                }
            }
        }

        return chatInfo;
    }

    async findChatRecord(chatId) {
        if (this.cache.has('chats', chatId)) {
            return this.cache.get('chats', chatId);
        }

        const record = this.chatsCollection.findOne({
            id: chatId
        });

        if (record) {
            delete record._id;
            this.cache.set('chats', record.id, record);
        }

        return record;
    }

    async addNewMessage(chatId, from, msg) {
        const msgInfo = {
            chatId,
            from,
            message: msg,
            deleted: false,
            timestamp: Date.now()
        };

        const updatedChat = (await this.chatsCollection.findOneAndUpdate(
            { id: chatId },
            [
                {
                    $set: {
                        lastMessageId: { 
                            $add: ['$lastMessageId', 1] 
                        },
                    },
                },
                {
                    $set: {
                        lastMessage: { 
                            messageId: '$lastMessageId',
                            from: msgInfo.from,
                            message: msgInfo.message,
                            timestamp: msgInfo.timestamp
                        },
                    },
                },
            ],
            { returnDocument: 'after' }
        )).value;

        if (!updatedChat) {
            throw new Error('Chat not found');
        } else {
            delete updatedChat._id;
            this.cache.set('chats', updatedChat.id, updatedChat);
        }

        const newMessageId = updatedChat.lastMessageId;
        msgInfo.messageId = newMessageId;

        await this.messagesCollection.insertOne(msgInfo);

        const memberIds = updatedChat.members.map(m => m.id);
        const fromIdx = memberIds.indexOf(from);

        if (fromIdx > -1) {
            memberIds.splice(fromIdx);
        }

        return msgInfo;
    }

    getMessages(chatId, { from = null, messageIds = null, limit = 100 }) {
        const filter = {
            chatId
        };

        if (from) {
            filter.from = from;
        }

        if (messageIds) {
            filter.messageId = {
                $in: messageIds
            };
        }

        const messagesCursor = this.messagesCollection
            .find(filter)
            .sort({ messageId: -1 });

        if (!messagesIds && limit) {
            messagesCursor = messagesCursor.limit(limit);
        }

        return messagesCursor;
    }

    async deleteMessages(chatId, { from = null, messageIds = null }) {
        if (!from && !messageIds) {
            throw new Error('Incorrect arguments');
        }

        const chat = await this.findChatRecord(chatId);

        const filter = {
            chatId: chatId
        };

        if (from) {
            filter.from = from;
        }

        if (messageIds) {
            filter.messageId = {
                $in: messageIds
            };
        }

        const result = await this.messagesCollection.updateMany(filter, { 
            $set: { deleted: true },
            $unset: { message: 1 }
        });

        if (messageIds.includes(chat.lastMessage.messageId)) {
            const updatedChat = await this.chatsCollection.updateOne(
                { id: chatId },
                { 
                    $set: { 'lastMessage.deleted': true },
                    $unset: { 'lastMessage.message': 1 }
                },
                { returnDocument: 'after' }
            );

            delete updatedChat._id;
            this.cache.set('chats', updatedChat.id, updatedChat);
        }

        return { deletedCount: result.modifiedCount };
    }
}

const db = new Database(Config.DB.ADDRESS, Config.DB.USERNAME, Config.DB.PASSWORD);

db.run().then(() => {
    console.log('MongoDB connected');
    regCleanup(db);
}).catch(e => {
    db.close();
    console.error('MongoDB connection error');
    console.dir(e);
});

module.exports = {
    db
};
