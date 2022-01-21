const fs = require('fs');
const yaml = require('js-yaml');
const logger = require('./logger')
const storagePath = require('../../config.json')['storage-path'];

let configs = {
    master: {
        footerTips: yaml.load(fs.readFileSync(`${storagePath}/config/master/footerTip.yml`, 'utf8')),
        commands: yaml.load(fs.readFileSync(`${storagePath}/config/master/commands.yml`, 'utf8'))
    }
};

const servers = fs.readdirSync(`${storagePath}/config/servers`);

for (let i = 0; i < servers.length; i++) {
    const serverId = servers[i];
    try {
        configs[serverId] = {
            commands: yaml.load(fs.readFileSync(`${storagePath}/config/servers/${serverId}/commands.yml`, 'utf8')),
            footerTip: yaml.load(fs.readFileSync(`${storagePath}/config/servers/${serverId}/footerTip.yml`, 'utf8')),
        }
    } catch (err) {
        logger.log(err.stack, ['Error/YAML']);
    }
}

module.exports = configs;