const Config = require('./config').default;
const Database = require('./db').default;

const reg_cleanup = require('./cleanup').reg_cleanup;

const express = require('express');

const db = new Database(Config.DB.ADDRESS, Config.DB.USERNAME, Config.DB.PASSWORD);

db.run().then(() => {
    console.log('MongoDB connected');

    reg_cleanup(db);
}).catch(e => {
    db.close();

    console.error('MongoDB connection error');
    console.dir(e);
});

const app = express();

