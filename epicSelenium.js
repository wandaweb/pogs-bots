const { Builder, Browser, By, Key, until } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const screen = {
    width: 640,
    height: 480
};

class EpicSelenium {

    getGames = async function () {
        var response = [];
        try {
            let options = new firefox.Options();
            options.addArguments("--headless");
            options.addArguments("--disable-gpu");
            options.addArguments("--no-sandbox");
            options.windowSize(screen);

            let driver = await new Builder()
                .forBrowser(Browser.FIREFOX)
                .setFirefoxOptions(options)
                .build();
            await driver.get('https://store.epicgames.com/en-US/free-games');
            var freeGameLinks = await driver.findElements(By.xpath("//a[starts-with(@aria-label,'Free Games')]"));
            var freeGame;
            for (var i = 0; i < freeGameLinks.length; i++) {
                freeGame = freeGameLinks[i];
                var label = await freeGame.getAttribute("aria-label");
                console.log(label);
                var link = await freeGame.getAttribute("href");
                console.log("       " + link);
                response.push({ url: link, content: label });
            }
            await driver.quit();
        } catch (err) {
            console.error("Error getting EpicStore game data with Selenium. " + err);
        } finally {
            return response;
        }
    }

}

module.exports = EpicSelenium;