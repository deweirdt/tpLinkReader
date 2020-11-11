const amqp = require('./amqp.controller');

require('dotenv').config();

//This will connect to the rabbitMQ
amqp.setupAMQPConnection();


console.log('Starting processing');
