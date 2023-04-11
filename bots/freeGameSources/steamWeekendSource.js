const LocalData = require('../../localdata.js');
const PostCreator = require('../../postcreator.js');
const PostPublisher = require('../../postpublisher.js');
const SteamWeekendSelenium = require('./steamWeekendSelenium.js');
const NewsSource = require('../../NewsSource.js');

const localSteam = new LocalData("steamWeekendList.json");
const MAX_POST_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 250;

const postCreator = new PostCreator(MAX_POST_LENGTH, MAX_DESCRIPTION_LENGTH);
const steamWeekendSelenium = new SteamWeekendSelenium();

class SteamWeekendSource extends NewsSource {
    constructor(publisher) {
        super();
        this.postPublisher = publisher;
        console.log("post publisher. " + this.postPublisher);
    }

    getSteamWeekendGames = async () => {
        var webData = [];
        try {
            webData = await steamWeekendSelenium.getGames();
            var date = new Date();
            for (var i = 0; i < webData.length; i++) {
                var game = webData[i];
                var imageLink = game.image;
                var postText = game.description;

                var alreadyPosted = await localSteam.guidExists(game.image);
                if (!alreadyPosted) {
                
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
                localSteam.addPost(game.image, date);
                await this.delay(1000);
            }

        }

        } catch (err) {
            console.error("Unable to add web data to the post: " + err);
        }
    }

}

module.exports = SteamWeekendSource;


