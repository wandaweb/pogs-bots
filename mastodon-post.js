const { login } = require('masto');
const fs = require('fs');



async function testPost() {

    const masto = await login(readKeys());

    const status = await masto.v1.statuses.create({
        status: 'Hello from #mastojs!',
        visibility: 'public',
    });

    console.log(status);
}

async function postWithImage() {
    var masto = await login(readKeys());
    var image = await masto.v2.mediaAttachments.create({
        file: fs.readFileSync('coffee.webp'),
        description: 'coffee',
    });
    var statusResponse = await masto.v1.statuses.create({
        status: 'Hello from #mastojs!',
        visibility: 'public',
        mediaIds: [image.id],
    });
    console.log(statusResponse)

}

function readKeys() {
    var data = fs.readFileSync("keys.json");
    var content = JSON.parse(data);
    return {
        url: content.api_url,
        accessToken: content.access_token
    }
}

postWithImage();