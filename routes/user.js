const express=require("express");
const User = require("../models/user");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveUrl } = require("../middlewares");
const userController = require("../controller/users");
const { signupSchema, loginSchema, validate } = require("../validation");
const router=express.Router();

router.get("/signup",userController.signupForm)

router.post("/signup", validate(signupSchema), wrapAsync(userController.signup));

router.get("/login",userController.loginForm);

router.post("/login",
    saveUrl,
    validate(loginSchema),
    passport.authenticate("local",
        {
            failureFlash:true,
            failureRedirect:"/login"
    }),
    userController.login 
)

router.get("/logout",userController.logout)

module.exports=router;
