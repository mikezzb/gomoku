import React, { useState, useEffect, useRef, useReducer } from 'react';
import { isMobile } from 'react-device-detect';
import io from 'socket.io-client';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

const cellWidth = isMobile ? 28 : 40;
const socket = io('localhost:5000');

/*
const socket = io();
const socket = io('localhost:5000');
const socket = io('192.168.1.114:5000');
*/

const Board = props => {
  const [message, setMessage] = useState('');
  const [messageArray, setMessageArray] = useState([]);
  const [isBlack, setIsBlack] = useState(true);
  const [board, setBoard] = useState([]); // null:empty, true: black, false:white
  const [boardSize, setBoardSize] = useState(isMobile ? 11 : 15);
  const [moveNumber, setMoveNumber] = useState(0);
  const [snackbarMessage, setSnackbarMessage] = useState(null);

  const [roomno, setRoomno] = useState(props.initialRoomno);
  const [roomPlayerNumber, setRoomPlayerNumber] = useState(0);

  const [currentMove, setCurrentMove] = useState(null);

  const [status, setStatus] = useReducer(
    (state, action) => ({ ...state, ...action }),
    {
      started: false,
      userJoined: false,
      waiting: false,
      winner: null,
      connected: false,
      opponentName: '',
    }
  );

  // change userJoined, winner, waiting, connected to reducer

  const messagesEnd = useRef(null);
  const canvas = useRef(null);

  const initialize = () => {
    const ctx = canvas.current.getContext('2d');
    ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    const row = [];
    for (let i = 0; i <= boardSize; i++) {
      const col = [];
      for (let j = 0; j <= boardSize; j++) {
        ctx.moveTo(cellWidth / 2 + i * cellWidth, cellWidth / 2);
        ctx.lineTo(
          cellWidth / 2 + i * cellWidth,
          cellWidth * boardSize + cellWidth / 2
        );
        ctx.stroke();
        ctx.moveTo(cellWidth / 2, cellWidth / 2 + i * cellWidth);
        ctx.lineTo(
          cellWidth * boardSize + cellWidth / 2,
          cellWidth / 2 + i * cellWidth
        );
        ctx.stroke();
        col.push(null);
      }
      row.push(col); // initialize null 2D [15][15] Array as the board
    }
    ctx.closePath();
    setBoard(row);
    setMoveNumber(0);
    setStatus({ winner: null });
  };

  const socketInit = async () => {
    if (props.onlineMode) {
      socket.open();
      socket.on('move', move => {
        setStatus({ waiting: false });
        setCurrentMove(move);
      });
      socket.on('emitUsername', data => {
        setStatus({ opponentName: data.username });
        if (data.size !== boardSize && data.size === 11) {
          setBoardSize(11);
        } else {
          initialize();
        }
      });
      socket.on('roomChat', data => {
        // sent chat message
        if (isMobile) {
          setSnackbarMessage(`${status.opponentName}: ${data.message}`);
        } else {
          setMessageArray(old => [
            ...old.concat([
              {
                message: data.message,
                isOpponent: true,
                sendTime: data.sendTime,
              },
            ]),
          ]);
        }
      });
      if (!status.started) {
        socket.on('setPlayingColor', data => {
          // receive opponent color setting
          setIsBlack(data.id === socket.id ? data.isBlack : !data.isBlack);
          setStatus({
            waiting: data.id === socket.id ? !data.isBlack : data.isBlack,
            started: true,
          });
          setSnackbarMessage('Match Started!');
        });
      }
      socket.on('quitRoom', () => {
        setSnackbarMessage(
          'Your opponent quited, you win! 不戰而屈人之兵，善之善者也。'
        );
        setMoveNumber(0);
        setStatus({
          userJoined: false,
          started: false,
          opponentName: '',
        });
        setTimeout(() => {
          initialize();
        }, 1000);
      });
      socket.on('rematch', () => {
        setSnackbarMessage('Rematch is requested!');
        setStatus({ started: false });
        initialize();
      });
      if (roomno === null) {
        socket.emit('joinRoom', props.initialRoomno);
      }
    }
  };

  useEffect(() => {
    socketInit();
    initialize();
    return () => {
      socket.disconnect();
    };
  }, [props?.onlineMode]);

  const onUnload = () => {
    socket.emit('quitRoom', roomno);
    return undefined;
  };

  useEffect(() => {
    if (props.onlineMode) {
      socket.on('connectToRoom', data => {
        if (data.clientCount === 1) {
          socket.emit('emitUsername', {
            roomno: data.roomno,
            username: props.username,
            size: boardSize,
          });
          setStatus({ userJoined: true });
        }
        if (roomno === null) {
          setStatus({
            connected: true,
            waiting: true,
          });
          setRoomno(data.roomno);
          setRoomPlayerNumber(roomPlayerNumber + 1);
          setSnackbarMessage(`You have entered room ${data.roomno}`);
        }
      });
    }
  }, [props.username, props.onlineMode]);

  useEffect(() => {
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [roomno]);

  const gameOver = move => {
    // can optimise
    const startingIndexVerticle = move.y - 4 >= 0 ? move.y - 4 : 0;
    for (let i = startingIndexVerticle; i <= move.y; i++) {
      let counter = 0;
      for (let j = 0; j < 5; j++) {
        if (i + j > boardSize) break;
        if (board[i + j][move.x] === move.isBlack) counter++;
        else break;
      }
      if (counter === 5) return true;
    }
    // check Horizontal
    const startingIndexHorizontal = move.x - 4 >= 0 ? move.x - 4 : 0;
    for (let i = startingIndexHorizontal; i <= move.x; i++) {
      let counter = 0;
      for (let j = 0; j < 5; j++) {
        if (i + j > boardSize) break;
        if (board[move.y][i + j] === move.isBlack) counter++;
        else break;
      }
      if (counter === 5) return true;
    }
    // Check \ and /
    for (let i = -4; i <= 0; i++) {
      let counterSlash = 0;
      let counterBackSlash = 0;
      for (let j = 0; j < 5; j++) {
        if (
          move.y + i + j > boardSize ||
          move.y + i + j < 0 ||
          move.x + i + j > boardSize ||
          move.x + i + j < 0
        )
          continue;
        if (board[move.y + i + j][move.x + i + j] === move.isBlack)
          counterSlash++;
        else break;
      }
      for (let j = 0; j < 5; j++) {
        if (
          move.y - i - j > boardSize ||
          move.y - i - j < 0 ||
          move.x + i + j > boardSize ||
          move.x + i + j < 0
        )
          continue;
        if (board[move.y - i - j][move.x + i + j] === move.isBlack)
          counterBackSlash++;
        else break;
      }
      if (counterSlash === 5 || counterBackSlash === 5) return true;
    }
    return false;
  };

  const judger = move => {
    const isBlackCopy = move.isBlack === null ? isBlack : move.isBlack;
    const moveNumberCopy = moveNumber;
    if (board[move.y][move.x] === null) {
      // if the position is empty then place the piece
      if (status.connected && move.isBlack === null) {
        socket.emit('move', {
          x: move.x,
          y: move.y,
          isBlack: isBlackCopy,
          roomno,
        });
      }
      // draw piece
      const ctx = canvas.current.getContext('2d');
      ctx.beginPath();
      ctx.fillStyle = isBlackCopy ? 'black' : 'white'; // piece color
      ctx.arc(
        Math.floor(move.x) * cellWidth + cellWidth / 2, // x coord
        Math.floor(move.y) * cellWidth + cellWidth / 2, // y coord
        cellWidth / 2, // radius
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.closePath();
      const boardCopy = board;
      boardCopy[move.y][move.x] = isBlackCopy; // rmb coordinate are reversed compared with the pixel position
      setBoard(boardCopy);
      setMoveNumber(moveNumberCopy + 1);
      if (!status.connected) setIsBlack(!isBlack);

      if (move.isBlack === null && status.connected)
        setStatus({ waiting: true });

      if (gameOver({ x: move.x, y: move.y, isBlack: isBlackCopy })) {
        // if game over
        const winnerCopy = move.isBlack === null ? isBlack : move.isBlack;
        const winnerText = winnerCopy ? 'Black' : 'White';
        setSnackbarMessage(` GG ${winnerText} Win!`);
        setStatus({
          winner: winnerText,
          waiting: true,
        });
      } else if (moveNumberCopy + 1 === (boardSize + 1) * (boardSize + 1)) {
        setSnackbarMessage('Draw!');
      }
    }
  };

  const canvasOnclick = e => {
    if (!status.waiting) {
      const x = Math.floor(e.nativeEvent.offsetX / cellWidth);
      const y = Math.floor(e.nativeEvent.offsetY / cellWidth);
      setCurrentMove({ x, y, isBlack: null });
    } else {
      setSnackbarMessage(
        status.winner !== null
          ? 'Match Ended! Press Rematch to start a new one! '
          : 'Please Wait Your Opponent!'
      );
    }
  };

  useEffect(() => {
    if (currentMove) {
      judger(currentMove);
    }
  }, [currentMove]);

  useEffect(() => initialize(), [boardSize]);

  const setColor = isBlackCopy => {
    socket.emit('setPlayingColor', {
      roomno,
      isBlack: isBlackCopy,
      size: boardSize,
      id: socket.id,
    });
  };

  const sendMessage = e => {
    e.preventDefault();
    const sendTime = Date.now();
    socket.emit('roomChat', {
      roomno,
      message,
      sendTime,
    });
    setMessage('');
    setMessageArray([
      ...messageArray.concat({
        message,
        isOpponent: false,
        sendTime,
      }),
    ]);
  };

  useEffect(() => {
    if (messagesEnd && messagesEnd.current) {
      messagesEnd.current.scrollIntoView();
    }
  }, [messageArray.length]);

  const rematch = () => {
    if (status.connected) socket.emit('rematch', roomno);
    else {
      initialize();
      setStatus({ waiting: false });
    }
  };

  useEffect(() => {
    setTimeout(() => setSnackbarMessage(null), 2900);
  }, [snackbarMessage]);

  const messageForm = (
    <form onSubmit={sendMessage} className="messageForm">
      <input
        className="chatInput"
        value={message}
        required
        onChange={e => setMessage(e.target.value)}
        type="text"
        placeholder="Say something to your opponent!"
      />
      <input type="submit" style={{ visibility: 'hidden' }} />
    </form>
  );

  return (
    <div className="mainWrapper">
      <div className="boardWrapper">
        <div className="label">
          {status.connected && (
            <div className="labelBold">
              {`${props.username} VS ${status.opponentName}`}
              {status.winner && `| Winner: ${status.winner}`}
            </div>
          )}
          {((status.winner !== null && status.started) ||
            !status.connected) && (
            <div onClick={rematch} className="labelBold rematch">
              Rematch!
            </div>
          )}
          <div>
            {'Playing: '}
            <span
              className="dot"
              style={
                isBlack
                  ? { backgroundColor: 'black', height: 13, width: 13 }
                  : {
                      backgroundColor: 'white',
                      border: 'rgba(0, 0, 0, 0.4) 1px solid',
                    }
              }
            />
            {` | Status: ${
              status.waiting ? 'Waiting... ' : 'Your Move! '
            }| Latest Move: ${
              currentMove !== null
                ? `${
                    (
                      currentMove.isBlack === null
                        ? isBlack
                        : currentMove.isBlack
                    )
                      ? 'B '
                      : 'W '
                  } ${currentMove.y}, ${currentMove.x}`
                : ''
            }`}
          </div>
        </div>
        <canvas
          className="gameboard"
          ref={canvas}
          width={cellWidth * (boardSize + 1)}
          height={cellWidth * (boardSize + 1)}
          onClick={canvasOnclick}
        />
        <Dialog open={status.userJoined && !status.started}>
          <DialogTitle>{`${status.opponentName} is Challenging You!!!!`}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {
                'Please Choose Black or White stone to start (Black first), first come first served >.<'
              }
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setColor(false)} color="primary">
              White
            </Button>
            <Button onClick={() => setColor(true)} color="primary" autoFocus>
              Black
            </Button>
          </DialogActions>
        </Dialog>
      </div>
      {!isMobile && status.connected && (
        <div className="chatboxWrapper">
          <div className="chatboxLabel">
            <span
              className="dot"
              style={status.userJoined ? { backgroundColor: 'green' } : null}
            />
            {`Room: ${roomno}`}
          </div>
          <div
            className="messageContainer"
            style={{ height: cellWidth * (boardSize + 1) - 58 }}
          >
            {messageArray.map(msg => (
              <div
                key={msg.sendTime}
                className={msg.isOpponent ? 'box s2' : 'box s1'}
                style={
                  msg.isOpponent
                    ? {
                        background: 'rgb(248, 161, 176)',
                        alignSelf: 'flex-start',
                        marginLeft: 8,
                      }
                    : null
                }
              >
                {msg.message}
              </div>
            ))}
            <div // psedoelement for scrolling to bottom
              className="messageEnd"
              ref={messagesEnd}
            />
          </div>
          {messageForm}
        </div>
      )}
      {isMobile && status.connected && (
        <div className="mobileMessageForm">{messageForm}</div>
      )}
      <div className={snackbarMessage ? 'snackbar show' : 'snackbar'}>
        {snackbarMessage}
      </div>
    </div>
  );
};

export default Board;
