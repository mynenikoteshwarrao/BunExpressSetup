import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User';
import { AppError } from '../utils/AppError';

// Configure Google OAuth strategy if enabled
if (process.env.ENABLE_GOOGLE_AUTH === 'true') {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth is enabled but GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing');
  }

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI || '/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        return done(null, user);
      }

      // Check if user exists with the same email
      const email = profile.emails?.[0]?.value;
      if (email) {
        user = await User.findOne({ email });
        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          await user.save();
          return done(null, user);
        }
      }

      // Create new user
      const newUser = new User({
        googleId: profile.id,
        username: profile.displayName || `user_${profile.id}`,
        email: email,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        profilePicture: profile.photos?.[0]?.value,
        isEmailVerified: true, // Google emails are pre-verified
        authProvider: 'google'
      });

      await newUser.save();
      return done(null, newUser);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;