const fs = require('fs');
const storagePath = require('../../config.json')['storage-path'];

function log(message, tags) {
    if (typeof tags === 'string') {
        tags = [tags];
    } else if (!Array.isArray(tags)) {
        tags = [];
    }
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    let tagsString = `[${hours < 10 ? `0${hours}` : now.getHours()}:${minutes < 10 ? `0${minutes}` : minutes}:${seconds < 10 ? `0${seconds}` : seconds}]`;

    for (const i in tags) {
        tagsString += ` [${tags[i]}]`;
    }

    let string = "";
    const splitted = message.split("\n");

    for (const i in splitted) {
        string += `\n${tagsString}: ${splitted[i]}`;
    }

    fs.appendFileSync(`${storagePath}/logs/latest.log`, `${string}`);

    return string.slice(1);
}

function newFile() {
    if (fs.existsSync(`${storagePath}/logs/latest.log`)) {
        fs.renameSync(`${storagePath}/logs/latest.log`, `${storagePath}/logs/${fs.readFileSync(`${storagePath}/logs/latest.log`, { encoding: 'utf8', flag: 'r' }).split('\n')[0]}.log`);
        fs.writeFileSync(`${storagePath}/logs/latest.log`, JSON.stringify(new Date()).slice(1, -1));
    } else {
        fs.writeFileSync(`${storagePath}/logs/latest.log`, JSON.stringify(new Date()).slice(1, -1));
    }
}

module.exports = { log, newFile };