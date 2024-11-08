import React, { useEffect, useState } from 'react';
import AppBar from './AppBar';
import io from 'socket.io-client';
const socket = io.connect('http://localhost:4000');
function App() {
  console.log(window.ipcRenderer);

  const [isOpen, setOpen] = useState(false);
  const [isSent, setSent] = useState(false);
  const [fromMain, setFromMain] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const handleToggle = () => {
    if (isOpen) {
      setOpen(false);
      setSent(false);
    } else {
      setOpen(true);
      setFromMain(null);
    }
  };
  const sendMessageToElectron = () => {
    if (window.Main) {
      window.Main.sendMessage("Hello I'm from React World");
    } else {
      setFromMain('You are in a Browser, so no Electron functions are available');
    }
    setSent(true);
  };

  const connectWithWhatsapp = () => {
    socket.emit("send_message", { message: "message" });
    console.warn("clicked");
    // socket.on('receive_message', (data: any) => {
    //   console.log(data);
    //   setMessage(data.message);
    // });
    // if (window.Main) {
    //   window.Main.connectWithWhatsApp('Connect with whatsapp');
    // }
  };

  useEffect(() => {
    if (isSent && window.Main)
      window.Main.on('message', (message: string) => {
        setFromMain(message);
      });

    window.Main.on('connect', (message: string) => {
      console.log(message + 'From Backend');
    });

    window.Main.on('socket', (message: string) => {
      console.log(message + 'From Socket');
    });
  }, [fromMain, isSent]);

  useEffect(() => {
    socket.on('connect', function () {
      console.log('Connected');
    });
    socket.on('event', function (data: any) {
      console.log('received event: ', data);
    });
    socket.on('receive_message', (data: any) => {
      console.log(data);
      setMessage(data.message);
    });
    socket.on('disconnect', function () {
      console.log('Disconnected');
    });
  }, [socket]);

  return (
    <div className="flex flex-col h-screen">
      {window.Main && (
        <div className="flex-none">
          <AppBar />
        </div>
      )}
      <div className="flex-auto">
        <div className=" flex flex-col justify-center items-center h-full bg-gray-800 space-y-4">
          <h1 className="text-2xl text-gray-200">Vite + React + Typescript + Electron + Tailwind</h1>
          <button
            className="bg-yellow-400 py-2 px-4 rounded focus:outline-none shadow hover:bg-yellow-200"
            onClick={handleToggle}
          >
            Click Me
          </button>
          {isOpen && (
            <div className="flex flex-col space-y-4 items-center">
              <div className="flex space-x-3">
                <h1 className="text-xl text-gray-50">💝 Welcome 💝, now send a message to the Main 📩📩</h1>
                <button
                  onClick={sendMessageToElectron}
                  className=" bg-green-400 rounded px-4 py-0 focus:outline-none hover:bg-green-300"
                >
                  Send
                </button>
              </div>
              {isSent && (
                <div>
                  <h4 className=" text-green-500">Message sent!!</h4>
                </div>
              )}
              {fromMain && (
                <div>
                  {' '}
                  <h4 className=" text-yellow-200">{fromMain}</h4>
                </div>
              )}
            </div>
          )}
          <div>
            <button
              style={{ backgroundColor: 'green', padding: 10, fontSize: 18, borderRadius: 10 }}
              onClick={connectWithWhatsapp}
            >
              Connect to Whatsapp
            </button>
          </div>
          {message && (
                <div>
                  <h4 className=" text-green-500">{message}</h4>
                </div>
              )}
        </div>
      </div>
    </div>
  );
}

export default App;
