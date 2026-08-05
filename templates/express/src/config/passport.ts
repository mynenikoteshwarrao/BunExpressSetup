import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { googleAuth } from '../services/authService';
import { getUserWithRoles } from '../services/userService';
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
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new AppError('Google account has no email address', 400), undefined);
      }

      // Single home for the find-by-googleId / link-by-email / create upsert.
      const { user } = await googleAuth({
        googleId: profile.id,
        email,
        username: profile.displayName || `user_${profile.id}`,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        profilePicture: profile.photos?.[0]?.value
      });

      return done(null, user);
    } catch (error) {
      return done(error as Error, undefined);
    }
  }));
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, String(user._id ?? user.id));
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await getUserWithRoles(id);
    done(null, user);
  } catch (error) {
    done(error as Error, null);
  }
});

export default passport;