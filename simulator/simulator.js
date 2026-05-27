const axios = require('axios');

const API_URL = 'http://localhost:3000/telemetry';

const devices = [
    { id: 1, name: 'Sensor Sur Alta', type: 'tribuna' },
    { id: 2, name: 'Sensor Sur Baja', type: 'tribuna' },
    { id: 3, name: 'Sensor Norte Alta', type: 'tribuna' },
    { id: 4, name: 'Sensor Norte Baja', type: 'tribuna' },
    { id: 5, name: 'Sensor Occidental Alta', type: 'zona_cerrada' },
    { id: 6, name: 'Sensor Occidental Baja', type: 'zona_cerrada' },
    { id: 7, name: 'Sensor Oriental', type: 'tribuna' },
    { id: 8, name: 'Sensor Acceso Principal', type: 'acceso' },
    { id: 9, name: 'Sensor Camerinos', type: 'zona_interna' },
    { id: 10, name: 'Sensor Energía Estadio', type: 'energia' },
];

function random(min, max) {
    return Number((Math.random() * (max - min) + min).toFixed(2));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTelemetry(device) {
    const base = {
        deviceId: device.id,
        temperature: random(24, 36),
        humidity: random(45, 85),
        noise: random(60, 115),
        occupancy: random(10, 98),
        co2: random(400, 1400),
        lightLevel: random(200, 1000),
        peopleFlow: randomInt(0, 650),
        energyConsumption: random(80, 580),
        voltage: random(108, 130),
        doorStatus: Math.random() > 0.5 ? 'open' : 'closed',
    };

    if (device.type === 'energia') {
        base.temperature = null;
        base.humidity = null;
        base.noise = null;
        base.occupancy = null;
        base.co2 = null;
        base.lightLevel = null;
        base.peopleFlow = null;
        base.doorStatus = null;
    }

    if (device.type === 'acceso') {
        base.co2 = null;
        base.energyConsumption = null;
        base.voltage = null;
    }

    return base;
}

async function sendTelemetry() {
    console.log('Enviando telemetría del estadio...');

    for (const device of devices) {
        const telemetry = generateTelemetry(device);

        try {
            const response = await axios.post(API_URL, telemetry);
            console.log(`✅ ${device.name}: dato guardado con ID ${response.data.id}`);
        } catch (error) {
            console.error(`❌ Error con ${device.name}:`, error.message);
        }
    }

    console.log('-----------------------------------');
}

sendTelemetry();

setInterval(sendTelemetry, 10000);