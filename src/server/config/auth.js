// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth': {
        'clientID': '1849476105327877', // your App ID
        'clientSecret': '92fa52f8dc32f2610ddeb6e3c5d5a4d9', // your App Secret
        'callbackURL': 'http://localhost:3000/auth/callback',
        'productionCallbackURL': 'http://elkoura-3andek.tn/auth/callback',
        'profileURL': 'https://graph.facebook.com/v2.8/me?fields=first_name,last_name,email'

    }
};
