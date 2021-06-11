const chalk = require('chalk');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');

module.exports = function tapCompiler(compiler, onChange, { readyMessage = '' } = {}) {
  compiler.hooks.invalid.tap('invalid', () => {
    onChange('Compiling...');
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
      onChange(chalk.green(`Compiled successfully!`) + ` ${readyMessage}`);
    }

    // If errors exist, only show errors.
    if (messages.errors.length) {
      // Only keep the first error. Others are often indicative
      // of the same problem, but confuse the reader with noise.
      if (messages.errors.length > 1) {
        messages.errors.length = 1;
      }
      onChange(chalk.red('Failed to compile.\n') + messages.errors.join('\n\n'));
      return;
    }

    // Show warnings if no errors were found.
    if (messages.warnings.length) {
      onChange(chalk.yellow('Compiled with warnings.\n') + messages.warnings.join('\n\n'));
    }
  });
}
