var path = require('path');

module.exports = {
  entry: './src/client/js/app.js',
  output: {
    filename: 'bundle.min.js',
    path: path.resolve(__dirname, 'bin/client/js')
  }
};
