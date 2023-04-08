const axios = require('axios');
const LocalData = require('./localdata.js');
const PostCreator = require('./postcreator.js');
const PostPublisher = require('./postpublisher.js');
const EpicSelenium = require('./epicSelenium.js');
const NewsSource = require('./NewsSource.js');

const localUbisoft = new LocalData("ubisoftGameList.json");
const MAX_POST_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 250;

const postCreator = new PostCreator(MAX_POST_LENGTH, MAX_DESCRIPTION_LENGTH);
const ubiSelenium = new UbisoftSelenium();

class UbisoftSource extends NewsSource {
    constructor(publisher) {
        super();
        this.postPublisher = publisher;
        console.log("post publisher. " + this.postPublisher);
    }

    getUbiGames = async () => {
        var webData = [];
        try {
            webData = await ubiSelenium.getGames();
            var date = new Date();
            for (var i = 0; i < webData.length; i++) {
                var game = webData[i];
                var imageLink = game.image;
                postText = "";
                postText += game.title;
                postText += "\n" + game.link;

                var posted = false;
                if (imageLink) {
                    // get the image
                    var imageName = await postCreator.createImage(imageLink);
                    // upload the image
                    if (imageName) {
                        var imageId = await this.postPublisher.uploadImage(imageName);
                        //console.log("posting image: " + imageId);
                        var response = await this.postPublisher.postToMastodon(postText, imageId);
                        if (response && response.id) {
                            posted = true;
                            console.log("Posted with image");
                        }
                    }
                }

                if (!posted) {
                    var response = await this.postPublisher.postToMastodon(postText);
                    console.log("posted without an image")
                }
                await this.delay(1000);
            }



        } catch (err) {
            console.error("Unable to add web data to the post: " + err);
        }
    }

    getEpicImage = async function getEpicImage(game) {
        var image = null;
        if (game.keyImages) {
            image = game.keyImages[0].url;
        }
        return image;
    }

    cleanUpPostList = async () => {
        await localUbisoft.cleanUpPostList();
    }
}

module.exports = UbisoftSource;


