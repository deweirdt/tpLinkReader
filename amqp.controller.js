const amqp = require('amqplib/callback_api');
require('dotenv').config();
let channel = null;

var offlinePubQueue = [];
module.exports.publishAMQP = function publishAMQP(data) {  
  try {
    channel.publish(  process.env.RABBIT_MQ_EXCHANGE,
                      '', 
                      Buffer.from(JSON.stringify(data)), 
                      { persistent: true },
                      function(err, ok) {
      if(err) {
        console.error("sendDataToAMQP could not write to channel: ", err);
        console.log("put on local stack");
        offlinePubQueue.push(data);
      } else {
        console.log("Message correctly stored on the AMQP");
      }
    });
    } catch(e) {
      console.log("put on local stack");
      offlinePubQueue.push(data);
      console.log("local stack is containing: %d, items", offlinePubQueue.length);
    }
}

module.exports.consumeAMQP = function consumeAMQP(exchangeName, queueName, consumeMethod) {
    
    try {
        channel.assertQueue(queueName, {durable: true}, function(err, data) {
            channel.bindQueue(queueName, exchangeName, '');
        });

        channel.on("error", function() {
          console.log("Error on channel");
        });
        channel.on("close", function() {
          console.log("Channel was closed");
          setTimeout(consumeAMQP, 1000, exchangeName, queueName, consumeMethod);
        });

        console.log("Channel has been configred exchangeName: %s, queueName: %s", exchangeName, queueName);
        channel.consume(queueName, function(msg) {
            //Call the callback function to the user
            consumeMethod(msg.content.toString(), function(processed) {
                try{
                    if(processed) {
                        console.log("Message got processed, we can ack");
                        channel.ack(msg);
                    } else {
                        console.log("Don't do anything I guess, message should remain where it is");
                    }
                } catch(e) {
                    console.log("Exception when consuming data");
                }
            })
        }, {noAck: false});
    }
    catch(e) {
        console.log("Channel is not configured yet");
        setTimeout(consumeAMQP, 1000, exchangeName, queueName, consumeMethod);
    }
}

module.exports.setupAMQPConnection = function setupAMQPConnection() {
    console.log("Startup AMQPConnection");
    amqpConnection = 'amqp://' + process.env.RABBIT_MQ_USERNAME +':'+process.env.RABBIT_MQ_PASSWORD +'@'+process.env.RABBIT_MQ_HOST;
    amqp.connect(amqpConnection, function (err, conn) {
    
      if (err) {
        console.error("[AMQP]", err.message);
        console.log("[AMQP] retrying");
        return setTimeout(setupAMQPConnection, 1000);
      }
      conn.on("error", function(err) {
        console.log("[AMQP] error happened: ", err);
        if (err.message !== "Connection closing") {
          console.error("[AMQP] conn error", err.message);
        }
      });
      conn.on("close", function() {
        console.error("[AMQP] reconnecting");
        return setTimeout(setupAMQPConnection, 1000);
      });
    
    
      conn.createChannel(function (err, chnl) {
        channel = chnl;
        console.log("Connect to channel");
        channel.assertExchange(process.env.RABBIT_MQ_EXCHANGE, 'fanout', {
          durable: true
        });
        //Create the queue, so that we don't loose the data (on the first time)
        /*
        channel.assertQueue(process.env.RABBIT_MQ_QUEUE, {durable: true}, function(err, data) {
          channel.bindQueue(process.env.RABBIT_MQ_QUEUE, process.env.RABBIT_MQ_EXCHANGE, '');
        });
        
        channel.assertQueue(process.env.RABBIT_MQ_QUEUE_TEST, {durable: true}, function(err, data) {
          channel.bindQueue(process.env.RABBIT_MQ_QUEUE_TEST, process.env.RABBIT_MQ_EXCHANGE, '');
        });
        */
  
        //Process first the local stack
        console.log("Connection established local stack is containing: %d, items", offlinePubQueue.length);
        while(true) {
          queuedMessage = offlinePubQueue.shift();
          if( !queuedMessage ) {
            console.log("No message in the cached sending queue");
            break;
          }
          publishAMQP(queuedMessage);
        }
      });
    });
  }