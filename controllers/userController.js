const User = require("../models/User")
const Post = require("../models/Post")
const Follow = require("../models/Follow")
const jwt = require("jsonwebtoken")

exports.apiGetpostsByUsername = async function(req, res) {
    try {
        let authorDoc = await User.findByUsername(req.params.username)
        let posts = await Post.findByAuthorId(authorDoc._id)
        res.json(posts)
    } catch {
        res.json("sorry invalid user requested")
    }
}


exports.apiMustBeloggedIn = function(req, res, next) {
    try{ 
       req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET)
        next()
    } catch {
        res.json("must provide a valid token")
    }
}


exports.doesUsernameExist = function(req, res) {
    User.findByUsername(req.body.username).then(function() {
        res.json(true)
    }).catch(function() {
        res.json(false)
    })
}

exports.doesEmailExist = async function(req, res) {
    let emailBool = await User.doesEmailExist(req.body.email)
    res.json(emailBool)
}

exports.sharedProfileData = async function(req, res, next) {
    let isvisitorsProfile = false
    let isFollowing = false
    if (req.session.user) {
      isvisitorsProfile  = req.profileUser._id.equals(req.session.user._id)
      isFollowing = await Follow.isvisitorFollowing(req.profileUser._id, req.visitorId)
        
    }
    req.isvisitorsProfile = isvisitorsProfile
    req.isFollowing = isFollowing

    //  retreve posts, follower , following count

    let postcountPromise =  Post.countPostsByAuthor(req.profileUser._id)
    let followercountPromise =  Follow.countfollowersById(req.profileUser._id)
    let followingcountPromise =  Follow.countfollowingById(req.profileUser._id)
    let [postCount, followerCount, followingCount] = await Promise.all([postcountPromise, followercountPromise, followingcountPromise])

    req.postCount = postCount
    req.followerCount = followerCount
    req.followingCount = followingCount
    


    next()
}


// new method(then,catch) instead of old callback method. check out the old method too
exports.login = function(req , res) {
    let user = new User(req.body)
    user.login().then(function(result) {
        req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id}
        req.session.save(function() {
            res.redirect("/")
        })
    }).catch(function(e){
        req.flash("errors" , e)
        req.session.save(function() {
            res.redirect("/")
        })
    })
}


exports.apiLogin = function(req , res) {
    let user = new User(req.body)
    user.login().then(function() {
        res.json(jwt.sign({_id:user.data._id}, process.env.JWTSECRET, {expiresIn: "7d"}))
    }).catch(function(e){
        res.json("invalid username and password")
    })
}


exports.mustBeLoggedIn = function(req, res, next) {
    if (req.session.user) {
        next()
    }else{
        req.flash("errors" , "you must be logged in to perform that action")
        req.session.save(function() {
            res.redirect("/")
        })
    }
}




exports.logout = function(req , res){
    req.session.destroy(function() {
        res.redirect("/")
    })
}



exports.register = function(req , res){
    let user = new User(req.body)
    user.register().then(() => {
        req.session.user = {username: user.data.username , avatar: user.avatar, _id: user.data._id}
        req.session.save(function() {
            res.redirect("/")
        })
    }).catch((regErrors) => {
        regErrors.forEach(function(error) {
            req.flash("regErrors" , error)
        })
        req.session.save(function() {
            res.redirect("/")
        })
    })
}



exports.home = async function(req , res) {
    if (req.session.user) {
        // fetch feed of posts for current user

        let posts = await Post.getFeed(req.session.user._id)
        res.render("home-dashboard", {posts: posts})
    }else {
        res.render("home-guest" , {regErrors: req.flash("regErrors")})
    }
}


exports.ifUserExists = function(req , res , next) {
    User.findByUsername(req.params.username).then(function(userDocument) {
        req.profileUser = userDocument
        next()
    }).catch(function() {
        res.render("404")
    }) 
}

exports.profilePostScreen  =function(req, res) {
    // ask our post model for posts by a certain auther id
    Post.findByAuthorId(req.profileUser._id).then(function(posts){
        res.render("profile" , {
            title: `profile for ${req.profileUser.username}`,
            currentPage: "posts",
            posts: posts,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing : req.isFollowing,
            isvisitorsProfile: req.isvisitorsProfile,
            counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
        })
    }).catch(function(){
        res.render("404")
    })

   
}


exports.profilefollowersScreen = async function(req , res) {
    try {
        let followers = await Follow.getfollowerById(req.profileUser._id)
        res.render("profile-followers", {
        currentPage:"followers",
        followers: followers,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing : req.isFollowing,
        isvisitorsProfile: req.isvisitorsProfile,
        counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}

    })
    } catch {
        res.render("404")
    }
}


exports.profilefollowingScreen = async function(req , res) {
    try {
        let following = await Follow.getfollowingById(req.profileUser._id)
        res.render("profile-following", {
        currentPage: "following",
        following: following,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing : req.isFollowing,
        isvisitorsProfile: req.isvisitorsProfile,
        counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}

    })
    } catch {
        res.render("404")
    }
}