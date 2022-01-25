const fs = require('fs');

function getSu(storagePath) {
    const files = fs.readdirSync(`${storagePath}/profiles/superusers`);
    let out = {};

    for (const i in files) {
        out[files[i].slice(0, -5)] = require(`../../${storagePath}/profiles/superusers/${files[i]}`);
    }

    return out;
}

module.exports = getSu;