const fs = require('fs');
const yaml = require('js-yaml');
const logger = require('./logger')

function getConfigs() {
    const storagePath = require('../../config.json')['storage-path'];
    let configs = {};
    const servers = fs.readdirSync(`${storagePath}/config`);

    for (const i in servers) {
        const serverId = servers[i];
        try {
            configs[serverId] = {
                commands: yaml.load(fs.readFileSync(`${storagePath}/config/${serverId}/commands.yml`, 'utf8')),
                footerTip: yaml.load(fs.readFileSync(`${storagePath}/config/${serverId}/footerTip.yml`, 'utf8')),
            }
        } catch (err) {
            logger.log(err.stack, ['Error/YAML']);
        }
    }
    return configs;
}

module.exports = getConfigs;