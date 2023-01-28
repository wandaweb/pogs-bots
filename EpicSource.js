const axios = require('axios');
const LocalData = require('./localdata.js');
const PostCreator = require('./postcreator.js');
const PostPublisher = require('./postpublisher.js');
const EpicSelenium = require('./epicSelenium.js');
const NewsSource = require('./NewsSource.js');

const localEpic = new LocalData("epicGameList.json");

const MAX_POST_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 250;

const postCreator = new PostCreator(MAX_POST_LENGTH, MAX_DESCRIPTION_LENGTH);
const epicSelenium = new EpicSelenium();


class EpicSource extends NewsSource {
    constructor(publisher) { 
        super();
        this.postPublisher = publisher;
        console.log("post publisher. " + this.postPublisher);
    }

    getEpicGames = async () => {
        var webData = [];
        try {
            webData = await epicSelenium.getGames();
            var postText = "";
            var date = new Date();
            for (var i = 0; i < webData.length; i++) {
                var game = webData[i];

                if (game.content.includes("Free Now") && !(await localEpic.guidExists(game.content))) {
                    console.log("free");
                    localEpic.addPost(game.content, date);
                    var gameNameArray = game.content.split("Free Now, ")[1].split(", ");
                    var gameName = gameNameArray[0];
                    var gameDate = gameNameArray[1].split(",")[0];
                    var postText = gameName + "\n#FreeGames #EpicGames\n\n";
                    postText += gameDate + "\n";
                    var link = game.url;

                    // get description
                    try {
                        var response = await axios.get('https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions');
                        if (response && response.data) {
                            var feed = response.data;
                            var gameArray = feed.data.Catalog.searchStore.elements;
                            for (var j = 0; j < gameArray.length; j++) {
                                var item = gameArray[j];
                                if (item.title.includes(gameName)) {
                                    var description = item.description;
                                    postText += postCreator.createPostText(link, description);
                                    var imageLink = await this.getEpicImage(item);
                                    console.log(imageLink);
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
                            }
                        }
                    } catch (err) {
                        console.error("Error getting the Epic game description" + err);
                    }
                }
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
        await localEpic.cleanUpPostList();
    }
}

module.exports = EpicSource;