const { Client, Plug } = require('tplink-smarthome-api');
const amqp = require('amqplib/callback_api');
require('dotenv').config();
const util = require('util');

const client = new Client();

let channel = null;

// Client events `device-*` also have `bulb-*` and `plug-*` counterparts.
// Use those if you want only events for those types and not all devices.
client.on('device-new', (device) => {
  device.startPolling(5000);
  
  // Device (Common) Events
  device.on('emeter-realtime-update', (emeterRealtime) => {

    let plug = new Plug(device);
    let dayStats = 0;
    plug.emeter.getDayStats(2020, 11).then(data => {
        let date_ob = new Date().getDate() - 1;
        console.log("day_list is: ", data.day_list);
        dayStats = data.day_list[date_ob].energy_wh;
        
        let iotData = {
            deviceID: device.deviceId,
            ipaddr: device.host,
            model: device.model,
            alias: device.alias,
            reading: {
                voltage: emeterRealtime.voltage,
                power: emeterRealtime.power,
                current: emeterRealtime.current,
                daypower_kwh : dayStats
            }
        } 
        sendDataToAMQP(iotData);
        //console.log("iotData: ", iotData);
    });
  });
});

function sendDataToAMQP(data) {
  console.log("Sending data in the rabbitMQ: ", data);
  channel.publish(process.env.RABBIT_MQ_EXCHANGE, '', Buffer.from(JSON.stringify(data)));
}

amqpConnection = 'amqp://' + process.env.RABBIT_MQ_USERNAME +':'+process.env.RABBIT_MQ_PASSWORD +'@'+process.env.RABBIT_MQ_HOST;
//amqp.connect('amqp://tplink:tplink@192.168.1.103', function (err, conn) {
amqp.connect(amqpConnection, function (err, conn) {
  conn.createChannel(function (err, chnl) {
    channel = chnl;
    channel.assertExchange(process.env.RABBIT_MQ_EXCHANGE, 'fanout', {
      durable: false
    });
    //Create the queue, so that we don't loose the data (on the first time)
    channel.assertQueue(process.env.RABBIT_MQ_QUEUE, {durable: true}, function(err, data) {
      channel.bindQueue(process.env.RABBIT_MQ_QUEUE, process.env.RABBIT_MQ_EXCHANGE, '');
    });
    channel.assertQueue(process.env.RABBIT_MQ_QUEUE_TEST, {durable: true}, function(err, data) {
      channel.bindQueue(process.env.RABBIT_MQ_QUEUE_TEST, process.env.RABBIT_MQ_EXCHANGE, '');
    });
  });
});


process.on('exit', (code) => {
  channel.close();
  console.log(`Closing rabbitmq channel`);
});


console.log('Starting Device Discovery');
client.startDiscovery();