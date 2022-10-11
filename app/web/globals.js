const { DateTime } = require("luxon");

const dateShortcuts = {
    today: DateTime.now().toFormat("yyyy-MM-dd"),
    yday: DateTime.now().minus({days: 1}).toFormat("yyyy-MM-dd"),
    minus7d: DateTime.now().minus({days: 7}).toFormat("yyyy-MM-dd"),
    minus8d: DateTime.now().minus({days: 8}).toFormat("yyyy-MM-dd"),
    minus31d: DateTime.now().minus({days: 31}).toFormat("yyyy-MM-dd"),
    minus91d: DateTime.now().minus({days: 91}).toFormat("yyyy-MM-dd"),
    minus1m: DateTime.now().minus({months: 1}).toFormat("yyyy-MM-dd"),
    minus1mStart: DateTime.now().minus({months: 1}).set({day: 1}).toFormat("yyyy-MM-dd"),
    minus3mStart: DateTime.now().minus({months: 3}).set({day: 1}).toFormat("yyyy-MM-dd"),
    minus1mEnd: DateTime.now().minus({months: 1}).set({day: DateTime.now().minus({months: 1}).daysInMonth}).toFormat("yyyy-MM-dd"),
    thisMonthStart: DateTime.now().set({day: 1}).toFormat("yyyy-MM-dd"),
    minus1y: DateTime.now().minus({years:1}).toFormat("yyyy-MM-dd"),
    minus1yMonthStart: DateTime.now().minus({years:1}).set({day: 1}).toFormat("yyyy-MM-dd"),
};

module.exports = { dateShortcuts };