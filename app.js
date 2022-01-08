require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const passport = require('passport');
var flash = require('connect-flash');
var randomstring = require("randomstring");
const email = require(__dirname + "/mail_verification.js");
const md5 = require("md5");

app.use(flash());

const NAME = process.env.USERNAMEMONGODB;
const PASSWORD = process.env.PASSWORDMONGODB;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"))
app.use(require('express-session')({ secret: process.env.SECRET, resave: true, saveUninitialized: false }));
app.set('view engine', 'ejs');
const url = "mongodb+srv://" + NAME +":" + PASSWORD + "@cluster0.fszti.mongodb.net/notesDB"
mongoose.connect(url)
// mongoose.connect("mongodb://localhost:27017/notesDB");

const notesSchema = new mongoose.Schema({ name: String, notes: String, type: String })
const userSchema = new mongoose.Schema({ username: String, email: String, password: String })
const tempSchema = new mongoose.Schema({ username: String, email: String, password: String, emailToken: String });
userSchema.plugin(passportLocalMongoose, { selectFields: 'username email' });

const notes = mongoose.model('Notes', notesSchema);
const User = mongoose.model('User', userSchema);
const Temp = mongoose.model('Temp', tempSchema);

app.use(passport.initialize());
app.use(passport.session())
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.route("/").get(function (req, res) {
    if (req.isAuthenticated()) {
        let date = new Date();
        var dobArr = date.toDateString().split(' ');
        date = dobArr[2] + ' ' + dobArr[1] + ' ' + dobArr[3];
        notes.find({ name: req.user.username, type: "Home" }, function (err, docs) {
            if (err) {
                console.log(err);
            }
            else {
                res.render("index", { Items: docs, date: date, route: "", name: req.user.username })
            }
        })
    }
    else {
        res.redirect("/signin");
    }
}).post(function (req, res) {
    console.log(req.body);
    var task = req.body.newTask;
    var whatToDo = req.body.submit;
    if (whatToDo === "add") {
        var newNote = new notes({ name: req.user.username, notes: task, type: "Home" })
        newNote.save();
    }
    res.redirect("/");
})


app.route("/work").get(function (req, res) {
    if (req.isAuthenticated()) {
        let date = new Date();
        var dobArr = date.toDateString().split(' ');
        date = dobArr[2] + ' ' + dobArr[1] + ' ' + dobArr[3];
        notes.find({ type: "Work", name: req.user.username }, function (err, docs) {
            if (err) {
                console.log(err);
            }
            else {
                res.render("work", { Items: docs, date: date, route: "work", name: req.user.username })
            }
        })
    }
    else {
        res.redirect("/singin")
    }

}).post(function (req, res) {
    var task = req.body.newTask;
    var whatToDo = req.body.submit;
    if (whatToDo === "add") {
        var newNote = new notes({ name: req.user.username, notes: task, type: "Work" })
        newNote.save();
    }
    res.redirect("/work");
})

app.get("/delete/:name/:route", function (req, res) {
    let item = req.params.name;
    let route = req.params.route;
    notes.deleteOne({ notes: item }, function (err) {
        if (err) {
            console.log(err);
        }
        else {
            if (route == "work")
                res.redirect("/work");
            else {
                res.redirect("/")
            }

        }
    })
})


app.route("/signup").get(function (req, res) {
    const err = req.flash("info")[0]
    res.render("signup", { errors: err })
}).post(function (req, res) {
    User.find({ $or: [{ username: req.body.username }, { email: req.body.email }] }, function (err, docs) {
        if (err) {
            console.log(err);
        }
        else if (docs.length) {
            const err = "This Username exists";
            req.flash("info", err);
            res.redirect("/signup")
        }
        else {
            var email_pass = randomstring.generate(7);
            Temp.find({ email: req.body.email, username: req.body.username }, function (err, docs) {
                if (err) {
                    console.log(err);
                }
                else if (docs.length) { }
                else {
                    Temp.deleteOne({ username: docs.username }, function (err) {
                        if (err) {
                            consoloe.log(err);
                        }
                    })
                }
            })
            email.sendMail(email_pass, req.body.email);
            let temp = new Temp({ username: req.body.username, email: req.body.email, password: req.body.password, emailToken: md5(email_pass) });
            temp.save();
            res.redirect("/verify");

        }
    }
    )
})

app.route("/verify").get(function (req, res) {
    let err = req.flash("info");
    if(!err){
        err = "";
    }
    res.render("verify", {error:err})
}).post(function (req, res) {
    let code = req.body.verificationCode;
    Temp.find({}, function (err, docs) {
        if (err) console.log(err);
        else {
            let verified = 0;
            let user_hash = md5(code);
            let i=0;
            console.log("User hash  "+user_hash)
            for (i = 0; i < docs.length; i++) {
                console.log(docs[i].emailToken)
                if(user_hash === docs[i].emailToken){
                    verified = 1;
                    break;
                }
            }
            if(verified === 0){
                req.flash("info", "Please enter the right code")
                res.redirect("/verify");
            }
            else{
                let user = docs[i].username;
                let em = docs[i].email;
                let pass = docs[i].password;
                Temp.deleteOne({docs}, function(err){if(err)console.log(err)});
                User.register(new User({ username: user , email: em }), pass, function (err, account) {
                if (err) {
                    console.log(err);
                }
                else {
                        res.redirect('/');
                }
            });
            }
        }
    }
    )
})

app.route("/signin").get(function (req, res) {
    err = req.flash().error;
    if (!err) {
        err = [];
    }
    console.log(err)
    res.render("signin", { errors: err });
}).post(passport.authenticate('local', {
    successRedirect: '/',
    failureFlash: true,
    failureRedirect: '/signin',
}
))

app.get("/signout", function (req, res) {
    req.logout();
    res.redirect("/signin");
})


app.listen(3000, function () {
    console.log("Listening to port 3000")
})

