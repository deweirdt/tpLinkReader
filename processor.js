const amqp = require('./amqp.controller');
const Influx = require('influx');
const nano = require('nano-seconds');
require('dotenv').config();


const influx = new Influx.InfluxDB({
    host: process.env.INFLUX_HOST,
    database: process.env.INFLUX_DB_NAME,
});

influx.getDatabaseNames()
    .then(names => {
        if (!names.includes(process.env.INFLUX_DB_NAME)) {
            return influx.createDatabase(process.env.INFLUX_DB_NAME);
          }
    })
    .then(() => {
        //This will connect to the rabbitMQ
        amqp.setupAMQPConnection();
        amqp.consumeAMQP(process.env.RABBIT_MQ_EXCHANGE, process.env.RABBIT_MQ_QUEUE_TEST, processMsg);
    });

function processMsg(msg, confirm) {
    const data = JSON.parse(msg);
    //console.log("Message received: ", data);
    //If message is processed then we can confirm it
    
    influx.writePoints([
        {
            measurement: 'power',
            fields: {  
                voltage: data.reading.voltage, 
                power: data.reading.power, 
                current: data.reading.current ,
                daypowerwh: data.reading.daypower_wh,
                ipaddr: data.ipaddr,
                deviceID: data.deviceID,
                model: data.model,
                alias: data.alias
            },
            timestamp: nano.toString(nano.fromISOString(data.time))
        }
    ]).then(() => {
        confirm(true);
    }).catch((err) => {
        console.log("Error while writingPoints: ", err.message);
        confirm(true);
    });    
}


console.log('Starting processing');
