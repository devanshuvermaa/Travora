if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
  require("dotenv").config();
}

const dbUrl = process.env.DBLINK || "mongodb://127.0.0.1:27017/travora";
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodoverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const errorHandler = require("./utils/errorHandler.js");
const session = require("express-session");
const mongoStore = require("connect-mongo");
const flash = require("connect-flash");
const listingRoute = require("./routes/listing.js");
const reviewRoute = require("./routes/review.js");
const userRoute = require("./routes/user.js");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const swaggerUi = require("swagger-ui-express");
const openapiSpecification = require("./openapi.js");

async function connectDatabase() {
  await mongoose.connect(dbUrl);
}

const createApp = () => {
  const app = express();

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use(express.urlencoded({ extended: true }));
  app.use(methodoverride("_method"));
  app.engine("ejs", ejsMate);
  app.use(express.static(path.join(__dirname, "/public")));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpecification));

  const sessionOptions = {
    secret:
      process.env.NODE_ENV === "test"
        ? process.env.SECRET || "test-session-secret"
        : process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    },
  };

  if (process.env.NODE_ENV !== "test") {
    const store = mongoStore.create({
      mongoUrl: process.env.DBLINK,
      crypto: {
        secret: process.env.SECRET,
      },
      touchAfter: 24 * 3600,
    });

    store.on("error", (err) => {
      console.error("Session store error", { name: err.name });
    });

    sessionOptions.store = store;
  }

  app.use(session(sessionOptions));
  app.use(flash());

  app.use(passport.initialize());
  app.use(passport.session());
  passport.use(new LocalStrategy(User.authenticate()));

  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  //pass these to all views
  app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
  });

  app.use("/listings", listingRoute);
  app.use("/listings/:id/reviews", reviewRoute);
  app.use("/", userRoute);

  //Home route
  app.get("/", (req, res) => {
    res.redirect("/listings");
  });

  // ----------*******----------
  //Any other route
  app.use((req, res, next) => {
    next(new ExpressError(404, "page not found"));
  });

  // Centralized error handling. Route and async middleware pass failures here via next(error).
  app.use(errorHandler);

  return app;
};

const app = createApp();

if (require.main === module) {
  connectDatabase()
    .then(() => {
      console.log("connected to db");
      app.listen("8080", () => {
        console.log("port is listening");
      });
    })
    .catch((err) => {
      console.error("Database connection failed", { name: err.name });
    });
}

module.exports = app;
module.exports.connectDatabase = connectDatabase;
