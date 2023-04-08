const { Builder, Browser, By, Key, until } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const screen = {
    width: 640,
    height: 480
};

class UbisoftSelenium {

    getGames = async function () {
        var response = [];
        
        try {
            let options = new firefox.Options();
            //options.addArguments("--headless");
            options.addArguments("--disable-gpu");
            options.addArguments("--no-sandbox");
            options.windowSize(screen);

            let driver = await new Builder()
                .forBrowser(Browser.FIREFOX)
                .setFirefoxOptions(options)
                .build();
            //await driver.get('https://store.epicgames.com/en-US/free-games');

            //driver = await new Builder().forBrowser(Browser.FIREFOX).build();

            console.log("driver: " + driver);
            await driver.get('https://free.ubisoft.com/');
            
            //var freeGameLinks = await driver.findElements(By.xpath("//span[text()='Free week']/../.."));
            var freeGameLinks = await driver.findElements(By.xpath("//span[text()='Free to play']/../.."));
            for (var i=0; i < freeGameLinks.length; i++) {
                var freeGame = freeGameLinks[i];
                var aElement = await freeGame.findElement(By.css("a"));
                //var link = await aElement.getAttribute("href");
                var link = await aElement.getAttribute("data-url");
                var name = await aElement.getAttribute("data-name");
                if (name.includes("ignt")) {
                    name = name.split("ignt")[0];
                }
                var img = await aElement.findElement(By.css("img"));
                var imgSrc = await img.getAttribute("src");
                await driver.get(link);
                
                var gameInfo = {
                    title: name,
                    link: link,
                    image: imgSrc,
                    description: desc
                };
                response.push(gameInfo);
            }
        } catch (err) {
            console.error("Error getting Ubisoft Store game data with Selenium. " + err);
        } finally {
            return response;
        }
    }
}
module.exports = UbisoftSelenium;


var ubi = new UbisoftSelenium();
ubi.getGames();