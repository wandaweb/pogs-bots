const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const LocalData = require('./localdata.js');
const PostCreator = require('./postcreator.js');
const PostPublisher = require('./postpublisher.js');

const MAX_POST_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 250;

const parser = new XMLParser();
const local = new LocalData();
const postCreator = new PostCreator(MAX_POST_LENGTH, MAX_DESCRIPTION_LENGTH);

const gameBots = [];

var postPublisher;



createPublishers().then(() => {

    console.log("Steam News publisher: ")
    console.log(postPublisher);
    getFeed()
    //setInterval(getFeed, 10 * 60 * 1000);
    //setInterval(local.cleanUpPostList, 48 * 60 * 60 * 1000);
});

async function getFeed() {
    try {
        var response = await axios.get('https://store.steampowered.com/feeds/news/');
        if (response && response.data) {
            var XMLData = response.data;
            var feed = parser.parse(XMLData);
            var articleArray = feed.rss.channel.item;
            console.log("number of articles: " + articleArray.length)
            for (var i = 0; i < articleArray.length; i++) {
                var article = articleArray[i];
                var title = article.title;
                var link = article.link;
                var description = article.description;
                var date = new Date(article.pubDate);

                // get the article's id
                var guid = article.guid;
                // cheeck the article was not already posted
                var posted = true;
                try {
                    posted = await local.guidExists(guid)
                } catch (err) {
                    console.error("Error checking guid: " + err);
                }
                if (!posted) {
                    // add to the posts list
                    console.log(`---- POST ${i} ----`);
                    await local.addPost(guid, date);
                    console.log(guid);

                    // create post
                    var post = await postCreator.createPostSteam(title, link, description);

                    // post to specific game feed
                    console.log("game name is: " + post.game);
                    console.log("game account exists: " + botExists(post.game));
                    if (post.game && botExists(post.game) || titleStartsWithGame(title)) {
                        console.log("Will create a post for the game: " + post.game);
                        var publisher;
                        if (post.game) { publisher = await getGameBot(post.game); }
                        else { publisher = await getBotFromTitle(title); }
                        let posted = false;
                        if (post.imagePath) {
                            console.log("uploading image: " + post.imagePath);
                            var localPath = await postCreator.createImage(post.imagePath);
                            console.log("Image is null: " + localPath == null);
                            // upload the image
                            if (localPath != null) {
                                var imageId = await publisher.uploadImage(localPath);
                                console.log("posting image: " + imageId);
                                var response = await publisher.postToMastodon(post.postText, imageId, 'unlisted');
                                if (response && response.id) {
                                    posted = true;
                                    console.log("Posted with image");
                                }
                            }
                        }
                        if (!posted) {
                            var response = await publisher.postToMastodon(post.postText, null, 'unlisted');
                            console.log("posted without an image")
                        }
                        publisher = null;
                    } else if (post.title.includes("Diablo 4") || post.title.includes("Diablo IV")) {
                        publisher = await getGameBot("Diablo 4");
                        if (post.imagePath) {
                            console.log("uploading image: " + post.imagePath);
                            var localPath = await postCreator.createImage(post.imagePath);
                            console.log("Image is null: " + localPath == null);
                            // upload the image
                            if (localPath != null) {
                                var imageId = await publisher.uploadImage(localPath);
                                console.log("posting image: " + imageId);
                                var response = await publisher.postToMastodon(post.postText, imageId, 'unlisted');
                                if (response && response.id) {
                                    posted = true;
                                    console.log("Posted with image");
                                }
                            }
                        }
                        if (!posted) {
                            var response = await publisher.postToMastodon(post.postText, null, 'unlisted');
                            console.log("posted without an image")
                        }
                        publisher = null;
                    }
                    // in any case
                    {
                        postPublisher = await getGameBot("SteamNews");
                        console.log("post publisher: " + postPublisher);
                        // if the post has an image, download it
                        var posted = false;
                        if (post.imagePath) {
                            console.log("uploading image: " + post.imagePath);
                            var localPath = await postCreator.createImage(post.imagePath);
                            // upload the image
                            if (localPath) {
                                var imageId = await postPublisher.uploadImage(localPath);
                                console.log("posting image: " + imageId);
                                var response = await postPublisher.postToMastodon(post.postText, imageId, 'unlisted');
                                if (response && response.id) {
                                    posted = true;
                                    console.log("Posted with image");
                                }
                            }
                        }
                        if (!posted) {
                            var response = await postPublisher.postToMastodon(post.postText, null, 'unlisted');
                            console.log("posted without an image")
                        }
                        postPublisher = null;

                        // if post title contains "free", DM myself
                        if (post.title.includes("free")) {
                            var response = await postPublisher.postToMastodon("@wandaweb " + post.title, null, 'direct');
                        }
                    }
                    if (post.isVr) {
                        var postPublisherVR = await getGameBot("vrgaming");
                        // if the post has an image, download it
                        let posted = false;
                        if (post.imagePath) {
                            console.log("uploading image: " + post.imagePath);
                            var localPath = await postCreator.createImage(post.imagePath);
                            // upload the image
                            if (localPath) {
                                var imageId = await postPublisherVR.uploadImage(localPath);
                                console.log("posting image: " + imageId);
                                var response = await postPublisherVR.postToMastodon(post.postText, imageId, 'unlisted');
                                if (response && response.id) {
                                    posted = true;
                                    console.log("Posted with image");
                                }
                            }
                        }
                        if (!posted) {
                            var response = await postPublisherVR.postToMastodon(post.postText, null, 'unlisted');
                            console.log("posted without an image")
                        }
                        postPublisherVR = null;
                    }



                } else {
                    console.log("already posted");
                }
                await delay(1000);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

async function createPublishers() {
    var data = fs.readFileSync("accounts.json");
    var accounts = JSON.parse(data);
    console.log("accounts: " + accounts.length)
    try {
        for (var i = 0; i < accounts.length; i++) {
            var account = accounts[i];
            //gameLogin = await PostPublisher.createMastodonBot(account);
            //var gameBot = new PostPublisher.PostPublisher(gameLogin);
            var gameBot = null;
            gameBots.push({ game: account.game, bot: gameBot, account: account });
        }
    } catch (err) {
        console.log("Error creating a specific mastodon bot. " + err);
    }
}

async function getGameBot(game) {
    var returnElement = null;
    console.log("Game bot count: " + gameBots.length);
    /*gameBots.forEach((element) => {
        if (element.game == game)  {
        returnElement = element;
        }
    });*/
    for (var i = 0; i < gameBots.length; i++) {
        var element = gameBots[i];
        if (element.game == game) {
            console.log("found game bot " + game);
            var account = element.account;
            console.log("account: " + JSON.stringify(account));
            var gameLogin = await PostPublisher.createMastodonBot(account);
            console.log("login: " + gameLogin);
            var gameBot = new PostPublisher.PostPublisher(gameLogin);
            console.log("bot: " + gameBot);
            returnElement = gameBot;
        }
    }
    return returnElement;
}

function botExists(game) {
    var found = false;
    gameBots.forEach((element) => {
        //console.log(`comparing ${element.game} to ${game}`)
        if (element.game == game) {
            //console.log("equal");
            found = true;
        } else {
            //console.log("not equal");
        }
    });
    return found;
}

function titleStartsWithGame(title) {
    for (var i = 0; i < gameBots.length; i++) {
        var gameTitle = gameBots[i].game;
        if (title.startsWith(gameTitle)) {
            return true;
        }
    }
    return false;
}

async function getBotFromTitle(title) {
    for (var i = 0; i < gameBots.length; i++) {
        var gameTitle = gameBots[i].game;
        if (title.startsWith(gameTitle)) {
            return await getGameBot(gameTitle);
        }
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}