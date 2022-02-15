// Utilities
const storagePath = require('./config.json')['storage-path'];
const botPath = require('./config.json')['bot-path'];
const getsDiscord = require('./functions/utilities/getsDiscord');
const updateLine = require('./functions/utilities/updateLine');
const logger = require('./functions/utilities/logger');
let configs = require('./functions/utilities/getConfigs')();
const isDisabled = require('./functions/utilities/isDisabled')
const getCooldown = require(`${storagePath}/profiles/handlers/getCooldown`);
const cooldownMessage = require(`${storagePath}/messages/cooldown`);
const disabledMessage = require(`${storagePath}/messages/disabledCommands`);
const buttonPerms = require(`${storagePath}/messages/buttonPerms`);
const suOnly = require(`${storagePath}/messages/suOnly`);
let superusers = require('./functions/utilities/getSu')(storagePath);
logger.newFile();

updateLine(logger.log('Starting bot: Importing packages', ['Starting']));

// Import packages
const fs = require('fs');
const yaml = require('js-yaml');

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
    },
    updateConfig: (newConfig) => {
        configs = newConfig;
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

let onReady = [];

updateLine(logger.log('Starting bot: Getting commands', ['Starting']));

// Read files in 'bot_modules' directory
client.commands = new Collection();
const commandCategories = fs.readdirSync(`${storagePath}/bot_modules`);

for (let commandCategory in commandCategories) {

    commandCategory = commandCategories[commandCategory];
    const commandFiles = fs.readdirSync(`${storagePath}/bot_modules/${commandCategory}`).filter(fileName => fileName.endsWith('.js'));

    for (let commandFile of commandFiles) {

        const file = require(`${storagePath}/bot_modules/${commandCategory}/${commandFile}`);
        setTimeout(() => {
            if (file.isCommand) {
                client.commands.set(file.data.name, file);
            } else if (file.isStartup) {
                file.onStartUp();
            }
        }, 0);
        if (file.isReady) {
            onReady.push(file.onReady)
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
        for (const i in users) {
            setTimeout(() => {
                getsDiscord.getUser(client, users[i], function (user) {
                    user.send(messageUser({ client, user, MessageEmbed })).then(() => {
                        sent++;
                        success++;
                        updateLine(logger.log(`Sending startup messages [Success: ${success} | Failed: ${failed} | Progress: ${sent}/${totalMessages}]`, ['Starting']));
                        if (sent === totalMessages) {
                            readyPrint();
                        }
                    }).then(() => { }).catch(_ => {
                        sent++;
                        failed++;
                        updateLine(logger.log(`Sending startup messages [Success: ${success} | Failed: ${failed} | Progress: ${sent}/${totalMessages}]`, ['Starting']));
                        if (sent === totalMessages) {
                            readyPrint();
                        }
                    });
                });
            }, 0);
        }

        // send startup messages to channels
        for (i in channels) {
            setTimeout(() => {
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
            }, 0);
        }

    } else {
        readyPrint();
    }

    for (const i in onReady) {
        setTimeout(() => {
            onReady[i]();
        }, 0);
    }
});

client.on('interactionCreate', async (inter) => {
    if (!inter.user.bot) {
        let su = false;
        if (superusers.master.currentOn.includes(inter.user.id)) {
            su = true;
        } else if (inter.guild !== null && superusers[inter.guild.id] !== undefined && superusers[inter.guild.id].currentOn.includes(inter.user.id)) {
            su = true;
        }
        let guildID;
        if (inter.guild) {
            guildID = inter.guild.id;
        } else {
            guildID = 'dm';
        }

        if (inter.isCommand()) {
            const commandName = inter.commandName;
            const command = client.commands.get(commandName);
            try {
                if (inter.options['_subcommand'] === null) {

                    console.log(logger.log(`User: ${inter.user.username}#${inter.user.discriminator} | User ID: ${inter.user.id} | Command: ${commandName} | Superuser: ${su}`, ['Interaction/Command']));

                    if (su) {
                        await command.execute(inter, { client, storagePath, logger, botPath, superusers}, commandCallbacks);
                    } else if (configs[(
                        configs[guildID] === undefined || configs[guildID].commands === undefined || configs[guildID].commands[commandName] === undefined || configs[guildID].commands[commandName]['su-only'] === undefined
                    ) ? 'master' : guildID].commands[commandName]['su-only']) {
                        inter.reply({ ephemeral: true, embeds: [suOnly()] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                    } else {
                        const disabled = isDisabled({ configs, commandName, guildID, type: 'command' });
                        if (disabled.disabled) {
                            inter.reply({ ephemeral: true, embeds: [disabledMessage({ type: disabled.reason })] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                        } else {
                            const cooldown = getCooldown(inter.user.id, { configs, storagePath, botPath, commandName, type: 'command', run: true, guildID });
                            if (cooldown.cooldown > 0) {
                                inter.reply({ ephemeral: true, embeds: [cooldownMessage(cooldown.cooldown, cooldown.serverCooldown, botPath, 'command')] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                            } else {
                                await command.execute(inter, { client, storagePath, logger, botPath, superusers}, commandCallbacks);
                            }
                        }
                    }
                } else {
                    const subcommandName = inter.options['_subcommand'];
                    console.log(logger.log(`User: ${inter.user.username}#${inter.user.discriminator} | User ID: ${inter.user.id} | Command: ${commandName}/${subcommandName} | Superuser: ${su}`, ['Interaction/Command']));
                    if (su) {
                        await command.subcommands[subcommandName](inter, { client, storagePath, logger, botPath, superusers}, commandCallbacks);
                    } else if (configs[(
                        configs[guildID] === undefined || configs[guildID].commands === undefined || configs[guildID].commands[commandName] === undefined || configs[guildID].commands[commandName].subcommands === undefined || configs[guildID].commands[commandName].subcommands[subcommandName] === undefined || configs[guildID].commands[commandName].subcommands[subcommandName]['su-only'] === undefined
                    ) ? 'master' : guildID].commands[commandName].subcommands[subcommandName]['su-only']) {
                        inter.reply({ ephemeral: true, embeds: [suOnly()] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                    } else {
                        const disabled = isDisabled({ configs, commandName, guildID, subcommandName: inter.options['_subcommand'], type: 'subcommand' });
                        if (disabled.disabled) {
                            inter.reply({ ephemeral: true, embeds: [disabledMessage({ type: disabled.reason })] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                        } else {
                            const cooldown = getCooldown(inter.user.id, { configs, storagePath, botPath, commandName, subcommandName, type: 'subcommand', run: true, guildID });
                            if (cooldown.cooldown > 0) {
                                inter.reply({ ephemeral: true, embeds: [cooldownMessage(cooldown.cooldown, cooldown.serverCooldown, botPath, 'command')] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                            } else {
                                await command.subcommands[subcommandName](inter, { client, storagePath, logger, botPath, superusers}, commandCallbacks);
                            }
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
                    client.commands.get(args[0]).buttons[args[1]](inter, { client, storagePath, logger, userId: args[2], botPath, superusers, args: args.slice(3) });

                } else if (configs[(
                    configs[guildID] === undefined || configs[guildID].commands === undefined || configs[guildID].commands[args[0]] === undefined || configs[guildID].commands[commandName][args[0]].buttons === undefined || configs[guildID].commands[commandName][args[0]].buttons[args[1]] === undefined || configs[guildID].commands[commandName][args[0]].buttons[args[1]]['su-only'] === undefined
                ) ? 'master' : guildID].commands[args[0]].buttons[args[1]]['su-only']) {
                    inter.reply({ ephemeral: true, embeds: [suOnly()] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                } else {

                    if (args[2] === '_' || args[2] === inter.user.id) {

                        let guildID;
                        if (inter.guild) {
                            guildID = inter.guild.id;
                        } else {
                            guildID = 'dm';
                        }

                        const disabled = isDisabled({ configs, commandName: args[0], guildID, buttonName: args[1], type: 'button' });
                        if (disabled.disabled) {
                            inter.reply({ ephemeral: true, embeds: [disabledMessage({ type: disabled.reason })] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                        } else {
                            const cooldown = getCooldown(inter.user.id, { configs, logger, storagePath, botPath, commandName: args[0], buttonName: args[1], type: 'button', run: true, guildID });
                            if (cooldown.cooldown > 0) {
                                inter.reply({ ephemeral: true, embeds: [cooldownMessage(cooldown.cooldown, cooldown.serverCooldown, botPath, 'button')] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                            } else {
                                if (args[2] === '_' || su || args[2] === inter.user.id) {
                                    client.commands.get(args[0]).buttons[args[1]](inter, { client, storagePath, userId: args[2], logger, botPath, superusers, args: args.slice(3) });
                                }
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
            let values = inter.values[0].split('|');
            let args = inter.customId.split('|');

            try {
                if (su) {
                    client.commands.get(args[0]).selectmenus[args[1]](inter, { client, storagePath, logger, userId: args[2], botPath, superusers, args: values });
                } else if (configs[(
                    configs[guildID] === undefined || configs[guildID].commands === undefined || configs[guildID].commands[args[0]] === undefined || configs[guildID].commands[commandName][args[0]].selectmenus === undefined || configs[guildID].commands[commandName][args[0]].selectmenus[args[1]] === undefined || configs[guildID].commands[commandName][args[0]].selectmenus[args[1]]['su-only'] === undefined
                ) ? 'master' : guildID].commands[args[0]].selectmenus[args[1]]['su-only']) {
                    inter.reply({ ephemeral: true, embeds: [suOnly()] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                } else {
                    console.log(logger.log(`User: ${inter.user.username}#${inter.user.discriminator} | User ID: ${inter.user.id} | Value: ${inter.customId}`, ['Interaction/SelectMenu']));


                    if (args[2] === '_' || args[2] === inter.user.id) {
                        if (inter.guild) {
                            guildID = inter.guild.id;
                        } else {
                            guildID = 'dm';
                        }
                    }

                    const disabled = isDisabled({ configs, commandName: args[0], guildID, selectmenuName: args[1], type: 'selectmenu' });

                    if (disabled.disabled) {
                        inter.reply({ ephemeral: true, embeds: [disabledMessage({ type: disabled.reason })] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                    } else {
                        const cooldown = getCooldown(inter.user.id, { configs, logger, storagePath, botPath, commandName: args[0], selectmenuName: args[1], type: 'selectmenu', run: true, guildID });

                        if (cooldown.cooldown > 0) {
                            inter.reply({ ephemeral: true, embeds: [cooldownMessage(cooldown.cooldown, cooldown.serverCooldown, botPath, 'selectmenu')] }).then(() => { }).catch(err => { console.log(logger.log(err.stack, ['Error/DiscordAPI'])) });
                        } else {
                            if (args[2] === '_' || args[2] === inter.user.id) {
                                client.commands.get(args[0]).selectmenus[args[1]](inter, { client, storagePath, logger, userId: args[2], botPath, superusers, args: values });
                            }
                        }
                    }
                }

            } catch (err) {
                console.error(logger.log(err.stack, ['Error/SelectMenu', `${args[0]}/${args[1]}`]));
            }
        }
    }
});

// Log on to Discord
client.login(process.env.BOT_TOKEN)