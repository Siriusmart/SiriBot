const logger = require('./functions/utilities/logger');
logger.newFile();
process.stdout.write(logger.log('Loading environment variables', ['Deploying']));

{
    // Load environment variables
    const result = require('dotenv').config();
    if (result.error) {
        console.error('dotenv: did you create a .env file?');
        throw result.error;
    }
}

const storagePath = require('./config.json')['storage-path'];

const updateLine = require('./functions/utilities/updateLine');

updateLine(logger.log('Importing packages', ['Deploying']));

const fs = require('fs');
const yaml = require('js-yaml');
const {
    REST
} = require('@discordjs/rest');
const {
    Routes
} = require('discord-api-types/v9');
const rest = new REST({
    version: '9'
}).setToken(process.env.BOT_TOKEN);

updateLine(logger.log('Searching for commands', ['Deploying']));

const commands = [];
let commandNames = [];
let commandCategories = fs.readdirSync(`${storagePath}/bot_modules`);

const configs = require('./functions/utilities/getConfigs')();

for (let commandCategory of commandCategories) {

    commandCategory = `${storagePath}/bot_modules/${commandCategory}`
    const commandFiles = fs.readdirSync(commandCategory).filter(file => file.endsWith('.js'));

    for (const commandFile of commandFiles) {
        const command = require(`${commandCategory}/${commandFile}`);
        if (command.isCommand) {
            let commandName = command.data.name;
            if (configs.master.commands[commandName] === undefined || configs.master.commands[commandName].enabled) {
                if (commandNames.includes(commandName)) {
                    updateLine(logger.log(`${commandName} already exist, skipping this file`['Error/Duplicated']));
                    continue;
                }
                commands.push(command.data.toJSON());
                updateLine(logger.log(`${commandName} is enabled`, ['Deploying']));
            } else {
                updateLine(logger.log(`${commandName} is disabled`, ['Deploying']));
            }
        }
    }
}

(async () => {
    try {
        updateLine(logger.log('Registering commands', ['Deploying']));
        await rest.put(
            Routes.applicationCommands(process.env.APPLICATION_ID),
            {
                body: commands
            },
        );

        updateLine(logger.log('Commands deployed', ['Deploying']));
    } catch (error) {
        console.error(error);
    }
})();