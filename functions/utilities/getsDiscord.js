function getUser(client, userID, callback) {
    client.users.fetch(userID).then(function (user) {
        callback(user);
    });
}

function getChannel(client, channelID, callback) {
    client.channels.fetch(channelID).then(function (channel) {
        callback(channel);
    });
}

module.exports = { getUser, getChannel };