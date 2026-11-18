const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLogedin, isOwner, validateListing } = require("../middlewares.js");
const listingController = require("../controller/listings.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

router
  .route("/")
  .get(wrapAsync(listingController.index)) // index route
  .post(
    isLogedin,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.create), //Create route
  );

router.get("/search", wrapAsync(listingController.search));
router.get("/suggestions", wrapAsync(listingController.suggestions));
router.get("/filter", wrapAsync(listingController.filter));
//New route
router.get("/new", isLogedin, listingController.new);

router
  .route("/:id")
  .put(
    isLogedin,
    isOwner, //Update route
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.update),
  )
  .delete(isLogedin, isOwner, wrapAsync(listingController.delete)) //delete route
  .get(wrapAsync(listingController.show)); //Show route

//Edit route
router.get("/:id/edit", isLogedin, isOwner, wrapAsync(listingController.edit));

module.exports = router;
