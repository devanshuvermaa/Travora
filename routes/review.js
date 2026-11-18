const express=require("express");
const router=express.Router({mergeParams:true});
const wrapAsync=require("../utils/wrapAsync.js");
const { isLogedin, isAuthor } = require("../middlewares.js");
const reviewController = require("../controller/review.js");
const { reviewSchema, validate } = require("../validation");

const validateReview = validate(reviewSchema);

//Reviews
//create route
router.post("/",isLogedin,validateReview,wrapAsync(reviewController.create));

//delete route
router.delete("/:reviewId",isLogedin,isAuthor,wrapAsync(reviewController.delete));

module.exports=router;
