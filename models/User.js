const bcrypt = require("bcryptjs")

const usersCollection = require("../db").db().collection("users")
const validator = require("validator")
const md5 = require("md5")

let User = function(data, getAvatar) {
    this.data = data
    this.errors = []
    if (getAvatar == undefined) {getAvatar = false}
    if (getAvatar) {this.getAvatar()}
}


User.prototype.cleanUp = function() {
    if (typeof(this.data.username) != "string") {this.data.username = ""}
    if (typeof(this.data.email) != "string") {this.data.email = ""}
    if (typeof(this.data.password) != "string") {this.data.password = ""}
    
    // get rid of any bogus properties 

    this.data = {
        username: this.data.username.trim().toLowerCase(),
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password
    }
}

User.prototype.validate = function() {
   return new Promise( async (resolve , reject) => {
    if (this.data.username == "") {this.errors.push("you must provide a username")}
    if (this.data.username != "" && !validator.isAlphanumeric(this.data.username)) {this.errors.push("user name can only contains letters and numbers")}
    if (!validator.isEmail(this.data.email)) {this.errors.push("you must provide an email")}
    if (this.data.password == "") {this.errors.push("you must provide a password")}
    if (this.data.password.length > 0 && this.data.password.length < 6) { this.errors.push("password must be atleat 6 characters")}
    if (this.data.password.length > 50) {this.errors.push("password cannot exceed 100 characters")}
    if (this.data.username.length > 0 && this.data.username.length < 3) { this.errors.push("username must be atleat 3 characters")}
    if (this.data.username.length > 30) {this.errors.push("username cannot exceed 30 characters")}

    //only if username is valid then check to see if the username is already taken
     if (this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
        let usernameExists = await usersCollection.findOne({username: this.data.username})
        if (usernameExists) {this.errors.push("this username already taken")}
    }

    //only if email is valid then check to see if the email is already taken
    if (validator.isEmail(this.data.email)) {
        let emailExists = await usersCollection.findOne({enail: this.data.email})
        if (emailExists) {this.errors.push(" email already taken")}
    }
    resolve() 
})
}

User.prototype.login = function() {
    return new Promise((resolve , reject) => {
        this.cleanUp()
        usersCollection.findOne({username: this.data.username}).then((attemptedUser) => {
            if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
                this.data = attemptedUser
                this.getAvatar() 
                resolve("congrats")
            } else {
                reject("invalid username and passwrd")
            }
            
        }).catch(function() {
            reject("please try again later")
        })
    })
}


User.prototype.register = function() {
   return new Promise (async (resolve , reject) => {
    // step #1 validate user data
    this.cleanUp()
    await this.validate()
    
    // step #2 only if there are no validation errors 
    // then save data into database

    if (!this.errors.length) {
        //hash user password
        let salt = bcrypt.genSaltSync(10)
        this.data.password = bcrypt.hashSync(this.data.password , salt)
        
        // saving to database
        await usersCollection.insertOne(this.data)
        this.getAvatar()
        resolve()
    } else {
        reject(this.errors)
    }
    


})
}

User.prototype.getAvatar = function() {
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}


User.findByUsername = function (username) {
    return new Promise(function(resolve , reject) {
        if (typeof(username) != "string") {
            reject()
            return
        }

        usersCollection.findOne({username: username}).then(function(userDoc){
            if (userDoc) {
                
                userDoc = new User(userDoc, true)
                userDoc = {
                    _id: userDoc.data._id,
                    username: userDoc.data.username,
                    avatar: userDoc.avatar
                }
                
                resolve(userDoc)
            }else {
                reject()
            }
        }).catch(function(){
            reject()
        })
    })
}


User.doesEmailExist = function(email) {
    return new Promise(async (resolve , reject) => {
        if (typeof(email) != "string") {
            resolve(false)
            return
        }

        let user = await usersCollection.findOne({email: email})

        if (user) {
            resolve(true)
        }else {
            resolve(false)
        }
    })
}

module.exports = User