const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
// const fileUpload = require('express-fileupload');
const logger = require('morgan');
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

// const { Server } = require("socket.io");




var app = express();
app.use(bodyParser.json());
app.use(cors({ credentials: true, origin: '*' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.locals.moment = moment = require('moment-timezone');

var WebSocketIo;
var db;
const sessionsMap = {};

app.bigStart = async (io) => {

    // WebSocketIo = require('socket.io')(server, { cors: { origin: "*" } });

    WebSocketIo = io

    WebSocketIo.on('connection', function (socket) {
        console.log('a user connected ' + socket.id);
        socket.emit('askForUserId', socket.id);

        socket.on('userIdReceived', (userId) => {
            sessionsMap[userId] = socket.id;
        });
        socket.on('disconnect', function () {
            // console.log('user disconnected ' + socket.id);
        });
    });

    try {

        client = new MongoClient(process.env.MONGO_ARC || process.env.mongoexternal)
        connection = await client.connect();
        db = await client.db('Freelance')
        await db.command({ ping: 1 });
        await cargaDadosByOwner();
    } catch (error) {
        console.log(JSON.stringify(process.env))
        console.error(error);
    }

}

cargaDadosByOwner = function () {

    db.collection('projects').watch()

        .on('change', (change) => {

            WebSocketIo.emit('alterProject', change);
        });
}

app.use(function (req, res, next) {
    res.setTimeout(600 * 1000);
    req.db = db;
    req.socket = WebSocketIo;
    req.cargaDadosByOwner = cargaDadosByOwner;
    next();
});

const apicache = require('apicache')
let cache = apicache.middleware


app.use('/api/proj', require('./routes/proj'));
app.use('/api/bid', require('./routes/bid'));
app.use('/api/util', cache("3 hours"), require('./routes/util'));

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;