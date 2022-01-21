function catchFilter(stack){
    return !stack.startsWith('DiscordAPIError: Unknown interaction');
}

module.exports = catchFilter;