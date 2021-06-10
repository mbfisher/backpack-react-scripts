// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// @remove-on-eject-end
'use strict';

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// Ensure environment variables are read.
require('../config/env');
// @remove-on-eject-begin
// Do the preflight check (only happens before eject).
const verifyPackageTree = require('./utils/verifyPackageTree');
if (process.env.SKIP_PREFLIGHT_CHECK !== 'true') {
  verifyPackageTree();
}
const verifyTypeScriptSetup = require('./utils/verifyTypeScriptSetup');
verifyTypeScriptSetup();
// @remove-on-eject-end

const fs = require('fs');
const chalk = require('react-dev-utils/chalk');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const clearConsole = require('react-dev-utils/clearConsole');
const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles');
const {
  choosePort,
  createCompiler,
  prepareProxy,
  prepareUrls,
} = require('react-dev-utils/WebpackDevServerUtils');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const openBrowser = require('react-dev-utils/openBrowser');
const paths = require('../config/paths');
const configFactory = require('../config/webpack.config');
const createDevServerConfig = require('../config/webpackDevServer.config');
/** ADDED **/
const ssrConfigFactory = require('../config/webpack.config.ssr');

const statusFile = require('./utils/statusFile');

const useYarn = fs.existsSync(paths.yarnLockFile);
const isInteractive = process.stdout.isTTY;

// Warn and crash if required files are missing
if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
  process.exit(1);
}

// Tools like Cloud9 rely on this.
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

if (process.env.HOST) {
  console.log(
    chalk.cyan(
      `Attempting to bind to HOST environment variable: ${chalk.yellow(
        chalk.bold(process.env.HOST),
      )}`,
    ),
  );
  console.log(
    `If this was unintentional, check that you haven't mistakenly set it in your shell.`,
  );
  console.log(
    `Learn more here: ${chalk.yellow('https://bit.ly/CRA-advanced-config')}`,
  );
  console.log();
}

const compilerStatus = {
  web: 'Starting...',
  ssr: 'Starting...',
};

function setCompilerStatus(build, message) {
  compilerStatus[build] = message;
  updateStatus();
}

function printBorder() {
  console.log()
  console.log('='.repeat(process.stdout.columns || 30));
  console.log()
}

function updateStatus() {
  if (isInteractive) {
    clearConsole();
  }

  const blocks = [
    {build: 'web', label: 'web', color: 'bgBlue'},
    {build: 'ssr', label: 'ssr', color: 'bgMagenta'},
  ];

  // We only need a top border in interactive mode - in non-interactive mode
  // the bottom border demarcates builds.
  if (isInteractive) {
    printBorder();
  }

  blocks.forEach((block, index) => {
    const color = chalk.black[block.color];
    const label = isInteractive ? color(` ${block.label} `) : `[${block.label}]`;

    const message = compilerStatus[block.build];
    console.log(message
      .split('\n')
      .map(line => `${label}  ${line}`)
      .join('\n'));

    // Build separator
    if (index < blocks.length - 1) {
      console.log()
      // // console.log('═'.repeat(process.stdout.columns));
      console.log('-'.repeat(process.stdout.columns || 30));
      console.log()
    }
  });

  // Bottom border
  printBorder();
}

function tapCompiler(compiler, build, { readyMessage = '' } = {}) {
  compiler.hooks.invalid.tap('invalid', () => {
    setCompilerStatus(build, 'Compiling...');
  });

  compiler.hooks.done.tap('done', async stats => {
    const statsData = stats.toJson({
      all: false,
      warnings: true,
      errors: true,
    });

    const messages = formatWebpackMessages(statsData);
    const isSuccessful = !messages.errors.length && !messages.warnings.length;
    if (isSuccessful) {
      setCompilerStatus(build, chalk.green(`Compiled successfully!`) + ` ${readyMessage}`);
    }

    // If errors exist, only show errors.
    if (messages.errors.length) {
      // Only keep the first error. Others are often indicative
      // of the same problem, but confuse the reader with noise.
      if (messages.errors.length > 1) {
        messages.errors.length = 1;
      }
      setCompilerStatus(build, chalk.red('Failed to compile.\n') + messages.errors.join('\n\n'));
      return;
    }

    // Show warnings if no errors were found.
    if (messages.warnings.length) {
      setCompilerStatus(build, chalk.yellow('Compiled with warnings.\n') + messages.warnings.join('\n\n'));
    }
  });
}

// We require that you explicitly set browsers and do not fall back to
// browserslist defaults.
const { checkBrowsers } = require('react-dev-utils/browsersHelper');
checkBrowsers(paths.appPath, isInteractive)
  .then(() => {
    // We attempt to use the default port but if it is busy, we offer the user to
    // run on a different port. `choosePort()` Promise resolves to the next free port.
    return choosePort(HOST, DEFAULT_PORT);
  })
  .then(port => {
    if (port == null) {
      // We have not found a port.
      return;
    }

    const config = configFactory('development');
    const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
    const appName = require(paths.appPackageJson).name;
    const useTypeScript = fs.existsSync(paths.appTsConfig);
    const tscCompileOnError = process.env.TSC_COMPILE_ON_ERROR === 'true';
    const urls = prepareUrls(
      protocol,
      HOST,
      port,
      paths.publicUrlOrPath.slice(0, -1),
    );
    const devSocket = {
      warnings: warnings =>
        devServer.sockWrite(devServer.sockets, 'warnings', warnings),
      errors: errors =>
        devServer.sockWrite(devServer.sockets, 'errors', errors),
    };

    /** CHANGED **/
      // Create a webpack compiler that is configured with custom messages.
      // const compiler = createCompiler({
      //   appName,
      //   config,
      //   devSocket,
      //   urls,
      //   useYarn,
      //   useTypeScript,
      //   tscCompileOnError,
      //   webpack,
      // });

    const compiler = webpack(config);

    tapCompiler(compiler, 'web', {
      readyMessage: `Listening on ${urls.localUrlForTerminal}`
    });
    statusFile.init(compiler, paths.appBuildWeb);

    // Load proxy config
    const proxySetting = require(paths.appPackageJson).proxy;
    const proxyConfig = prepareProxy(
      proxySetting,
      paths.appPublic,
      paths.publicUrlOrPath,
    );
    // Serve webpack assets generated by the compiler over a web server.
    const serverConfig = createDevServerConfig(
      proxyConfig,
      urls.lanUrlForConfig,
    );

    serverConfig.writeToDisk = filePath => {
      return /loadable-stats\.json/.test(filePath);
    };

    const devServer = new WebpackDevServer(compiler, serverConfig);
    // Launch WebpackDevServer.
    devServer.listen(port, HOST, err => {
      if (err) {
        return console.log(err);
      }

      if (isInteractive) {
        clearConsole();
      }

      // We used to support resolving modules according to `NODE_PATH`.
      // This now has been deprecated in favor of jsconfig/tsconfig.json
      // This lets you use absolute paths in imports inside large monorepos:
      if (process.env.NODE_PATH) {
        console.log(
          chalk.yellow(
            'Setting NODE_PATH to resolve modules absolutely has been deprecated in favor of setting baseUrl in jsconfig.json (or tsconfig.json if you are using TypeScript) and will be removed in a future major release of create-react-app.',
          ),
        );
        console.log();
      }

      console.log(chalk.cyan('Starting the development server...\n'));
      if (!isInteractive) {
        printBorder();
      }

      openBrowser(urls.localUrlForBrowser);
    });

    /** ADDED **/
    const ssrCompiler = webpack(ssrConfigFactory('development'));

    tapCompiler(ssrCompiler, 'ssr');
    statusFile.init(ssrCompiler, paths.appBuildSsr);

    ssrCompiler.watch(
      {
        ignored: ['node_modules'],
      },
      (err) => {
        if (err) {
          console.log(err.message || err);
          process.exit(1);
        }

        statusFile.done(paths.appBuildSsr);
      },
    );

    ['SIGINT', 'SIGTERM'].forEach(function(sig) {
      process.on(sig, function() {
        devServer.close();
        process.exit();
      });
    });

    if (isInteractive || process.env.CI !== 'true') {
      // Gracefully exit when stdin ends
      process.stdin.on('end', function() {
        devServer.close();
        process.exit();
      });
      process.stdin.resume();
    }
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
