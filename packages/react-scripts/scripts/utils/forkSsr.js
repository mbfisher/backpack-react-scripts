const webpack = require('webpack');
const ssrConfigFactory = require('../../config/webpack.config.ssr');
const statusFile = require('./statusFile');
const tapCompiler = require('./tapCompiler');
const paths = require('../../config/paths');

const ssrCompiler = webpack(ssrConfigFactory('development'));

tapCompiler(ssrCompiler, message => {
  process.send(message);
});

statusFile.init(ssrCompiler, paths.appBuildSsr);

ssrCompiler.watch(
  {
    ignored: ['node_modules'],
  },
  (err) => {
    if (err) {
      // TODO: Fix this
      console.log(err.message || err);
      process.exit(1);
    }

    statusFile.done(paths.appBuildSsr);
  },
);
