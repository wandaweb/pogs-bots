const fs = require('fs');

const POST_LIST_FILE = 'postlist.json';

class LocalData {
    constructor(fileName = POST_LIST_FILE) {
        this.fileName = fileName;
     }

    guidExists = async (guid) => {
        var content = await this.readPostsFile();
        for (var i = 0; i < content.length; i++) {
            var existingPost = content[i];
            if (existingPost.guid && guid == existingPost.guid) {
                return true;
            }
        }
        return false;
    }

    readPostsFile = async () => {
        try {
            if (!fs.existsSync(this.fileName)) {
                fs.writeFileSync(this.fileName, "[]");
            }
        } catch (err) {
            console.log("Error creating postlist.json: " + err);
        }
        try {
            var data = await fs.promises.readFile(this.fileName);
            var content = JSON.parse(data);
            return content;
        } catch (err) {
            console.error("Error reading local posts file" + err);
        }
    }

    addPost = async (guid, date) => {
        var content = await this.readPostsFile();
        content.push({ guid, date });
        this.writePostsToFile(content);
    }

    cleanUpPostList = async (days = 2) => {
        var content = await this.readPostsFile();
        var postsToKeep = [];
        var date = new Date();
        var minDate = date.setDate(date.getDate() - days);
        for (var i = 0; i < content.length; i++) {
            if (content[i].date && content[i].date > minDate)
                postsToKeep.push(content[i]);
        }
        this.writePostsToFile(postsToKeep);
    }

    writePostsToFile = (postList) => {
        fs.writeFile(this.fileName, JSON.stringify(postList), (err) => {
            if (err)
                console.error("Error writing posts to file: " + err);
        });
    }


}

module.exports = LocalData;