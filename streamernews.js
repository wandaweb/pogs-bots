const axios = require('axios');
const fs = require('fs');
const LocalData = require('./localdata.js');
const PostCreator = require('./postcreator.js');
const PostPublisher = require('./postpublisher.js');
const moment = require('moment');
const {decode} = require('html-entities');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();

const MAX_POST_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 250;

const local = new LocalData("streamerNewsList.json");
const postCreator = new PostCreator(MAX_POST_LENGTH, MAX_DESCRIPTION_LENGTH);

var postPublisher;

createPublisher().then((bot) => {
    postPublisher = bot;
    console.log("Bot: ")
    console.log(bot);
    getFeed()

});

async function getFeed() {
    try {
        var response = await axios.get('https://www.thegamer.com/feed/category/streamer-news/');

        if (response && response.data) {
            var XMLData = response.data;
            var feed = await parser.parseStringPromise(XMLData);
            console.log(JSON.stringify(feed));
            console.log("items: " + feed.rss.channel[0].item);
            var articleArray = feed.rss.channel[0].item;
            console.log("number of articles: " + articleArray.length)
            for (var i = 0; i < articleArray.length; i++) {
                var article = articleArray[i];
                var title = article.title;
                var link = article.link;
                var description = article.description[0];
                var content = article["content:encoded"][0];
                var date = new Date(article.pubDate);
                var guid = article.guid[0]["_"];
                var enclosure = article.enclosure;
                var image = enclosure[0]["$"].url;

                var posted = true;
                try {
                    posted = await local.guidExists(guid);
                } catch (err) {
                    console.error("Error checking guid: " + err);
                }

                // check date 
                if (!posted && isRecent(date)) {
                    // add to the posts list
                    console.log(`---- POST ${i} ----`);
                    await local.addPost(guid, date);

                    // create post
                    var postText = createPost(title, link, description, content);

                    var posted = false;
                    if (image) {
                        // get the image
                        var imageName = await postCreator.createImage(image);
                        console.log(imageName);
                        // upload the image
                        if (imageName) {
                            var imageId = await postPublisher.uploadImage(imageName);
                            console.log("posting image: " + imageId);
                            var response = await postPublisher.postToMastodon(postText, imageId, 'unlisted');
                            if (response && response.id) {
                                posted = true;
                                console.log("Posted with image");
                            }
                        }
                    }
                    
                    if (!posted) {
                        var response = await postPublisher.postToMastodon(postText, null, 'unlisted');
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

function createPost(title, link, description, content) {
    // add the title
    var postText = title;
    postText += "\n";

    // add a hashtag
    postText += "#StreamerNews \n";

    content = content.trim();
    description = description.trim();
    content += "\n" + description;

    var text = postText + postCreator.createPostText(link, content);
    text = decode(text);

    return text;
}

function isRecent(date) {
    const minDate = moment().subtract(2, 'months');
    return moment(date).isAfter(minDate);
}

async function createPublisher() {
    var data = fs.readFileSync("streamernewsconfig.json");
    try {
        var account = JSON.parse(data);
        gameLogin = await PostPublisher.createMastodonBot(account);
        return new PostPublisher.PostPublisher(gameLogin);
    } catch (err) {
        console.log("Error creating a specific mastodon bot. " + err);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
