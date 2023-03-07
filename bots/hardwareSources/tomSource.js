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

const local = new LocalData("tomhardwareNewsList.json");
const postCreator = new PostCreator(MAX_POST_LENGTH, MAX_DESCRIPTION_LENGTH);

class TomSource extends NewsSource {
    constructor(publisher) {
        super();
        this.postPublisher = publisher;
        console.log("post publisher. " + this.postPublisher);
    }


    getFeed = async function getFeed() {
        try {
            var response = await axios.get('https://www.tomshardware.com/feeds/all');

            if (response && response.data) {
                var XMLData = response.data;
                var feed = await parser.parseStringPromise(XMLData);
                console.log("items: " + feed.rss.channel[0].item.length);
                var articleArray = feed.rss.channel[0].item;
                console.log("number of articles: " + articleArray.length)
                for (var i = 0; i < articleArray.length; i++) {
                    var article = articleArray[i];

                    var title = article.title[0];
                    console.log(title);
                    var pubdate = article.pubDate[0];
                    console.log(pubdate);
                    console.log(this.isRecent(new Date(pubdate), 'days', 2));
                    var link = article.link[0];
                    console.log(link)
                    console.log(await local.guidExists(link))
                    if (!(await local.guidExists(link)) && this.isRecent(new Date(pubdate), 'days', 2)) {
                        local.addPost(link, new Date());
                        var description = article.description[0];
                        var postText = await this.createPost(title, link, description)
                        console.log(postText);


                        var response = await this.postPublisher.postToMastodon(postText, null, 'unlisted');
                        console.log("posted without an image")

                        await this.delay(1000);

                    }
                }
            }
        } catch (err) {
            console.error("Error getting the RSS feed: " + err);
        }
    }

    createPost = function createPost(title, link, description) {
        // add the title
        var postText = "Tom's Hardware writes:\n";
        postText += title;
        postText += "\n";

        // add a hashtag
        postText += "#HardwareNews ";
        if (description.includes("gaming") || description.includes("Gaming")) {
            postText += "#GamingHardware";
        }
        postText += "\n\n";

        var text = postText + postCreator.createPostText(link, description);
        text = decode(text);

        return text;
    }
}


module.exports = TomSource;