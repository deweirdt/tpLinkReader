const { Client, Plug } = require('tplink-smarthome-api');
const { default: Emeter } = require('tplink-smarthome-api/lib/shared/emeter');
const util = require('util');

const client = new Client();

const logEvent = function logEvent(eventName, device, state) {
  const stateString = state != null ? util.inspect(state) : '';
  console.log(
    `${new Date().toISOString()} ${eventName} ${device.model} ${device.host}:${
      device.port
    } ${stateString}`
  );
};

// Client events `device-*` also have `bulb-*` and `plug-*` counterparts.
// Use those if you want only events for those types and not all devices.
client.on('device-new', (device) => {
  logEvent('device-new', device);
  console.log('Start polling');
  device.startPolling(5000);
  
  

  // Device (Common) Events
  device.on('emeter-realtime-update', (emeterRealtime) => {
    //logEvent('emeter-realtime-update', device, emeterRealtime);

    let plug = new Plug(device);
    let dayStats = 0;
    plug.emeter.getDayStats(2020, 11).then(data => {
        let date_ob = new Date().getDate() - 1;
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
                daypower : dayStats
            }
        } 
        console.log("iotData: ", iotData);
    });

    
    
    
    //console.log("Plug: ", plug);
  });

  // Plug Events
  /*
  device.on('power-on', () => {
    //logEvent('power-on', device);
  });
  device.on('power-off', () => {
    //logEvent('power-off', device);
  });
  device.on('power-update', (powerOn) => {
    logEvent('power-update', device, powerOn);
  });
  device.on('in-use', () => {
    logEvent('in-use', device);
  });
  device.on('not-in-use', () => {
    //logEvent('not-in-use', device);
  });
  device.on('in-use-update', (inUse) => {
    //logEvent('in-use-update', device, inUse);
  });
  */
/*
  // Bulb Events
  device.on('lightstate-on', (lightstate) => {
    logEvent('lightstate-on', device, lightstate);
  });
  device.on('lightstate-off', (lightstate) => {
    logEvent('lightstate-off', device, lightstate);
  });
  device.on('lightstate-change', (lightstate) => {
    logEvent('lightstate-change', device, lightstate);
  });
  device.on('lightstate-update', (lightstate) => {
    logEvent('lightstate-update', device, lightstate);
  });
  */
});

/*
client.on('device-online', (device) => {
  logEvent('device-online', device);
});
client.on('device-offline', (device) => {
  logEvent('device-offline', device);
});
*/

console.log('Starting Device Discovery');
client.startDiscovery();