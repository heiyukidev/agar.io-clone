// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth' : {
        'clientID'        : '1849476105327877', // your App ID
        'clientSecret'    : '535956a17ea7820a3c723044591c0b6a', // your App Secret
        'callbackURL'     : 'https://hyagario.herokuapp.com/auth/callback',
        'profileURL': 'https://graph.facebook.com/v2.8/me?fields=first_name,last_name,email'

    }
};
