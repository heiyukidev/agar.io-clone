var path = require('path');
var webpack = require('webpack');
module.exports = {
    entry: {
        app: './src/client/js/app.js'
    },

    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'bin/client/js')
    }
};
