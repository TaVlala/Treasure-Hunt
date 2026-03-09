// PostCSS config — Tailwind config path is explicit because process.cwd()
// differs from the project root when next dev <dir> is invoked from a parent folder.
const path = require('path');

module.exports = {
  plugins: {
    tailwindcss: {
      config: path.join(__dirname, 'tailwind.config.js'),
    },
    autoprefixer: {},
  },
};
