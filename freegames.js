const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const moment = require('moment');
const LocalData = require('./localdata.js');
const PostCreator = require('./postcreator.js');
const PostPublisher = require('./postpublisher.js');
const EpicSource = require('./EpicSource.js');
const SteamSource = require('./steamSource.js');


const localSteam = new LocalData("steamGamesList.json");
const localGoG = new LocalData("gogList.json");
const localUbi = new LocalData("ubiList.json");


createPublisher().then((bot) => {
    console.log("Bot: ")
    console.log(bot);

    // Epic
    epic = new EpicSource(bot);
    epic.getEpicGames();
    setInterval(epic.getEpicGames, 2 * 60 * 60 * 1000);
    //setInterval(epic.cleanUpPostList, 60 * 24 * 60 * 60 * 1000, 200);

    // Steam
    steam = new SteamSource(bot);
    steam.getSteamGames();
    setInterval(steam.getSteamGames, 2 * 60 * 60 * 1000);
    //setInterval(steam.cleanUpPostList, 60 * 24 * 60 * 60 * 1000, 200);

    // Ubisoft

    // GoG

});


async function createPublisher() {
    var data = fs.readFileSync("freegamesconfig.json");
    try {
        var account = JSON.parse(data);
        gameLogin = await PostPublisher.createMastodonBot(account);
        return new PostPublisher.PostPublisher(gameLogin);
    } catch (err) {
        console.log("Error creating a specific mastodon bot. " + err);
    }
}

