
const usersCollection = require("../db").db().collection("users")
const followsCollection = require("../db").db().collection("follows")
const ObjectID = require("mongodb").ObjectId
const User = require("./User")

let Follow = function(followedUsername, authorId) {
    this.followedUsername = followedUsername
    this.authorId = authorId
    this.errors = []
}

Follow.prototype.cleanUp = function() {
    if (typeof(this.followedUsername) != "string"){this.followedUsername = ""}
     
}


Follow.prototype.validate = async function(action) {
    //followed username must exist in db
    let followedAccount = await usersCollection.findOne({username: this.followedUsername})
    // 
    // console.log(followedAccount)
    if (followedAccount) {
        this.followedId = followedAccount._id
    }else {
        this.errors.push("you cannot follow a user that does not exist")
    }

    let doesFOllowActuallyExist = await followsCollection.findOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
    if (action == "create") {
        if (doesFOllowActuallyExist) {this.errors.push("you are already following this user")}
    }
    if (action == "delete") {
        if (!doesFOllowActuallyExist) {this.errors.push("you cannot unfollow someone that you are not following")}
    }


    // should not  be able to follow yourself
    if (this.followedId.equals(this.authorId)) {this.errors.push("you cannot follow yourself")}
}


Follow.prototype.create = function() {
    return new Promise( async (resolve , reject) => {
        this.cleanUp()
        await this.validate("create")

        if(!this.errors.length) {
            await followsCollection.insertOne({followedId: this.followedId , authorId : new ObjectID(this.authorId)})
            resolve()
        }else {
            reject(this.errors)
        }
    })
}


Follow.prototype.delete = function() {
    return new Promise( async (resolve , reject) => {
        this.cleanUp()
        await this.validate("delete")

        if(!this.errors.length) {
            await followsCollection.deleteOne({followedId: this.followedId , authorId : new ObjectID(this.authorId)})
            resolve()
        }else {
            reject(this.errors)
        }
    })
}


Follow.isvisitorFollowing = async function(followedId , visitorId) {
    let followDoc = await followsCollection.findOne({followedId: followedId , authorId: new ObjectID(visitorId)})
    if (followDoc) {
        return true
    }else {
        return false
    }
}


Follow.getfollowerById = function(id) {
 return new Promise(async (resolve, reject) => {
    try {
        let followers = await followsCollection.aggregate([
            {$match: {followedId: id}},
            {$lookup: {from: "users", localField: "authorId" , foreignField: "_id", as: "userDoc"}},
            {$project: {
                username: {$arrayElemAt: ["$userDoc.username", 0]},
                email: {$arrayElemAt: ["$userDoc.email", 0]}
            }}
        ]).toArray()
        followers = followers.map(function(follower) {
            let user = new User(follower, true)
            return {username: follower.username, avatar: user.avatar}

        })
        resolve(followers)
    } catch {
        reject()
    }
 })
}


Follow.getfollowingById = function(id) {
    return new Promise(async (resolve, reject) => {
       try {
           let following = await followsCollection.aggregate([
               {$match: {authorId: id}},
               {$lookup: {from: "users", localField: "followedId" , foreignField: "_id", as: "userDoc"}},
               {$project: {
                   username: {$arrayElemAt: ["$userDoc.username", 0]},
                   email: {$arrayElemAt: ["$userDoc.email", 0]}
               }}
           ]).toArray()
           following = following.map(function(follower) {
               let user = new User(follower, true)
               return {username: follower.username, avatar: user.avatar}
   
           })
           resolve(following)
       } catch {
           reject()
       }
    })
   }


Follow.countfollowersById = function(id) {
    return new Promise(async (resolve, reject) => {
        let followerCont = await followsCollection.countDocuments({followedId: id})
        resolve(followerCont)
    })
}

Follow.countfollowingById = function(id) {
    return new Promise(async (resolve, reject) => {
        let followingCount = await followsCollection.countDocuments({authorId: id})
        resolve(followingCount)
    })
}


module.exports = Follow