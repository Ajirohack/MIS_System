import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { DatabaseService } from '../services/database.service';
import { config } from '../config';
import { logger } from '@shared/utils/logger';
import { generateTokens } from '@shared/utils/crypto';

export class OAuthStrategy {
  private databaseService: DatabaseService;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  configureStrategies(): void {
    // Configure Google OAuth
    if (config.providers.google.isEnabled) {
      passport.use(new GoogleStrategy({
        clientID: config.providers.google.clientId,
        clientSecret: config.providers.google.clientSecret,
        callbackURL: `${config.baseUrl}/auth/google/callback`,
        scope: config.providers.google.scopes,
      }, this.handleGoogleCallback.bind(this)));
    }

    // Configure GitHub OAuth
    if (config.providers.github.isEnabled) {
      passport.use(new GitHubStrategy({
        clientID: config.providers.github.clientId,
        clientSecret: config.providers.github.clientSecret,
        callbackURL: `${config.baseUrl}/auth/github/callback`,
        scope: config.providers.github.scopes,
      }, this.handleGitHubCallback.bind(this)));
    }

    // Configure LinkedIn OAuth
    if (config.providers.linkedin.isEnabled) {
      passport.use(new LinkedInStrategy({
        clientID: config.providers.linkedin.clientId,
        clientSecret: config.providers.linkedin.clientSecret,
        callbackURL: `${config.baseUrl}/auth/linkedin/callback`,
        scope: config.providers.linkedin.scopes,
        state: true,
      }, this.handleLinkedInCallback.bind(this)));
    }

    // Configure Twitter OAuth
    if (config.providers.twitter.isEnabled) {
      passport.use(new TwitterStrategy({
        consumerKey: config.providers.twitter.clientId,
        consumerSecret: config.providers.twitter.clientSecret,
        callbackURL: `${config.baseUrl}/auth/twitter/callback`,
        includeEmail: true,
      }, this.handleTwitterCallback.bind(this)));
    }

    // Configure Facebook OAuth
    if (config.providers.facebook.isEnabled) {
      passport.use(new FacebookStrategy({
        clientID: config.providers.facebook.clientId,
        clientSecret: config.providers.facebook.clientSecret,
        callbackURL: `${config.baseUrl}/auth/facebook/callback`,
        scope: config.providers.facebook.scopes,
        profileFields: ['id', 'displayName', 'photos', 'email'],
      }, this.handleFacebookCallback.bind(this)));
    }

    logger.info('OAuth strategies configured', {
      providers: Object.keys(config.providers).filter(provider => 
        config.providers[provider].isEnabled
      )
    });
  }

  private async handleGoogleCallback(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any
  ): Promise<void> {
    try {
      const userData = {
        provider: 'google',
        providerId: profile.id,
        email: profile.emails?.[0]?.value,
        firstName: profile.name?.givenName || profile.displayName,
        lastName: profile.name?.familyName || '',
        avatar: profile.photos?.[0]?.value,
        profileData: {
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails,
          photos: profile.photos,
        }
      };

      const user = await this.processOAuthUser(userData, accessToken, refreshToken);
      done(null, user);
    } catch (error) {
      logger.error('Google OAuth callback error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        profileId: profile.id
      });
      done(error, null);
    }
  }

  private async handleGitHubCallback(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any
  ): Promise<void> {
    try {
      const userData = {
        provider: 'github',
        providerId: profile.id.toString(),
        email: profile.emails?.[0]?.value,
        firstName: profile.displayName?.split(' ')[0] || profile.username,
        lastName: profile.displayName?.split(' ').slice(1).join(' ') || '',
        avatar: profile.photos?.[0]?.value,
        profileData: {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          emails: profile.emails,
          photos: profile.photos,
        }
      };

      const user = await this.processOAuthUser(userData, accessToken, refreshToken);
      done(null, user);
    } catch (error) {
      logger.error('GitHub OAuth callback error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        profileId: profile.id
      });
      done(error, null);
    }
  }

  private async handleLinkedInCallback(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any
  ): Promise<void> {
    try {
      const userData = {
        provider: 'linkedin',
        providerId: profile.id,
        email: profile.emails?.[0]?.value,
        firstName: profile.name?.givenName || profile.displayName,
        lastName: profile.name?.familyName || '',
        avatar: profile.photos?.[0]?.value,
        profileData: {
          id: profile.id,
          displayName: profile.displayName,
          name: profile.name,
          emails: profile.emails,
          photos: profile.photos,
        }
      };

      const user = await this.processOAuthUser(userData, accessToken, refreshToken);
      done(null, user);
    } catch (error) {
      logger.error('LinkedIn OAuth callback error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        profileId: profile.id
      });
      done(error, null);
    }
  }

  private async handleTwitterCallback(
    token: string,
    tokenSecret: string,
    profile: any,
    done: any
  ): Promise<void> {
    try {
      const userData = {
        provider: 'twitter',
        providerId: profile.id,
        email: profile.emails?.[0]?.value,
        firstName: profile.displayName?.split(' ')[0] || profile.username,
        lastName: profile.displayName?.split(' ').slice(1).join(' ') || '',
        avatar: profile.photos?.[0]?.value,
        profileData: {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          emails: profile.emails,
          photos: profile.photos,
        }
      };

      const user = await this.processOAuthUser(userData, token, tokenSecret);
      done(null, user);
    } catch (error) {
      logger.error('Twitter OAuth callback error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        profileId: profile.id
      });
      done(error, null);
    }
  }

  private async handleFacebookCallback(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any
  ): Promise<void> {
    try {
      const userData = {
        provider: 'facebook',
        providerId: profile.id,
        email: profile.emails?.[0]?.value,
        firstName: profile.name?.givenName || profile.displayName,
        lastName: profile.name?.familyName || '',
        avatar: profile.photos?.[0]?.value,
        profileData: {
          id: profile.id,
          displayName: profile.displayName,
          name: profile.name,
          emails: profile.emails,
          photos: profile.photos,
        }
      };

      const user = await this.processOAuthUser(userData, accessToken, refreshToken);
      done(null, user);
    } catch (error) {
      logger.error('Facebook OAuth callback error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        profileId: profile.id
      });
      done(error, null);
    }
  }

  private async processOAuthUser(
    userData: {
      provider: string;
      providerId: string;
      email?: string;
      firstName: string;
      lastName: string;
      avatar?: string;
      profileData: any;
    },
    accessToken: string,
    refreshToken: string
  ): Promise<any> {
    try {
      // Check if user already exists with this OAuth connection
      let user = await this.databaseService.getUserByOAuthConnection(
        userData.provider,
        userData.providerId
      );

      if (!user) {
        // Check if user exists with the same email
        if (userData.email) {
          user = await this.databaseService.getUserByEmail(userData.email);
        }

        if (!user) {
          // Create new user
          user = await this.databaseService.createUser({
            email: userData.email || `${userData.providerId}@${userData.provider}.oauth`,
            firstName: userData.firstName,
            lastName: userData.lastName,
            avatar: userData.avatar,
            emailVerified: true, // OAuth users are considered verified
            role: 'member',
            status: 'active',
            metadata: {
              oauthProvider: userData.provider,
              oauthProviderId: userData.providerId,
            }
          });

          // Create member profile
          await this.databaseService.createMemberProfile(user.id);

          logger.info('New user created via OAuth', {
            userId: user.id,
            provider: userData.provider,
            email: user.email
          });
        }

        // Create OAuth connection
        await this.databaseService.createOAuthConnection({
          userId: user.id,
          provider: userData.provider,
          providerUserId: userData.providerId,
          accessToken,
          refreshToken,
          profileData: userData.profileData,
        });

        logger.info('OAuth connection created', {
          userId: user.id,
          provider: userData.provider
        });
      } else {
        // Update existing OAuth connection
        await this.databaseService.updateOAuthConnection(
          user.id,
          userData.provider,
          {
            accessToken,
            refreshToken,
            profileData: userData.profileData,
          }
        );

        // Update user avatar if not set
        if (!user.avatar && userData.avatar) {
          await this.databaseService.updateUser(user.id, {
            avatar: userData.avatar
          });
        }

        logger.info('Existing OAuth user logged in', {
          userId: user.id,
          provider: userData.provider
        });
      }

      // Generate JWT tokens
      const tokens = await generateTokens(user.id, user.email, user.role);

      return {
        ...user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      logger.error('Error processing OAuth user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: userData.provider,
        providerId: userData.providerId
      });
      throw error;
    }
  }

  // Get available OAuth providers
  getAvailableProviders(): string[] {
    return Object.keys(config.providers).filter(provider => 
      config.providers[provider].isEnabled
    );
  }

  // Get provider configuration
  getProviderConfig(provider: string): any {
    return config.providers[provider] || null;
  }

  // Validate OAuth state for CSRF protection
  validateOAuthState(state: string, sessionState: string): boolean {
    return state === sessionState;
  }
} 