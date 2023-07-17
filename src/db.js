const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcrypt');

const Counters = {
    USERS: 'users'
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
        return this.countersCollection.findOneAndUpdate(
            { type: counterType },
            { $inc: { seq_value: 1 }}, 
            { returnDocument: 'after' }
        )
    }

    async findUserRecord(username) {
        return this.usersCollection.findOne({
            username
        });
    }

    async addUserRecord(username, password) {
        const isTaken = await this.findUserRecord(username) !== null;

        if (isTaken) throw new Error('User already exists');

        const hashedPassword = await bcrypt.hash(password, 10);
        const newId = (await this.getNewId(Counters.USERS)).value.seq_value;

        const user = {
            id: newId,
            username,
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
        const record = await this.usersCollection.insertOne({
            ...user,
            password: hashedPassword
        });

        return user;
    }
}

module.exports = {
    default: Database
};
