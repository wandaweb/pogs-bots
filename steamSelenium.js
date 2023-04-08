const { Builder, Browser, By, Key, until } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const screen = {
    width: 640,
    height: 480
};

class SteamSelenium {

    getGames = async function () {
        var response = [];
        try {
            let options = new firefox.Options();
            //	    options.setBinary("/home/mastodon/pogs-bots/geckodriver");
            options.addArguments("--headless");
            options.addArguments("--disable-gpu");
            options.addArguments("--no-sandbox");
            //	    options.addArguments('--remote-debugging-port=9224');
            options.windowSize(screen);

            let driver = await new Builder()
                .forBrowser(Browser.FIREFOX)
                .setFirefoxOptions(options)
                .build();
            await driver.get('https://store.steampowered.com/search/?maxprice=free&specials=1');
            var freeGameLinks = await driver.findElements(By.css("#search_resultsRows > a"));
            var freeGame;
            for (var i = 0; i < freeGameLinks.length; i++) {
                freeGame = freeGameLinks[i];
                var link = await freeGame.getAttribute("href");
                console.log("Link: " + link);
                var title = await freeGame.findElement(By.css("span.title")).getText();
                console.log("Title: " + title);
                var appId = await freeGame.getAttribute("data-ds-appid");
                console.log("Id: " + appId);
                response.push({ url: link, title: title, id: appId });
            }
            await driver.quit();
        } catch (err) {
            console.error("Error getting Steam game data with Selenium. " + err);
        } finally {
            return response;
        }
    }

}

module.exports = SteamSelenium;