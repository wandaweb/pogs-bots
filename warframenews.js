const axios = require('axios');
const fs = require('fs');
const LocalData = require('./localdata.js');
const PostCreator = require('./postcreator.js');
const PostPublisher = require('./postpublisher.js');
const moment = require('moment');
const { decode } = require('html-entities');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();

const MAX_POST_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 300;

const localAnnouncements = new LocalData("warframeAnnouncementsList.json");
const localWorkshop = new LocalData("warframeWorkshop.json");
const localLivestreams = new LocalData("warframeLivestreams.json");
const postCreator = new PostCreator(MAX_POST_LENGTH, MAX_DESCRIPTION_LENGTH);

var postPublisher;

createPublisher().then(async (bot) => {
    postPublisher = bot;
    console.log("Bot: ")
    console.log(bot);
    getFeed('https://forums.warframe.com/forum/170-announcements-events.xml/', '#WarframeAnnouncements', localAnnouncements);
    getFeed('https://forums.warframe.com/forum/123-developer-workshop-update-notes.xml/', '#WarrfameDevWorkshop', localWorkshop);
    getFeed('https://forums.warframe.com/forum/113-livestreams-contests.xml/', '#WarframeStreamsAndContests', localLivestreams);
    setInterval(getFeed, 10 * 60 * 1000, 'https://forums.warframe.com/forum/170-announcements-events.xml/', '#WarframeAnnouncements', localAnnouncements);
    setInterval(getFeed, 10 * 60 * 1000, 'https://forums.warframe.com/forum/123-developer-workshop-update-notes.xml/', '#WarrfameDevWorkshop', localWorkshop);
    setInterval(getFeed, 10 * 60 * 1000, 'https://forums.warframe.com/forum/170-announcements-events.xml/', '#WarframeStreamsAndContests', localLivestreams);
    setInterval(localAnnouncements.cleanUpPostList, 48 * 60 * 60 * 1000, 90);
    setInterval(localWorkshop.cleanUpPostList, 48 * 60 * 60 * 1000, 90);
    setInterval(localLivestreams.cleanUpPostList, 48 * 60 * 60 * 1000, 90);
});

async function getFeed(url, tag, local) {
    try {
        var response = await axios.get(url);

        if (response && response.data) {
            var XMLData = response.data;
            var feed = await parser.parseStringPromise(XMLData);
            var articleArray = feed.rss.channel[0].item;
            console.log("number of articles: " + articleArray.length)
            for (var i = 0; i < articleArray.length; i++) {
                var article = articleArray[i];
                var title = article.title;
                var link = article.link[0];
                var description = article.description[0];
                var date = new Date(article.pubDate);
                //var guid = article.guid[0]["_"];
                var guid = link;

                var posted = true;
                try {
                    posted = await local.guidExists(guid);
                } catch (err) {
                    console.error("Error checking guid: " + err);
                }
                
                if (!posted && isRecent(date)) {
                    // add to the posts list
                    console.log(`---- POST ${i} ----`);
                    await local.addPost(guid, date);
                    console.log("link: " + guid);

                    // create post
                    var postText = createPost(title, link, description, tag);

                    // get an image from the article
                    var image = postCreator.findPostImage(description);

                    var posted = false;
                    if (image) {
                        image = "https:" + image;
                        // get the image
                        var imageName = await postCreator.createImage(image);
                        // upload the image
                        if (imageName) {
                            var imageId = await postPublisher.uploadImage(imageName);
                            //console.log("posting image: " + imageId);
                            var response = await postPublisher.postToMastodon(postText, imageId);
                            if (response && response.id) {
                                posted = true;
                                console.log("Posted with image");
                            }
                        }
                    }

                    if (!posted) {
                        var response = await postPublisher.postToMastodon(postText);
                        console.log("posted without an image")
                    }
                    await delay(1000);
                }
            }
        }
    } catch (err) {
        console.error("Error getting the RSS feed: " + err);
    }
}

function createPost(title, link, description, tag) {
    // add the title
    var postText = title;
    postText += "\n";

    // add a hashtag
    postText += tag + "\n";

    description = description.trim();

    var text = postText + postCreator.createPostText(link, description)
        .replaceAll('/(\r\n|\r|\n){2,}/g', '$1\n').replaceAll('\t','');
    text = decode(text);

    return text;
}

function isRecent(date) {
    const twoMonthsAgo = moment().subtract(2, 'months');
    return moment(date).isAfter(twoMonthsAgo);
}

async function createPublisher() {
    var data = fs.readFileSync("accounts.json");
    var accounts = JSON.parse(data);
    console.log("accounts: " + accounts.length)
    try {
        for (var i = 0; i < accounts.length; i++) {
            var account = accounts[i];
            if (account.game == "Warframe") {
                gameLogin = await PostPublisher.createMastodonBot(account);
                var gameBot = new PostPublisher.PostPublisher(gameLogin);
                return gameBot;
            }
        }
    } catch (err) {
        console.log("Error creating a specific mastodon bot. " + err);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}