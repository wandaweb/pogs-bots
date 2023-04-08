const axios = require('axios');
const fs = require('fs');
const LocalData = require('../../localdata.js');
const PostCreator = require('../../postcreator.js');
const PostPublisher = require('../../postpublisher.js');
const NewsSource = require('../../NewsSource.js');
const moment = require('moment');
const { decode } = require('html-entities');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();

const MAX_POST_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 250;

const local = new LocalData("hardwareNewsList.json");
const postCreator = new PostCreator(MAX_POST_LENGTH, MAX_DESCRIPTION_LENGTH);

class RpsSource extends NewsSource {
    constructor(publisher) {
        super();
        this.postPublisher = publisher;
        console.log("post publisher. " + this.postPublisher);
    }


    getFeed = async function getFeed() {
        try {
            var response = await axios.get('https://www.rockpapershotgun.com/feed/news');

            if (response && response.data) {
                var XMLData = response.data;
                var feed = await parser.parseStringPromise(XMLData);
                console.log("items: " + feed.rss.channel[0].item.length);
                var articleArray = feed.rss.channel[0].item;
                console.log("number of articles: " + articleArray.length)
                for (var i = 0; i < articleArray.length; i++) {
                    var article = articleArray[i];
                    var categories = article.category;
                    var isHardware = false;
                    for (var j = 0; j < categories.length; j++) {
                        if (categories[j] == "Hardware") {
                            isHardware = true;
                        }
                    }
                    if (isHardware) {
                        var title = article.title[0];
                        console.log(title);

                        var link = article.link[0];
                        console.log(link)
                        console.log(await local.guidExists(link))
                        if (!(await local.guidExists(link))) {
                            local.addPost(link, new Date());
                            var description = article.description[0];
                            var postText = await this.createPost(title, link, description)
                            console.log(postText);

                            // get image from text
                            var image = postCreator.findPostImage(description);
                            var posted = false;
                            if (image) {
                                // get the image
                                var imageName = await postCreator.createImage(image);
                                console.log(imageName);
                                // upload the image
                                if (imageName) {
                                    var imageId = await this.postPublisher.uploadImage(imageName);
                                    console.log("posting image: " + imageId);
                                    var response = await this.postPublisher.postToMastodon(postText, imageId, 'unlisted');
                                    if (response && response.id) {
                                        posted = true;
                                        console.log("Posted with image");
                                    }
                                }
                            }

                            if (!posted) {
                                var response = await this.postPublisher.postToMastodon(postText, null, 'unlisted');
                                console.log("posted without an image")
                            }
                            await this.delay(1000);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error getting the RSS feed: " + err);
        }
    }

    createPost = function createPost(title, link, description) {
        // add the title
        var postText = "Rock, Paper, Shotgun writes:\n"
        postText += title;
        postText += "\n";

        // add a hashtag
        postText += "#HardwareNews #GamingHardware \n";

        var text = postText + postCreator.createPostText(link, description);
        text = decode(text);

        return text;
    }
}


module.exports = RpsSource;