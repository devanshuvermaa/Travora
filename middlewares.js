const Listing = require("./models/listing");
const Review = require("./models/reviews");
const { listingSchema, validate } = require("./validation");


module.exports.isLogedin=(req,res,next)=>{
    // console.log(req.path,"..",req.originalUrl);
    if(!req.isAuthenticated()){
        req.session.redirectUrl=req.originalUrl; 
        req.flash("error","Log in first!");
        return res.redirect("/login");
    }
    next();
}

//passport reset the session after authentication will be done so i have to store it in res.locals
module.exports.saveUrl=(req,res,next)=>{
    if(req.session.redirectUrl){
        res.locals.redirectUrl=req.session.redirectUrl;
    }
    next(); 
}

module.exports.isOwner=async(req,res,next)=>{
    let id=req.params.id;
    let listing= await Listing.findById(id);
    if(!listing.owner._id.equals(res.locals.currUser._id)){
        req.flash("error","You are not allowed to tamper this listing!");
        return res.redirect(`/listings/${id}`);
    }
    next();
}

module.exports.isAuthor=async (req,res,next)=>{
    // console.log(req.user);
    let {id,reviewId}=req.params;
    let review=await Review.findById(reviewId);
    if(!review.author._id.equals(req.user._id)){
        req.flash("error","You are not the author of this review");
        return res.redirect(`/listings/${id}`)
    }
    next();
}

// Validate listing payloads at the request boundary.
module.exports.validateListing = validate(listingSchema);
