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

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

createPublishers().then(() => {
    postPublisher = getGameBot("SteamNews").bot;
    console.log("Steam News publisher: ")
    console.log(postPublisher);
    getFeed()
    setInterval(getFeed, 10 * 60 * 1000);
    setInterval(local.cleanUpPostList, 48 * 60 * 60 * 1000);
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
                        if (post.game) { publisher = getGameBot(post.game).bot; }
                        else { publisher = getBotFromTitle(title); }
                        let posted = false;
                        if (post.imagePath) {
                            console.log("uploading image: " + post.imagePath);
                            var localPath = await postCreator.createImage(post.imagePath);
                            console.log("Image is null: "+localPath == null);
                            // upload the image
                            if (localPath != null) {
                                var imageId = await publisher.uploadImage(localPath);
                                console.log("posting image: " + imageId);
                                var response = await publisher.postToMastodon(post.postText, imageId);
                                if (response && response.id) {
                                    posted = true;
                                    console.log("Posted with image");
                                }
                            }
                        }
                        if (!posted) {
                            var response = await publisher.postToMastodon(post.postText);
                            console.log("posted without an image")
                        }
                    } else if (post.isVr) {
                        var postPublisherVR = getGameBot("vrgaming").bot;
                        // if the post has an image, download it
                        let posted = false;
                        if (post.imagePath) {
                            console.log("uploading image: " + post.imagePath);
                            var localPath = await postCreator.createImage(post.imagePath);
                            // upload the image
                            if (localPath) {
                                var imageId = await postPublisherVR.uploadImage(localPath);
                                console.log("posting image: " + imageId);
                                var response = await postPublisherVR.postToMastodon(post.postText, imageId);
                                if (response && response.id) {
                                    posted = true;
                                    console.log("Posted with image");
                                }
                            }
                        }
                        if (!posted) {
                            var response = await postPublisherVR.postToMastodon(post.postText);
                            console.log("posted without an image")
                        }

                    } else {
                        // if the post has an image, download it
                        var posted = false;
                        if (post.imagePath) {
                            console.log("uploading image: " + post.imagePath);
                            var localPath = await postCreator.createImage(post.imagePath);
                            // upload the image
                            if (localPath) {
                                var imageId = await postPublisher.uploadImage(localPath);
                                console.log("posting image: " + imageId);
                                var response = await postPublisher.postToMastodon(post.postText, imageId);
                                if (response && response.id) {
                                    posted = true;
                                    console.log("Posted with image");
                                }
                            }
                        }
                        if (!posted) {
                            var response = await postPublisher.postToMastodon(post.postText);
                            console.log("posted without an image")
                        }
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
            gameLogin = await PostPublisher.createMastodonBot(account);
            var gameBot = new PostPublisher.PostPublisher(gameLogin);
            gameBots.push({ game: account.game, bot: gameBot });
        }
    } catch (err) {
        console.log("Error creating a specific mastodon bot. " + err);
    }
}

function getGameBot(game) {
    var returnElement = null;
    console.log("Game bot count: " + gameBots.length);
    gameBots.forEach((element) => {
        if (element.game == game) returnElement = element;
    });
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
    for (var i=0; i<gameBots.length; i++) {
        var gameTitle = gameBots[i].game;
        if(title.startsWith(gameTitle)) {
            return true;
        }
    }
    return false;
}

function getBotFromTitle(title) {
    for (var i=0; i<gameBots.length; i++) {
        var gameTitle = gameBots[i].game;
        if(title.startsWith(gameTitle)) {
            return gameBots[i].bot;
        }
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}