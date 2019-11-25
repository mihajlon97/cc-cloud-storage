const express 		= require('express');
const logger 	    = require('morgan');
const bodyParser 	= require('body-parser');
const pe         = require('parse-error');
const cors       = require('cors');

const routes = require('./routes')(express);

const index = express();

index.use(logger('dev'));
index.use(bodyParser.json());
index.use(bodyParser.urlencoded({ extended: false }));

// CORS
index.use(cors());

// API Routes
index.use('/', routes);

// Catch 404 and forward to error handler
index.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


// LowDB
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

// Set some defaults (required if your JSON file is empty)
db.defaults({ persons: [] }).write()


//This is here to handle all the uncaught promise rejections
process.on('unhandledRejection', error => {
    console.error('Uncaught Error', pe(error));
});

const port = '8888';

//Listen to port
index.listen(port);
console.log("Listening to port: " + port);
