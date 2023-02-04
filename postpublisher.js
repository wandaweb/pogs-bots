
const fs = require('fs');
const { login } = require('masto');

const createMastodonBot = async function(account) {
    var masto;
    try {
        masto = await login({
            url: account.api_url,
            accessToken: account.access_token
        });
    } catch (err) {
        console.log("Error creating a specific bot. " + err);
    }
    return masto;
}

class PostPublisher {
    constructor(masto) {
        this.M = masto;
    }

    postToMastodon = async (post, image = null) => {
        if (image) {
            try {
                return await this.M.v1.statuses.create({
                    status: post,
                    visibility: 'public',
                    mediaIds: [image],
                });
            } catch (err) {
                console.error("Error tooting with an image: " + err);
            }
        } else {
            try {
                return await this.M.v1.statuses.create({
                    status: post,
                    visibility: 'public'
                });
            } catch (err) {
                console.error("Error tooting plain text: " + err);
            }
        }
    }

    uploadImage = async (path) => {
        if (!fs.existsSync(path)) {
            console.log("Image does not exist: " + path)
            return null;
        }
        try {
            var response = await this.M.v2.mediaAttachments.create({
                file: fs.readFileSync(path),
                description: '',
            });
            console.log("Image id is " + response.id);
            fs.unlink(path, (err) => {
                if (err) console.error("Error deleting file: " + err)
            });
            return response.id;
        } catch (err) {
            console.error("Error uploading image: " + err);
        }
    }
}

module.exports = { PostPublisher, createMastodonBot };