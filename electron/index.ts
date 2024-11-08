// Native
import { join } from 'path';

// Packages
import { BrowserWindow, app, ipcMain, IpcMainEvent, net } from 'electron';
import isDev from 'electron-is-dev';

const { makeWASocket } = require('@whiskeysockets/baileys');
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

const height = 600;
const width = 800;

const connectToWhatsApp = (id: string, message: any) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
      const sock = makeWASocket({
        version: [2, 2323, 4],
        printQRInTerminal: true,
        auth: state
      });

      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
          let reason = await new Boom(lastDisconnect?.error)?.output?.statusCode;
          if (reason === DisconnectReason.badSession) {
            console.error(`Bad Session, Please Delete /auth and Scan Again`);
            reject('Failed');
          } else if (reason === DisconnectReason.connectionClosed) {
            console.warn('Connection closed, reconnecting....');
            resolve(await connectToWhatsApp(id, message));
          } else if (reason === DisconnectReason.connectionLost) {
            console.warn('Connection Lost from Server, reconnecting...');
            resolve(await connectToWhatsApp(id, message));
          } else if (reason === DisconnectReason.connectionReplaced) {
            console.error('Connection Replaced, Another New Session Opened, Please Close Current Session First');
            reject('Failed');
          } else if (reason === DisconnectReason.loggedOut) {
            console.error(`Device Logged Out, Please Delete /auth and Scan Again.`);
            reject('Failed');
          } else if (reason === DisconnectReason.restartRequired) {
            console.info('Restart Required, Restarting...');
            resolve(await connectToWhatsApp(id, message));
          } else if (reason === DisconnectReason.timedOut) {
            console.warn('Connection TimedOut, Reconnecting...');
            resolve(await connectToWhatsApp(id, message));
          } else {
            console.warn(`Unknown DisconnectReason: ${reason}: ${connection}`);
            resolve(await connectToWhatsApp(id, message));
          }
        } else if (connection === 'open') {
          console.info('Opened connection');
          sock.sendMessage(id, message);
          resolve('Success');
        }
      });

      sock.ev.on('messages.upsert', async (m: any) => {
        console.log(m);
      });
    } catch (e) {
      console.log(e);
      resolve(await connectToWhatsApp(id, message)); //trying to connect if there any error occured
    }
  });
};

function createWindow() {
  // Create the browser window.
  const window = new BrowserWindow({
    width,
    height,
    //  change to false to use AppBar
    frame: false,
    show: true,
    resizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js')
    }
  });

  // const port = process.env.PORT || 3000;
  // const url = isDev ? `http://localhost:${port}` : join(__dirname, '../src/out/index.html');
  const url = join(__dirname, '../src/out/index.html');

  // and load the index.html of the app.
  if (isDev) {
    window?.loadURL(url);
  } else {
    window?.loadFile(url);
  }
  // Open the DevTools.
  // window.webContents.openDevTools();

  // For AppBar
  ipcMain.on('minimize', () => {
    // eslint-disable-next-line no-unused-expressions
    window.isMinimized() ? window.restore() : window.minimize();
    // or alternatively: win.isVisible() ? win.hide() : win.show()
  });
  ipcMain.on('maximize', () => {
    // eslint-disable-next-line no-unused-expressions
    window.isMaximized() ? window.restore() : window.maximize();
  });

  ipcMain.on('close', () => {
    window.close();
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// listen the channel `message` and resend the received message to the renderer process
ipcMain.on('message', async (event: IpcMainEvent, message: any) => {
  await connectToWhatsApp('923435339100@s.whatsapp.net', { text: 'message' });
  console.log(message);
  setTimeout(() => event.sender.send('message', 'Message Send from Electron'), 500);
});

ipcMain.on('connect', (event, message) => {
  console.log(message);
  const url = 'http://localhost:3000/sendWhatAppMessage?groupId=923435339100@s.whatsapp.net&message=Text';

  const request = net.request(url);
  request.on('response', (response) => {
    console.log(`STATUS: ${response.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(response.headers)}`);
    response.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
    });
    response.on('end', () => {
      console.log('No more data in response.');
    });
  });
  request.end();

  setTimeout(() => event.sender.send('connect', 'connected'), 500);
});
