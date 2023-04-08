const { Builder, Browser, By, Key, until } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const screen = {
    width: 640,
    height: 480
};

class GogSelenium {

    getGames = async function () {
        var response = [];
        
        try {
            var options = new firefox.Options();
            //options.addArguments("--headless");
            options.addArguments("--disable-gpu");
            options.addArguments("--no-sandbox");
            options.windowSize(screen);

            var driver = await new Builder()
                .forBrowser(Browser.FIREFOX)
                .setFirefoxOptions(options)
                .build();
            var gogBaseUrl = "https://www.gog.com";
            await driver.get(gogBaseUrl + "/en#giveaway");
            var giveawayBox = await driver.findElement(By.id("giveaway"));
            var visible = await giveawayBox.isDisplayed();
            if (visible) {
                var link = await giveawayBox.getAttribute("href");
                link = gogBaseUrl + link;
                var background = await giveawayBox.findElement(By.css("div.giveaway-banner__background"));
                if (background) {
                    var image = background.getCssValue("background-image");
                    
                }
            }

            //driver = await new Builder().forBrowser(Browser.FIREFOX).build();

            
        } catch (err) {
            console.error("Error getting Ubisoft Store game data with Selenium. " + err);
        } finally {
            return response;
        }
    }
}
module.exports = GogSelenium;


var gog = new GogSelenium();
gog.getGames();