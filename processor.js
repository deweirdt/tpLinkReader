const amqp = require('./amqp.controller');

require('dotenv').config();

//This will connect to the rabbitMQ
amqp.setupAMQPConnection();


/*
amqp.consumeAMQP(process.env.RABBIT_MQ_EXCHANGE, process.env.RABBIT_MQ_QUEUE_TEST, function(data, processed) {
    console.log("Data received: ", data);
});
*/
amqp.consumeAMQP(process.env.RABBIT_MQ_EXCHANGE, process.env.RABBIT_MQ_QUEUE_TEST, processMsg);

function processMsg(msg, confirm) {
    const data = JSON.parse(msg);
    console.log("Message received: ", data);
    //If message is processed then we can confirm it
    //confirm(true);
}


console.log('Starting processing');
