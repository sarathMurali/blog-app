import axios from "axios"

export default class RegistrationForm {
    constructor() {
        this._csrf = document.querySelector('[name="_csrf"]').value
        this.form = document.querySelector("#registration-form")
        this.allFields = document.querySelectorAll("#registration-form .form-control")
        this.insertValidationElements()
        this.username = document.querySelector("#username-register")
        this.username.previousValue = ""
        this.email = document.querySelector("#email-register")
        this.email.previousValue = ""
        this.password = document.querySelector("#password-register")
        this.password.previousValue = ""
        this.username.isUnique = false
        this.email.isUnique = false
        this.events()
    }


    // events

    events() {
        this.form.addEventListener("submit" , (e) => {
            e.preventDefault()
            this.formSubmitHandler()
        })

        this.username.addEventListener("keyup", () => {
            this.isDifferent(this.username, this.usernameHandler)
        })

        this.email.addEventListener("keyup", () => {
            this.isDifferent(this.email, this.emailHandler)
        })

        this.password.addEventListener("keyup", () => {
            this.isDifferent(this.password, this.passwordHandler)
        })
        this.username.addEventListener("blur", () => {
            this.isDifferent(this.username, this.usernameHandler)
        })

        this.email.addEventListener("blur", () => {
            this.isDifferent(this.email, this.emailHandler)
        })

        this.password.addEventListener("blur", () => {
            this.isDifferent(this.password, this.passwordHandler)
        })
    }








    // methods
    
    formSubmitHandler() {
        this.usernameImmediatly()
        this.usernameAfterDelay()
        this.emailAfterDelay()
        this.passwordImmediatly()
        this.passwordAfterDelay()

        if(
            this.username.isUnique && 
            !this.username.errors && 
            this.email.isUnique &&
            !this.email.errors &&
            !this.password.errors
        ) {
            this.form.submit()
        }
    }

    isDifferent(el, handler) {
        if (el.previousValue != el.value) {
            handler.call(this)
        }
        el.previousValue = el.value
    }

    usernameHandler() {
        this.username.errors = false
        this.usernameImmediatly()
        clearTimeout(this.username.timer)
        this.username.timer = setTimeout(() => this.usernameAfterDelay() , 800)
    }
    
    emailHandler() {
        this.email.errors = false
        clearTimeout(this.email.timer)
        this.email.timer = setTimeout(() => this.emailAfterDelay(), 1500)
    } 

    passwordHandler() {
        this.password.errors = false
        this.passwordImmediatly()
        clearTimeout(this.password.timer)
        this.password.timer = setTimeout(() => this.passwordAfterDelay() , 800)
    }

    passwordImmediatly() {
        if(this.password.value.length > 50) {
            this.showValidationError(this.password , "password cannot exceed 50 characters")
        }

        if(!this.password.errors) {
            this.hideValidationError(this.password)
        }
    }


    passwordAfterDelay() {
        if (this.password.value.length < 6)  {
            this.showValidationError(this.password , "passs must be atleast 6 characters")
        }
    }

    emailAfterDelay() {
        if (!/^\S+@\S+$/.test(this.email.value)) {
            this.showValidationError(this.email , "you must provide a valid email adress")
        }


        if(!this.email.errors) {
            axios.post("/doesEmailExist",{_csrf: this._csrf , email: this.email.value}).then((response) => {
                if(response.data) {
                    this.email.isUnique = false
                    this.showValidationError(this.email , "email already in use")
                }else {
                    this.email.isUnique = true
                    this.hideValidationError(this.email)
                }
            }).catch(() => {
                console.log("try agian latter")
            })
        }
    }


    usernameImmediatly() {
        if (this.username.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.username.value)) {
            this.showValidationError(this.username, "username can only contain letters and numbers")
        }
        if(!this.username.errors) {
            this.hideValidationError(this.username)
        }
        if (this.username.value.length > 30) {
            this.showValidationError(this.username , "Username cannot exceed 30 characters")
        }
    }

    showValidationError(el, message) {
        el.nextElementSibling.innerHTML = message
        el.nextElementSibling.classList.add("liveValidateMessage--visible")
        el.errors= true
    }

    hideValidationError(el, message) {
        el.nextElementSibling.classList.remove("liveValidateMessage--visible")
    }

    usernameAfterDelay() {
        if(this.username.value.length < 3) {
            this.showValidationError(this.username , "username must be atleast 3 letters")
        }

        if (!this.username.errors) {
            axios.post("/doesUsernameExist", {_csrf:this._csrf , username: this.username.value}).then((response) => {
                if(response.data) {
                    this.showValidationError(this.username, "username already taken")
                    this.username.isUnique = false
                }else {
                    this.username.isUnique = true
                }
            }).catch(() => {
                console.log("please try again later.")
            })
        }
    }

    insertValidationElements() {
        this.allFields.forEach(function(el) {
            el.insertAdjacentHTML("afterend" , "<div class='alert alert-danger small liveValidateMessage '></div>")
        })
    }




}