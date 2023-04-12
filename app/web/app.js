var createError = require("http-errors");
const express = require("express");

var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const expressLayouts = require("express-ejs-layouts");
const { DateTime } = require("luxon");

var indexRouter = require("./routes/index");
var adminRouter = require("./routes/admin");
var energyRouter = require("./routes/energy");
var heatingRouter = require("./routes/heating");
var garageRouter = require("./routes/garage");
var devicesRouter = require("./routes/devices");
var piRouter = require("./routes/pi");
var apiRouter = require("./routes/api");

const app = express();

// local variables reset at each request
app.use(function (req, res, next) {
    res.locals.dateShortcuts = {
        today: DateTime.now().toFormat("yyyy-MM-dd"),
        yday: DateTime.now().minus({days: 1}).toFormat("yyyy-MM-dd"),
        minus7d: DateTime.now().minus({days: 7}).toFormat("yyyy-MM-dd"),
        minus8d: DateTime.now().minus({days: 8}).toFormat("yyyy-MM-dd"),
        minus31d: DateTime.now().minus({days: 31}).toFormat("yyyy-MM-dd"),
        minus91d: DateTime.now().minus({days: 91}).toFormat("yyyy-MM-dd"),
        minus1m: DateTime.now().minus({months: 1}).toFormat("yyyy-MM-dd"),
        minus1mStart: DateTime.now().minus({months: 1}).set({day: 1}).toFormat("yyyy-MM-dd"),
        minus1mEnd: DateTime.now().minus({months: 1}).set({day: DateTime.now().minus({months: 1}).daysInMonth}).toFormat("yyyy-MM-dd"),
        minus3mStart: DateTime.now().minus({months: 3}).set({day: 1}).toFormat("yyyy-MM-dd"),
        thisMonthStart: DateTime.now().set({day: 1}).toFormat("yyyy-MM-dd"),
        thisMonthName: DateTime.now().toFormat("MMMM yyyy"),
        thisMonthNumDays: new Date(DateTime.now().toFormat("yyyy"), DateTime.now().toFormat("M"), 0).getDate(),
        minus1y: DateTime.now().minus({years:1}).toFormat("yyyy-MM-dd"),
        minus1yMonthStart: DateTime.now().minus({years:1}).set({day: 1}).toFormat("yyyy-MM-dd"),
        minus1yMonthEnd: DateTime.now().minus({years:1}).set({day: DateTime.now().minus({years: 1}).daysInMonth}).toFormat("yyyy-MM-dd"),
    };
    next();
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "./layouts/layout");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/admin", adminRouter);
app.use("/energy", energyRouter);
app.use("/heating", heatingRouter);
app.use("/garage", garageRouter);
app.use("/devices", devicesRouter);
app.use("/pi", piRouter);
app.use("/api", apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error", { page_title: "Error!" });
});

module.exports = app;
