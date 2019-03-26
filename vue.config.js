let publicPath = '/';
if (process.env.NODE_ENV === 'production' && process.env.BASE_PATH) {
  publicPath = process.env.BASE_PATH;
}

module.exports = {
  lintOnSave: false,
  // publicPath only affects demo application deployed to GH pages.
  publicPath,
};
