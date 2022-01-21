function isDisabled(configs, commandName, guildID, buttonName) {
    try {
        if (configs[guildID] === undefined) {

            if (buttonName) {
                return { disabled: !(configs.master.commands[commandName].buttons[buttonName].enable && configs.master.commands[commandName].enable), reason: 'button' };
            } else {
                return { disabled: !(configs.master.commands[commandName].enable && (guildID === 'dm') ? configs.master.commands[commandName]['allow-dm'] : true), reason: 'command' };
            }

        } else {

            let disabled;
            const isDM = guildID === 'dm';

            if (configs[guildID].commands[commandName] === undefined) {

                if (buttonName) {
                    return { disabled: !(configs.master.commands[commandName].buttons[buttonName].enable && configs.master.commands[commandName].enable), reason: isDM ? 'button-dm' : 'button' };
                } else {
                    return { disabled: !(configs.master.commands[commandName].enable && (guildID === 'dm') ? configs.master.commands[commandName]['allow-dm'] : true), reason: isDM ? 'command-dm' : 'command' };
                }

            } else {

                if (buttonName) {
                    return { disabled: !(configs[guildID].commands[commandName].buttons[buttonName].enable && configs[guildID].commands[commandName].enable), reason: isDM ? 'button-dm' : 'button' };
                } else {
                    return { disabled: !(configs[guildID].commands[commandName].enable && (guildID === 'dm') ? configs[guildID].commands[commandName]['allow-dm'] : true), reason: isDM ? 'command-dm' : 'command' };
                }

            }
        }
    } catch (_) {
        return { disabled: false };
    }
}

module.exports = isDisabled;