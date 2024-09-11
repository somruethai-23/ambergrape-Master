const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.CLI_ID,
        clientSecret: process.env.CLI_SEC,
        callbackURL: '/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        
        try {
          // Find or create user based on Google profile
          let user = await User.findOne({ googleId: profile.id });
  
          if (!user) {
            // Check if user exists by email
            user = await User.findOne({ email: profile.emails[0].value });
  
            if (user) {
              // Link Google account to existing user
              user.googleId = profile.id;
              await user.save();
            } else {
              // Create a new user
              user = new User({
                googleId: profile.id,
                email: profile.emails[0].value,
                displayName: profile.displayName,
                username: profile.displayName,
              });
              await user.save();
            }
          }
  
          // Pass user to serializeUser
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
  
 // Serialize user information into the session
passport.serializeUser((user, done) => {
    done(null, user.id); // Store user ID in session
  });
  
  // Deserialize user information from the session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user); // Pass user object to req.user
    } catch (err) {
      done(err, null);
    }
  });

  module.exports = passport;