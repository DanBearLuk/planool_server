function cleanup(db_instance) {
    db_instance.close();

    console.log('MongoDB disconnected');
    console.log('Server closed');
}

function regCleanup(db_instance) {
    process.on('exit', cleanup.bind(null, db_instance));
    process.on('SIGINT', cleanup.bind(null, db_instance));
    process.on('SIGTERM', cleanup.bind(null, db_instance)); 
}

module.exports = regCleanup;
