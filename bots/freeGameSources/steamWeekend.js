const fs = require('fs');
const PostPublisher = require('../../postpublisher.js');
const SteamWeekendSource = require('./steamWeekendSource.js');

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

createPublisher().then((bot) => {
    console.log("Bot: ")
    console.log(bot);

    // Steam
    steam = new SteamWeekendSource(bot);
    steam.getSteamWeekendGames();
});


async function createPublisher() {
    var data = fs.readFileSync("../../freegamesconfig.json");
    try {
        var account = JSON.parse(data);
        gameLogin = await PostPublisher.createMastodonBot(account);
        return new PostPublisher.PostPublisher(gameLogin);
    } catch (err) {
        console.log("Error creating a specific mastodon bot. " + err);
    }
}
