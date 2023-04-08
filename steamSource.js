const axios = require('axios');
const LocalData = require('./localdata.js');
const PostCreator = require('./postcreator.js');
const PostPublisher = require('./postpublisher.js');
const SteamSelenium = require('./steamSelenium.js');
const NewsSource = require('./NewsSource.js');

const localSteam = new LocalData("steamGameList.json");

const MAX_POST_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 250;

const postCreator = new PostCreator(MAX_POST_LENGTH, MAX_DESCRIPTION_LENGTH);
const steamSelenium = new SteamSelenium();


class SteamSource extends NewsSource {
    constructor(publisher) {
        super();
        this.postPublisher = publisher;
    }

    getSteamGames = async () => {
        var webData = [];
        try {
            webData = await steamSelenium.getGames();
            
            var date = new Date();
            for (var i = 0; i < webData.length; i++) {
                var gameData = webData[i];
                var postText = "";
                if (!await localSteam.guidExists(gameData.id)) {
                    localSteam.addPost(gameData.id, date);

                    // start creating the post
                    postText += gameData.title;
                    postText += "\n#FreeGames #SteamGames\n\n";

                    // get the description
                    var apiUrl = "https://store.steampowered.com/api/appdetails?appids=" + gameData.id;
                    try {
                        var response = await axios.get(apiUrl);

                        var visibility = 'public';

                        if (response && response.data) {5
                            var feed = response.data;
                            var game = Object.values(feed)[0];
                            var type = game.data.type;
                            if (type == "dlc") {
                                postText += "This is a DLC for ";
                                postText += game.data.fullgame.name;
                                postText += "\n";
                            }

                            if (type != "game") {
                                visibility = 'private';
                            }

                            var description = game.data.short_description;
                            postText += postCreator.createPostText(gameData.url, description);

                            var imageLink = this.getSteamImage(game.data);
                            console.log(imageLink);
                            var posted = false;
                            if (imageLink) {
                                // get the image
                                var imageName = await postCreator.createImage(imageLink);
                                // upload the image
                                if (imageName) {
                                    var imageId = await this.postPublisher.uploadImage(imageName);
                                    //console.log("posting image: " + imageId);
                                    var response = await this.postPublisher.postToMastodon(postText, imageId, visibility);
                                    if (response && response.id) {
                                        posted = true;
                                        console.log("Posted with image");
                                    }
                                }
                            }

                            if (!posted) {
                                var response = await this.postPublisher.postToMastodon(postText, null, visibility);
                                console.log("posted without an image")
                            }
                            await this.delay(1000);
                        }

                    } catch (err) {
                        console.error("Error getting the Steam game description" + err);
                    }
                }
            }
        } catch (err) {
            console.error("Error creating the Steam post" + err);
        }
    }

    getSteamImage = (game) => {
        var image = null;
        console.log(game.header_image);
        if (game.header_image) {
            image = game.header_image;
        }
        return image;
    }
    
    cleanUpPostList = async () => {
        await localSteam.cleanUpPostList();
    }
}

module.exports = SteamSource;