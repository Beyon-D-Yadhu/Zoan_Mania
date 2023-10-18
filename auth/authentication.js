require('dotenv').config()
const passport =require('passport')


const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5500/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb, done) {
    //db-things under two lines
    // User.findOrCreate({ googleId: profile.id }, function (err, user) {
    //   return cb(err, user);
    // });
    done(null,profile)


  }
));

passport.serializeUser((user,done) => {
    done(null,user);
})
passport.deserializeUser((user,done) => {
    done(null,user)
})