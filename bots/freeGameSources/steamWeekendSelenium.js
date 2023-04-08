const { Builder, Browser, By, Key, until } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const screen = {
    width: 640,
    height: 480
};

// run once a day

class SteamWeekendSelenium {

    getGames = async function () {
        var response = [];
        
        try {
            var options = new chrome.Options();
            //options.addArguments("--headless");
            options.addArguments("--disable-gpu");
            options.addArguments("--no-sandbox");
            //options.windowSize(screen);
            options.addArguments('--disable-blink-features=AutomationControlled')

            var driver = await new Builder()
                .forBrowser(Browser.FIREFOX)
                .setFirefoxOptions(options)
                .build();
            driver.executeScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");
            var gogBaseUrl = "";
            await driver.get(gogBaseUrl);
            
           /*
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
*/
            
        } catch (err) {
            console.error("Error getting Ubisoft Store game data with Selenium. " + err);
        } finally {
            return response;
        }
    }

    delay = function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
module.exports = SteamWeekendSelenium;




var client = new SteamWeekendSelenium();
client.getGames();