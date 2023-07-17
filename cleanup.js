function cleanup(db_instance) {
    db_instance.close().then(() => {
        console.log('MongoDB disconnected');
    });

    console.log('Server closed');
}

function reg_cleanup(db_instance) {
    process.on('exit', cleanup.bind(null, db_instance));
    process.on('SIGINT', cleanup.bind(null, db_instance));
    process.on('SIGTERM', cleanup.bind(null, db_instance));
    process.on('uncaughtException', cleanup.bind(null, db_instance));   
}

module.exports = {
    reg_cleanup
};
