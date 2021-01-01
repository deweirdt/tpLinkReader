const { Client, Plug } = require('tplink-smarthome-api');

const amqp = require('./amqp.controller');

require('dotenv').config();

const client = new Client();

// Client events `device-*` also have `bulb-*` and `plug-*` counterparts.
// Use those if you want only events for those types and not all devices.
client.on('device-new', (device) => {
  device.startPolling(5000);
  
  // Device (Common) Events
  device.on('emeter-realtime-update', (emeterRealtime) => {

    let plug = new Plug(device);
    let dayStats = 0;

    let date = new Date();
    //console.log('emeterRealtime received is: ', emeterRealtime);
    plug.emeter.getDayStats(date.getFullYear(), date.getMonth() +1 ).then(data => {
        let date_ob = date.getDate() - 1;
        //console.log("Data received: %s", date);
        console.log("day_list is: %s: ", date, data.day_list);
        dayStats = data.day_list[date_ob].energy_wh;
        
        let iotData = {
            deviceID: device.deviceId,
            time: new Date().toJSON(),
            ipaddr: device.host,
            model: device.model,
            alias: device.alias,
            reading: {
                voltage: emeterRealtime.voltage,
                power: emeterRealtime.power,
                current: emeterRealtime.current,
                daypower_wh : dayStats
            }
        } 
        //amqp.publishAMQP(iotData);
        console.log("iotData: %s: ", date, iotData);
    });
  });
});

amqp.setupAMQPConnection();


console.log('Starting Device Discovery');
client.startDiscovery();