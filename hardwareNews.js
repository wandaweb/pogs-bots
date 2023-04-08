const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const moment = require('moment');
const LocalData = require('./localdata.js');
const PostCreator = require('./postcreator.js');
const PostPublisher = require('./postpublisher.js');
const RpsSource = require('./bots/hardwareSources/rpsSource.js');
const TomSource = require('./bots/hardwareSources/tomSource.js');

var rps;
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

createPublisher().then((bot) => {
    console.log("Bot: ")
    console.log(bot);

    // RPS
    rps = new RpsSource(bot);
    rps.getFeed();

    // Tom
    tom = new TomSource(bot);
    tom.getFeed();


});


async function createPublisher() {
    var data = fs.readFileSync("bots/hardwareSources/hardwareconfig.json");
    try {
        var account = JSON.parse(data);
        console.log(account);
        gameLogin = await PostPublisher.createMastodonBot(account);
        return new PostPublisher.PostPublisher(gameLogin);
    } catch (err) {
        console.log("Error creating a specific mastodon bot. " + err);
    }
}