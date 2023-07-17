const { MongoClient, ServerApiVersion } = require("mongodb");

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
    }

    async run() {
        await this._client.connect();
        await this._client.db("admin").command({ ping: 1 });
    }

    async close() {
        await this._client.close();
    }
}

module.exports = {
    default: Database
};
