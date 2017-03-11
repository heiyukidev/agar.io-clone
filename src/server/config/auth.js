// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth': {
        'clientID': '638610069655704', // your App ID
        'clientSecret': '14b611b171a41c3f3558433073fbc738', // your App Secret
        'callbackURL': 'http://localhost:3000/auth/callback',
        'productionCallbackURL': 'http://elkoura-3andek.tn/auth/callback',
        'profileURL': 'https://graph.facebook.com/v2.8/me?fields=first_name,last_name,email'

    }
};
