const moment = require('moment');

class NewsSource {
    constructor() {}

    isRecent = function(date, timeSpan, count) {
        const thisDate = moment();
        const minDate = moment().subtract(count, timeSpan);
        return moment(date).isBetween(minDate, thisDate);
    }

    delay = function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = NewsSource;