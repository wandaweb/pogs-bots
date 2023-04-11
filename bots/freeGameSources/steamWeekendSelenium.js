const { Builder, Browser, By, Key, until, Select } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

const screen = {
    width: 640,
    height: 780
};

// run once a day

class SteamWeekendSelenium {

    getGames = async function () {
        var response = [];
        
        try {
            var options = new firefox.Options();
            //options.addArguments("--headless");
            options.addArguments("--disable-gpu");
            options.addArguments("--no-sandbox");
            options.windowSize(screen);
            //options.addArguments('--disable-blink-features=AutomationControlled')
            options.setPreference('permissions.default.image', 2);

            var driver = await new Builder()
                .forBrowser(Browser.FIREFOX)
                .setFirefoxOptions(options)
                .build();
            //driver.executeScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");
            var gogBaseUrl = "https://store.steampowered.com/search/specials=1?category1=998&specials=1&ndl=1";
            await driver.get(gogBaseUrl);
            var body = await driver.findElement(By.css('body'));
            var endOfPage = false;
            var oldHeight = await driver.executeScript("return document.body.scrollHeight");
            var i=0;
            while (!endOfPage) {
                body.sendKeys(Key.END);
                await this.delay(3000);
                var newHeight = await driver.executeScript("return document.body.scrollHeight");
                endOfPage = (newHeight == oldHeight);
                oldHeight = newHeight;
            }
            var results = await driver.findElements(By.css("a.search_result_row"));
            var links = [];
            for (let i=0; i<results.length; i++) {
                var result = results[i];
                var gameLink = await result.getAttribute("href");
                links.push(gameLink);
            }
            for (let i=0; i<links.length; i++) {
                await driver.get(links[i]);
                var yearExists = await this.elementExists(driver, By.id("ageYear"));
                if (yearExists) {
                    var year = await driver.findElement(By.id("ageYear"));
                    if (year){
                        var objSelect =new Select(year);
                        objSelect.selectByValue("1950");
                        await this.delay(500);
                        var viewPage = await driver.findElement(By.id("view_product_page_btn"));
                        viewPage.click();
                    }
                }
                var freeWeekendSelector = By.css("div.free_weekend");
                var isFreeWeekend = await this.elementExists(driver, freeWeekendSelector);
                if (isFreeWeekend) {
                    var postText = "";
                    var freeWeekendBox = await driver.findElement(freeWeekendSelector);
                    var durationText = await freeWeekendBox.getText();
                    var durationDays = durationText.split("Ends in ")[1].split(" days")[0];
                    var d = new Date();
                    d.setDate(d.getDate() + parseInt(durationDays));
                    var dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    var gameTitle = await freeWeekendBox.findElement(By.css("h1"));
                    var gameTitleText = await gameTitle.getText();
                    postText += gameTitleText;
                    postText += " for free until " + d.toLocaleDateString("en-US", dateOpts);
                    postText += "\n#FreeWeekend #SteamGames\n\n";
                    var descBox = await driver.findElement(By.css("div.game_description_snippet"));
                    var desc = await descBox.getText();
                    postText += desc;
                    postText += "\n\n";
                    postText += links[i];
                    var imgBox = await driver.findElement(By.css("img.game_header_image_full"));
                    var imgUrl = await imgBox.getAttribute("src");
                    var result = {description: desc, image: imgUrl};
                    response.push(result);
                }
            }
            
        } catch (err) {
            console.error("Error getting Steam Store game data with Selenium. " + err);
        } finally {
            driver.close();
            return response;
        }
        
    }

    async elementExists(driver, selector) {
        try {
            await this.delay(2000);
            await driver.findElement(selector);
            return true;
        } catch (err) {
            return false;
        }
    }

    isFooterVisible(screenshot) {

    }

    delay = function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
module.exports = SteamWeekendSelenium;




//var client = new SteamWeekendSelenium();
//client.getGames();