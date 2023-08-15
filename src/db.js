const Config = require('../config');
const regCleanup = require('./cleanup');
const bcrypt = require('bcrypt');
const { MongoClient, ServerApiVersion } = require('mongodb');

const Counters = {
    USERS: 'users',
    PLANS: 'plans'
};

class Database {
    constructor(address, username, password) {
        const uri = `mongodb+srv://${username}:${password}@${address}/?retryWrites=true&w=majority`;

        this._client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
        });

        this.usersCollection = this._client.db('planool').collection('users');
        this.plansCollection = this._client.db('planool').collection('plans');
        this.countersCollection = this._client.db('planool').collection('counters');
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

        return this.countersCollection.findOneAndUpdate(
            { type: counterType },
            { $inc: { seq_value: 1 }}, 
            { returnDocument: 'after' }
        );
    }

    async findUserRecord({ username = null, userId = null }) {
        if (!username && !userId) {
            throw new Error('Incorrect arguments');
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
        }

        return record;
    }

    async addUserRecord(username, password) {
        const isTaken = await this.findUserRecord({ username }) !== null;

        if (isTaken) throw new Error('User already exists');

        const hashedPassword = await bcrypt.hash(password, 10);
        const newId = (await this.getNewId(Counters.USERS)).value.seq_value;

        const user = {
            id: newId,
            username,
            password: hashedPassword,
            avatarUrl: '',
            firstName: '',
            secondName: '',
            info: '',
            age: 0,
            friends: [],
            createdPlans: [],
            favoritePlans: [],
            isFavoritesVisible: true
        };
        
        await this.usersCollection.insertOne(user);

        delete user._id;
        return user;
    }

    async updateUserRecord(id, info) {
        if (info.set && info.set.username) {
            const isTaken = await this.findUserRecord({ 
                username: info.set.username 
            }) !== null;

            if (isTaken) throw new Error('Username is already taken');
        }

        if (info.set && info.set.password) {
            info.set.password = await bcrypt.hash(info.set.password, 10);
        }

        const instructions = {
            $set: info.set ?? {},
            $push: info.push ?? {},
            $pull: info.pull ?? {}
        };

        const record = (await this.usersCollection.findOneAndUpdate(
            { id },
            instructions,
            { returnDocument: 'after' }
        )).value;

        if (!record) {
            throw new Error('User not found');
        }

        delete record._id;
        return record;
    }

    async addPlanRecord(planInfo) {
        const newId = (await this.getNewId(Counters.PLANS)).value.seq_value;
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

        await this.updateUserRecord(planInfo.author, {
            push: {
                createdPlans: newId
            }
        });

        delete plan._id;
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
        return record;
    }

    async deletePlanRecord(userId, planId) {
        const result = (await this.plansCollection.deleteOne(
            { id: planId}
        ));

        await this.updateUserRecord(userId, {
            pull: {
                createdPlans: planId
            }
        });

        return result.deletedCount === 1;
    }

    async findPlanRecord(planId) {
        return this.plansCollection.findOne({
            id: planId
        });
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

module.exports = db;
