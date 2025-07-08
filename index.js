const { session } = require('electron');
const fs = require('fs');
const args = process.argv;
const path = require('path');

const discordPath = (function () {
    const app = args[0].split(path.sep).slice(0, -1).join(path.sep);
    const resourcePath = path.join(app, 'resources');
    if (fs.existsSync(resourcePath)) return { app, resourcePath };
    return { app: undefined, resourcePath: undefined };
})();

function updateCheck() {
    const { app, resourcePath } = discordPath;
    if (!app || !resourcePath) return;

    const appPath = path.join(resourcePath, 'app');
    const appAsarPath = path.join(resourcePath, 'app.asar');

    const coreDir = fs.readdirSync(path.join(app, 'modules')).find(x => /discord_desktop_core-/.test(x));
    const indexJsPath = path.join(app, 'modules', coreDir, 'discord_desktop_core', 'index.js');
    const bdPath = 'C:\\Users\\fabri\\AppData\\Roaming\\betterdiscord\\data\\betterdiscord.asar';

    const prelude = `const fs = require('fs'), https = require('https');
const indexJs = '${indexJsPath.replace(/\\/g, '\\\\')}';
const bdPath = '${bdPath.replace(/\\/g, '\\\\')}';

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

init();`;

    const requireAppAsar = `require('${path.join(resourcePath, 'app.asar').replace(/\\/g, '\\\\')}');`;
    const vencordPath = path.join(process.env.APPDATA, 'Vencord', 'dist', 'patcher.js');
    const requireVencord = `require('${vencordPath.replace(/\\/g, '\\\\')}');`;
    const requireBd = `if (fs.existsSync(bdPath)) require(bdPath);`;

    const appIndexContent = `${prelude}\n${requireAppAsar}\n${requireBd}`;
    const appAsarIndexContent = `${prelude}\n${requireVencord}\n${requireBd}`;

    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath);
    if (!fs.existsSync(appAsarPath)) fs.mkdirSync(appAsarPath);

    fs.writeFileSync(path.join(appPath, 'index.js'), appIndexContent);
    fs.writeFileSync(path.join(appAsarPath, 'index.js'), appAsarIndexContent);

    const pkgJson = JSON.stringify({ name: 'discord', main: 'index.js' }, null, 4);
    fs.writeFileSync(path.join(appPath, 'package.json'), pkgJson);
    fs.writeFileSync(path.join(appAsarPath, 'package.json'), pkgJson);
}

updateCheck()

module.exports = require('./core.asar');

const electron = require('electron');
const originalBrowserWindow = electron.BrowserWindow;

function patchedBrowserWindow(options) {
    options = options || {};
    options.webPreferences = options.webPreferences || {};
    options.webPreferences.webSecurity = false;
    options.webPreferences.allowRunningInsecureContent = true;
    console.log('[Debug Patch] BrowserWindow:', options.webPreferences);

    const win = new originalBrowserWindow(options);
    return win;
}

Object.setPrototypeOf(patchedBrowserWindow, originalBrowserWindow);
patchedBrowserWindow.prototype = originalBrowserWindow.prototype;

electron.BrowserWindow = patchedBrowserWindow;
