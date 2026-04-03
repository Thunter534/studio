const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');
const path = require('path');

const app = express();
const port = Number(process.env.OIDC_APP_PORT || 3001);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const oidcConfig = {
  issuer: process.env.COGNITO_ISSUER || 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_5CLZyN4wf',
  clientId: process.env.COGNITO_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
  clientSecret: process.env.COGNITO_CLIENT_SECRET || '',
  redirectUri: process.env.OIDC_REDIRECT_URI || 'https://athena.test-master.click/auth/callback',
  postLogoutRedirectUri: process.env.OIDC_POST_LOGOUT_REDIRECT_URI || 'https://athena.test-master.click',
  scope: process.env.OIDC_SCOPE || 'openid email profile',
};

// Helper function to get the path from a URL string.
function getPathFromURL(urlString) {
  try {
    const url = new URL(urlString);
    return url.pathname;
  } catch (error) {
    console.error('Invalid URL:', error);
    return null;
  }
}

let client;
let issuer;

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'some secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

const checkAuth = (req, res, next) => {
  if (!req.session.userInfo) {
    req.isAuthenticated = false;
  } else {
    req.isAuthenticated = true;
  }
  next();
};

app.use(checkAuth);

async function initializeClient() {
  issuer = await Issuer.discover(oidcConfig.issuer);

  const hasClientSecret = Boolean(oidcConfig.clientSecret);

  client = new issuer.Client({
    client_id: oidcConfig.clientId,
    client_secret: hasClientSecret ? oidcConfig.clientSecret : undefined,
    redirect_uris: [oidcConfig.redirectUri],
    response_types: ['code'],
    token_endpoint_auth_method: hasClientSecret ? 'client_secret_post' : 'none',
  });
}

app.get('/', checkAuth, (req, res) => {
  res.render('home', {
    isAuthenticated: req.isAuthenticated,
    userInfo: req.session.userInfo,
  });
});

app.get('/login', (req, res) => {
  if (!client) {
    res.status(500).send('OIDC client not initialized.');
    return;
  }

  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();
  const nonce = generators.nonce();

  req.session.codeVerifier = codeVerifier;
  req.session.state = state;
  req.session.nonce = nonce;

  const authUrl = client.authorizationUrl({
    scope: oidcConfig.scope,
    response_type: 'code',
    redirect_uri: oidcConfig.redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });

  res.redirect(authUrl);
});

const callbackPath = getPathFromURL(oidcConfig.redirectUri) || '/auth/callback';

app.get(callbackPath, async (req, res) => {
  if (!client) {
    res.status(500).send('OIDC client not initialized.');
    return;
  }

  try {
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(
      oidcConfig.redirectUri,
      params,
      {
        state: req.session.state,
        nonce: req.session.nonce,
        code_verifier: req.session.codeVerifier,
      }
    );

    const userInfo = await client.userinfo(tokenSet.access_token);

    req.session.tokenSet = tokenSet;
    req.session.userClaims = tokenSet.claims();
    req.session.userInfo = userInfo;
    res.redirect('/');
  } catch (error) {
    console.error('Callback error:', error);
    res.redirect('/');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    const logoutUrl = `https://athena-auth-test-master.auth.us-east-1.amazoncognito.com/logout?client_id=79b58u7opcn25c3oe7a93urqd4&logout_uri=https://athena.test-master.click`;
    res.redirect(logoutUrl);
  });
});

initializeClient()
  .then(() => {
    app.listen(port, () => {
      console.log(`OIDC app listening on http://localhost:${port}`);
      console.log(`Issuer: ${oidcConfig.issuer}`);
      console.log(`Redirect URI: ${oidcConfig.redirectUri}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize OIDC client:', error);
    process.exit(1);
  });
