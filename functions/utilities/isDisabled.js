function isDisabled({ configs, commandName, guildID, buttonName, type, subcommandName, selectmenuName }) {
    try {
        if (guildID === null) {
            guildID = 'dm';
        }

        switch (type) {
            case 'command':
                if (configs[guildID] === undefined || configs[guildID].commands[commandName] === undefined || configs[guildID].commands[commandName].enabled === undefined) {
                    guildID = 'master';
                }
                if ((!configs.master.commands[commandName]['allow-dm']) && (guildID === 'dm')) {
                    return { disabled: true, reason: 'command-dm' };
                }

                return { disabled: !configs[guildID].commands[commandName].enabled, reason: 'command' };

            case 'button':
                if (configs[guildID] === undefined || configs[guildID].commands[commandName] === undefined || configs[guildID].commands[commandName].buttons === undefined || configs[guildID].commands[commandName].buttons === undefined || configs[guildID].commands[commandName].buttons[buttonName] === undefined) {
                    guildID = 'master';
                }

                if ((!configs.master.commands[commandName]['allow-dm'] || !configs.master.commands[commandName].buttons[buttonName]['allow-dm']) && guildID === 'dm') {
                    return { disabled: true, reason: 'button-dm' };
                }

                return { disabled: !configs[guildID].commands[commandName].enabled, reason: 'button' };

            case 'subcommand':
                if (configs[guildID] === undefined || configs[guildID].commands[commandName] === undefined || configs[guildID].commands[commandName].subcommands === undefined || configs[guildID].commands[commandName].subcommands[subcommandName] === undefined) {
                    guildID = 'master';
                }
                if (((!configs.master.commands[commandName]['allow-dm']) || (!configs.master.commands[commandName].subcommands[subcommandName]['allow-dm'])) && (guildID === 'dm')) {
                    return { disabled: true, reason: 'command-dm' };
                }

                return { disabled: !(configs[guildID].commands[commandName].subcommands[subcommandName].enabled && configs[guildID].commands[commandName].enabled), reason: 'command' };

            case 'selectmenu':
                if (configs[guildID] === undefined || configs[guildID].commands[commandName] === undefined || configs[guildID].commands[commandName].selectmenus === undefined || configs[guildID].commands[commandName].selectmenus[selectmenuName] === undefined) {
                    guildID = 'master';
                }
                if (((!configs.master.commands[commandName]['allow-dm']) || (!configs.master.commands[commandName].selectmenus[selectmenuName]['allow-dm'])) && (guildID === 'dm')) {
                    return { disabled: true, reason: 'selectmenu-dm' };
                }

                return { disabled: !(configs[guildID].commands[commandName].selectmenus[selectmenuName].enabled && configs[guildID].commands[commandName].enabled), reason: 'command' };

        }
    } catch (err) {
        console.error(err);
        return { disabled: false };
    }
}

module.exports = isDisabled;