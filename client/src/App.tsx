import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import './App.css';
import Board from './components/Board';

const App = () => {
  const [showDialog, setShowDialog] = useState(true);
  const [username, setUsername] = useState('');
  const [roomno, setRoomno] = useState(null);
  const [onlineMode, setOnlineMode] = useState(false);

  const setMode = (e, isOnline) => {
    if (isOnline) e.preventDefault();
    setShowDialog(false);
    setOnlineMode(isOnline);
    Cookies.set('username', username, { expires: 1 });
  };

  useEffect(() => {
    const usernameSaved = Cookies.get('username');
    if (usernameSaved !== undefined) {
      setUsername(usernameSaved);
    }
  }, []);

  return (
    <div className="App">
      {showDialog && (
        <div className="configContainer">
          <div className="container">
            <div className="left">
              <div className="headerText">Gomoku.io</div>
              <div className="detailText">
                Please Choose the mode that you want to play
              </div>
            </div>
            <div className="right">
              <form className="mainForm" onSubmit={e => setMode(e, true)}>
                <span className="mainLabel">Username</span>
                <input
                  className="mainInput"
                  required
                  value={username}
                  type="text"
                  onChange={e => setUsername(e.target.value)}
                />
                <span className="mainLabel">Room Number (optional)</span>
                <input
                  className="mainInput"
                  type="number"
                  onChange={e => setRoomno(e.target.value)}
                />
                <div>
                  <div
                    className="submitButton"
                    onClick={() => setMode(null, false)}
                  >
                    Play Offline Game
                  </div>
                  <input
                    className="submitButton"
                    type="submit"
                    value="Find Online Match!"
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <Board
        onlineMode={onlineMode}
        username={username}
        initialRoomno={roomno}
      />
    </div>
  );
};

export default App;
