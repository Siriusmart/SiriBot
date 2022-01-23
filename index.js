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
const buttonPerms = require(`${storagePath}/messages/buttonPerms`);
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

updateLine(logger.log('Loading environment variables', ['Starting']));

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

// Read files in 'bot_modules' directory
client.commands = new Collection();
const commandCategories = fs.readdirSync(`${storagePath}/bot_modules`);

for (let commandCategory in commandCategories) {
    commandCategory = commandCategories[commandCategory];
    const commandFiles = fs.readdirSync(`${storagePath}/bot_modules/${commandCategory}`).filter(fileName => fileName.endsWith('.js'));

    for (let commandFile of commandFiles) {

        const command = require(`${storagePath}/bot_modules/${commandCategory}/${commandFile}`);

        if (command.isCommand) {
            client.commands.set(command.data.name, command);
        }
    }
}

updateLine(logger.log('Connecting to Discord', ['Starting']));

// On ready
client.once('ready', client => {
    if (preferences.onStart.sendMessages.enabled) {

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
    if (!inter.user.bot) {
        let su = false;
        if (superusers.master.currentOn.includes(inter.user.id)) {
            su = true;
        } else if (inter.guild !== null && superusers[inter.guild.id].currentOn.includes(inter.user.id)) {
            su = true;
        }

        if (inter.isCommand()) {
            try {
                let guildID;
                if (inter.guild) {
                    guildID = inter.guild.id;
                } else {
                    guildID = 'dm';
                }
                const commandName = inter.commandName;
                const command = client.commands.get(commandName);

                if (inter.options['_subcommand'] === null) {

                    console.log(logger.log(`User: ${inter.user.username}#${inter.user.discriminator} | User ID: ${inter.user.id} | Command: ${commandName} | Superuser: ${su}`, ['Interaction/Command']));

                    if (su) {
                        await command.execute(inter, { client, storagePath, logger, botPath, superusers, paste }, commandCallbacks);
                    } else {
                        const disabled = isDisabled({ configs, commandName, guildID, type: 'command' });
                        const cooldown = getCooldown(inter.user.id, { storagePath, botPath, commandName, type: 'command', run: true, guildID });
                        if (disabled.disabled) {
                            inter.reply({ ephemeral: true, embeds: [disabledMessage({ type: disabled.reason })] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                        } else if (cooldown.cooldown > 0) {
                            inter.reply({ ephemeral: true, embeds: [cooldownMessage(cooldown.cooldown, cooldown.serverCooldown, botPath, 'command')] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                        } else {
                            await command.execute(inter, { client, storagePath, logger, botPath, superusers, paste }, commandCallbacks);
                        }
                    }
                } else {
                    if (su) {
                        await command.subcommands[subcommandName](inter, { client, storagePath, logger, botPath, superusers, paste }, commandCallbacks);
                    } else {
                        const subcommandName = inter.options['_subcommand'];
                        console.log(logger.log(`User: ${inter.user.username}#${inter.user.discriminator} | User ID: ${inter.user.id} | Command: ${commandName}/${subcommandName} | Superuser: ${su}`, ['Interaction/Subcommand']));
                        const disabled = isDisabled({ configs, commandName, guildID, subcommandName: inter.options['_subcommand'], type: 'subcommand' });
                        const cooldown = getCooldown(inter.user.id, { storagePath, botPath, commandName, subcommandName, type: 'subcommand', run: true, guildID });
                        if (disabled.disabled) {
                            inter.reply({ ephemeral: true, embeds: [disabledMessage({ type: disabled.reason })] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                        } else if (cooldown.cooldown > 0) {
                            inter.reply({ ephemeral: true, embeds: [cooldownMessage(cooldown.cooldown, cooldown.serverCooldown, botPath, 'command')] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                        } else {
                            await command.subcommands[subcommandName](inter, { client, storagePath, logger, botPath, superusers, paste }, commandCallbacks);
                        }
                    }
                }
            } catch (err) {
                console.error(logger.log(err.stack, ['Error/Command', commandName]));
            }

        } else if (inter.isButton()) {
            let args;
            try {
                console.log(logger.log(`User: ${inter.user.username}#${inter.user.discriminator} | User ID: ${inter.user.id} | CustomID: ${inter.customId} | Superuser: ${su}`, ['Interaction/Button']));
                args = inter.customId.split('|');

                if (su) {
                    client.commands.get(args[0]).buttons[args[1]](inter, { client, storagePath, logger, botPath, superusers, paste, args: args.slice(2) });
                } else {

                    if (args[2] === '_' || args[2] === inter.user.id) {

                        let guildID;
                        if (inter.guild) {
                            guildID = inter.guild.id;
                        } else {
                            guildID = 'dm';
                        }

                        const disabled = isDisabled({ configs, commandName: args[0], guildID, buttonName: args[1], type: 'button' });
                        const cooldown = getCooldown(inter.user.id, { logger, storagePath, botPath, commandName: args[0], buttonName: args[1], type: 'button', run: true, guildID });
                        if (disabled.disabled) {
                            inter.reply({ ephemeral: true, embeds: [disabledMessage({ type: disabled.reason })] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                        } else if (cooldown.cooldown > 0) {
                            inter.reply({ ephemeral: true, embeds: [cooldownMessage(cooldown.cooldown, cooldown.serverCooldown, botPath, 'button')] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                        } else {
                            if (args[2] === '_' || su || args[2] === inter.user.id) {
                                client.commands.get(args[0]).buttons[args[1]](inter, { client, storagePath, logger, botPath, superusers, paste, args: args.slice(3) });
                            }
                        }
                    } else {
                        inter.reply({ ephemeral: true, embeds: [buttonPerms()] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                    }
                }
            } catch (err) {
                console.error(logger.log(err.stack, ['Error/Button', `${args[0]}/${args[1]}`]));
            }
        } else if (inter.isSelectMenu()) {
            let args = inter.values[0].split('|');

            try {
                if (su) {
                    client.commands.get(args[0]).selectmenus[args[1]](inter, { client, storagePath, logger, botPath, superusers, paste, args: args.slice(3) });
                } else {
                    console.log(logger.log(`User: ${inter.user.username}#${inter.user.discriminator} | User ID: ${inter.user.id} | Value: ${inter.values[0]}`, ['Interaction/SelectMenu']));
                    console.log(args)


                    if (args[2] === '_' || args[2] === inter.user.id) {
                        if (inter.guild) {
                            guildID = inter.guild.id;
                        } else {
                            guildID = 'dm';
                        }
                    }

                    const disabled = isDisabled({ configs, commandName: args[0], guildID, selectmenuName: args[1], type: 'selectmenu' });
                    const cooldown = getCooldown(inter.user.id, { logger, storagePath, botPath, commandName: args[0], selectmenuName: args[1], type: 'selectmenu', run: true, guildID });

                    if (disabled.disabled) {
                        inter.reply({ ephemeral: true, embeds: [disabledMessage({ type: disabled.reason })] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                    } else if (cooldown.cooldown > 0) {
                        inter.reply({ ephemeral: true, embeds: [cooldownMessage(cooldown.cooldown, cooldown.serverCooldown, botPath, 'selectmenu')] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                    } else {
                        if (args[2] === '_' || args[2] === inter.user.id) {
                            console.log(client.commands.get(args[0]))
                            client.commands.get(args[0]).selectmenus[args[1]](inter, { client, storagePath, logger, botPath, superusers, paste, args: args.slice(3) });
                        }
                    }
                }

            } catch (err) {
                console.error(logger.log(err.stack, ['Error/SelectMenu', `${args[0]}/${args[1]}`]));
            }
        }
    }
})


// Log on to Discord
client.login(process.env.BOT_TOKEN)