const createError = require("http-errors");
const express = require("express");

const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const flash = require("express-flash");
const { DateTime } = require("luxon");
// const SQLiteStore = require("connect-sqlite3")(session);
const date = new Date();

const indexRouter = require("./routes/index");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");
const energyRouter = require("./routes/energy");
const solarRouter = require("./routes/solar");
const heatingRouter = require("./routes/heating");
const garageRouter = require("./routes/garage");
const devicesRouter = require("./routes/devices");
const piRouter = require("./routes/pi");
const apiRouter = require("./routes/api");
const financeRouter = require("./routes/finance");

const ensureAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect("/login");
};

const app = express();

app.use(session({
    // store: new SQLiteStore({ db: "sessions.db", dir: "./app/db" }), // customize db path
    secret: "your-secret-key", // a secret key for signing the session ID cookie
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something is stored
    cookie: { secure: false }, // set to true if using https
}));

// local variables reset at each request
app.use((req, res, next) => {
    res.locals.dateShortcuts = {
        today: DateTime.now().toFormat("yyyy-MM-dd"),
        yday: DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd"),
        minus7d: DateTime.now().minus({ days: 7 }).toFormat("yyyy-MM-dd"),
        minus8d: DateTime.now().minus({ days: 8 }).toFormat("yyyy-MM-dd"),
        minus31d: DateTime.now().minus({ days: 31 }).toFormat("yyyy-MM-dd"),
        minus91d: DateTime.now().minus({ days: 91 }).toFormat("yyyy-MM-dd"),
        minus1m: DateTime.now().minus({ months: 1 }).toFormat("yyyy-MM-dd"),
        minus1mStart: DateTime.now().minus({ months: 1 }).set({ day: 1 }).toFormat("yyyy-MM-dd"),
        minus1mEnd: DateTime.now().minus({ months: 1 }).set({ day: DateTime.now().minus({ months: 1 }).daysInMonth }).toFormat("yyyy-MM-dd"),
        minus3mStart: DateTime.now().minus({ months: 3 }).set({ day: 1 }).toFormat("yyyy-MM-dd"),
        thisMonthStart: DateTime.now().set({ day: 1 }).toFormat("yyyy-MM-dd"),
        thisMonthName: DateTime.now().toFormat("MMMM yyyy"),
        thisMonthNumDays: new Date(DateTime.now().toFormat("yyyy"), DateTime.now().toFormat("M"), 0).getDate(),
        minus1y: DateTime.now().minus({ years: 1 }).toFormat("yyyy-MM-dd"),
        minus1yMonthStart: DateTime.now().minus({ years: 1 }).set({ day: 1 }).toFormat("yyyy-MM-dd"),
        minus1yMonthEnd: DateTime.now().minus({ years: 1 }).set({ day: DateTime.now().minus({ years: 1 }).daysInMonth }).toFormat("yyyy-MM-dd"),
    };
    next();
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "./layouts/layout");

app.use(flash());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// set variables
app.use((req, res, next) => {
    res.locals.currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    res.locals.user = req.session.user || null;
    next();
});

app.locals.formatCurrency = (num) => parseFloat(num).toLocaleString("en-GB", { style: "currency", currency: "GBP" });

app.locals.convertToBST = (utcDate) => {
    const dt = DateTime.fromMillis(utcDate.getTime(), { zone: "UTC" }).setZone("Europe/London");
    return dt;
};

app.use("/", authRouter);
app.use(ensureAuthenticated);
app.use("/", indexRouter);
app.use("/admin", adminRouter);
app.use("/energy", energyRouter);
app.use("/solar", solarRouter);
app.use("/heating", heatingRouter);
app.use("/garage", garageRouter);
app.use("/devices", devicesRouter);
app.use("/pi", piRouter);
app.use("/api", apiRouter);
app.use("/finance", financeRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error", { title: "Error!" });
});

module.exports = app;
