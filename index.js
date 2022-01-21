// Utilities
const storagePath = require('./config.json')['storage-path'];
const botPath = require('./config.json')['bot-path'];
const getsDiscord = require('./functions/utilities/getsDiscord');
const updateLine = require('./functions/utilities/updateLine');
const logger = require('./functions/utilities/logger');
const configs = require('./functions/utilities/getConfigs');
const isDisabled = require('./functions/utilities/isDisabled')
const getCooldown = require(`${storagePath}/profiles/handlers/getCooldown`);
const cooldownMessage = require(`${storagePath}/messages/cooldown`);
const disabledMessage = require(`${storagePath}/messages/disabledCommands`);
const catchFilter = require('./functions/utilities/catchFilter')
let superusers = require('./functions/utilities/getSu')(storagePath);
logger.newFile();

updateLine(logger.log('Starting bot: Importing packages', ['Starting']));

// Import packages
const fs = require('fs');
const yaml = require('js-yaml');
const PasteClient = require("pastebin-api").default;
const paste = new PasteClient("mZVKJXmQ66XPQaGiYVd_XI3IQ7oopTNa");

updateLine(logger.log('Loading configurations', ['Starting']));

// Read preferences config file
let preferences;
try {
    preferences = yaml.load(fs.readFileSync(`${storagePath}/config/master/preferences.yml`, 'utf8'));
} catch (error) {
    console.error('Did you download the config files?')
    throw error;
}

// Callbacks
let commandCallbacks = {
    updateSu: (newSu) => {
        superusers = newSu;
    }
};

process.stdout.write(logger.log('Loading environment variables', ['Starting']));

{
    // Load environment variables
    const result = require('dotenv').config();
    if (result.error) {
        console.error('dotenv: did you create a .env file?');
        throw result.error;
    }
}

// Functions
function readyPrint() {
    updateLine('');
    console.log(`${logger.log(`Startup completed\nReady! Logged in as ${client.user.tag}`, ['Starting/Completed'])}`);

}

// Import Discord API
const {
    Client,
    Collection,
    Intents,
    MessageEmbed
} = require('discord.js');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILDS]
});

updateLine(logger.log('Starting bot: Getting commands', ['Starting']));

// Read files in './commands' directory
client.commands = new Collection();
const commandCategories = fs.readdirSync(`${storagePath}/commands`);

for (let commandCategory in commandCategories) {
    commandCategory = commandCategories[commandCategory];
    const commandFiles = fs.readdirSync(`${storagePath}/commands/${commandCategory}`).filter(fileName => fileName.endsWith('.js'));

    for (let commandFile of commandFiles) {

        const command = require(`${storagePath}/commands/${commandCategory}/${commandFile}`);
        client.commands.set(command.data.name, command);
    }
}

updateLine(logger.log('Connecting to Discord', ['Starting']));

// On ready
client.once('ready', client => {
    if (preferences.onStart.sendMessages.enable) {

        updateLine(logger.log('Sending startup messages', ['Starting']));

        const users = preferences.onStart.sendMessages.users;
        const channels = preferences.onStart.sendMessages.channels;

        const totalMessages = users.length + channels.length;
        let sent = 0;
        let success = 0;
        let failed = 0;

        const { messageUser, messageChannel } = require(`${storagePath}/messages/startup`);

        // send startup messages to users
        for (let i = 0; i < users.length; i++) {
            getsDiscord.getUser(client, users[i], function (user) {
                user.send(messageUser({ client, user, MessageEmbed })).then(() => {
                    sent++;
                    success++;
                    updateLine(logger.log(`Sending startup messages [Success: ${success} | Failed: ${failed} | Progress: ${sent}/${totalMessages}]`, ['Starting']));
                    if (sent === totalMessages) {
                        readyPrint();
                    }
                }).catch(_ => {
                    sent++;
                    failed++;
                    updateLine(logger.log(`Sending startup messages [Success: ${success} | Failed: ${failed} | Progress: ${sent}/${totalMessages}]`, ['Starting']));
                    if (sent === totalMessages) {
                        readyPrint();
                    }
                });
            });
        }

        // send startup messages to channels
        for (let i = 0; i < channels.length; i++) {
            getsDiscord.getChannel(client, channels[i], function (channel) {
                channel.send(messageChannel({ client, channel, MessageEmbed })).then(() => {
                    sent++;
                    success++;
                    updateLine(logger.log(`Sending startup messages [Success: ${success} | Failed: ${failed} | Progress: ${sent}/${totalMessages}]`, ['Starting']));
                    if (sent === totalMessages) {
                        readyPrint();
                    }
                }).catch(_ => {
                    sent++;
                    failed++;
                    updateLine(logger.log(`Sending startup messages [Success: ${success} | Failed: ${failed} | Progress: ${sent}/${totalMessages}]`, ['Starting']));
                    if (sent === totalMessages) {
                        readyPrint();
                    }
                });
            });
        }

    } else {
        readyPrint();
    }
});

client.on('interactionCreate', async (inter) => {
    let su = false;
    if (superusers.master.currentOn.includes(inter.user.id)) {
        su = true;
    } else if (inter.guild !== null && superusers[inter.guild.id].currentOn.includes(inter.user.id)) {
        su = true;
    }

    if (inter.isCommand()) {
        try {
            const commandName = inter.commandName;
            const command = client.commands.get(commandName);
            console.log(logger.log(`User: ${inter.user.username}#${inter.user.discriminator} | User ID: ${inter.user.id} | Command: ${commandName}`, ['Interaction/Command']));

            let guildID;
            if (inter.guild) {
                guildID = inter.guild.id;
            } else {
                guildID = 'dm';
            }

            const disabled = isDisabled(configs, commandName, guildID);
            const cooldown = getCooldown(inter.user.id, { storagePath, botPath, commandName, type: 'command', run: true, guildID });
            if (disabled.disabled) {
                inter.reply({ ephemeral: true, embeds: [disabledMessage({ type: disabled.reason })] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
            } else if (cooldown.cooldown > 0) {
                inter.reply({ ephemeral: true, embeds: [cooldownMessage(cooldown.cooldown, cooldown.serverCooldown, botPath)] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
            } else {
                await command.execute(inter, { client, su, storagePath, logger, botPath, superusers, paste, catchFilter }, commandCallbacks);
            }

        } catch (err) {
            console.error(logger.log(err.stack, ['Error/Command']));
        }

    } else if (inter.isButton()) {

    }
})


// Log on to Discord
client.login(process.env.BOT_TOKEN)