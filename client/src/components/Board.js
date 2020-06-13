import React, { Component } from 'react';
import {isMobile} from "react-device-detect";
import io from 'socket.io-client';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

let cellWidth=isMobile?28:40
var socket = io();
/*
var socket = io();
var socket = io('192.168.1.114:5000');
*/

export default class Board extends Component{
    constructor(props){
        super(props)
        this.state={
            message:'',
            messageArray:[],
            canvasHeight:0,
            roomPlayerNumber:0,
            username:'',
            opponentName:'',
            isBlack:true,
            board:[],//null:empty, true: black, false:white
            winner:null,
            boardSize:isMobile?11:15,
            moveNumber:0,
            waiting:false,//disable action if user is waiting for opponent move
            roomno:null,//connected room number
            userJoined:false,
            started:false,
            latestMove:'',
            snackbarMessage:null,
            connected:false //connected if online pvp, else play with computer or local pvp
        }
        this.messagesEnd=React.createRef();
        this.scrollToBottom=this.scrollToBottom.bind(this)
        this.toast=this.toast.bind(this)
    }

    componentDidMount(){
        if(this.props.onlineMode){
            this.setState({username:this.props.username})
            socket.on("move",(move)=>{
                console.log('Received Opponent Move: x:'+move.x+' y:'+move.y+' isBlack: '+move.isBlack);
                this.setState({waiting:false})
                this.judger(move.x,move.y,move.isBlack)
            })
            socket.on("emitUsername",(data)=>{
                this.setState({opponentName:data.username})
                if(data.size!==this.state.boardSize && data.size===11)
                    this.setBoardSize(11)
                else
                    this.initialize()
            })
            socket.on('connectToRoom',(data)=>{
                console.log('connected to room no. '+data.roomno+'number of clients '+data.clientCount+' Joined? '+this.state.userJoined)
                if(data.clientCount===1){
                    console.log('Emitting username out!!!')
                    socket.emit('emitUsername',{
                        roomno:data.roomno,
                        username:this.state.username,
                        size:this.state.boardSize
                    })
                    this.setState({userJoined:true})
                }
                if(this.state.roomno===null){
                    this.setState({
                        connected:true,
                        waiting:true,
                        roomno:data.roomno,
                        roomPlayerNumber:this.state.roomPlayerNumber+1
                    })
                    this.toast('You have entered room '+data.roomno)
                }
            });
            socket.on('roomChat',(message)=>{//sent chat message
                if(isMobile){//since mobile have no space for chat room, can add a line of input at bottom [TO BE FIXED]
                    this.toast(this.state.opponentName+': '+message)
                }else{
                    let messageArray=this.state.messageArray
                    messageArray.push({
                        message:message,
                        isOpponent:true
                    })
                    this.setState({messageArray:messageArray})
                }
            })
            if(!this.state.started){
                socket.on('setPlayingColor',(data)=>{//received opponent color setting
                    if(data.id===socket.id){
                        this.setState({
                            isBlack:data.isBlack,
                            waiting:!data.isBlack,
                            started:true
                        })
                    }else{
                        this.setState({
                            isBlack:!data.isBlack,
                            started:true,
                            waiting:data.isBlack// black first, !data.isBlack is self color, so data.isBlack is true mean waiting is true
                        })
                    }
                    //may call initialize first but will set started to true
                    this.toast('Match Started!')
                })
            }
            socket.on('quitRoom',()=>{
                this.toast('Your opponent quited, you win! 不戰而屈人之兵，善之善者也！')
                this.setState({
                    userJoined:false,
                    moveNumber:0,
                    started:false,
                    opponentName:''
                })
                setTimeout(()=>{
                    this.initialize()
                },1000)
            })
            socket.on('rematch',()=>{
                this.toast('Rematch is requested!')
                this.setState({started:false})
                this.initialize()
            })
            if(this.state.roomno===null)// if first time joining the room
                socket.emit('joinRoom',this.props.roomno)

            window.addEventListener('beforeunload', (event) => {
                socket.emit('quitRoom',this.state.roomno)
                return undefined
            });

        }else
            socket.disconnect()

        this.initialize()
    }

    componentDidUpdate() {
        if(this.state.connected && !isMobile){
            setTimeout(()=>{
                this.scrollToBottom();
            },300)//ref wont initialized without timeout (#BUG) (set mount true in componentdidmount also wont work, maybe due to webpack hot update bug)
        }
    }

    componentWillUnmount(){window.removeEventListener('beforeunload', this.onUnmount, false);}

    canvasOnclick=(e)=>{
        if(!this.state.waiting){
            const x=Math.floor(e.nativeEvent.offsetX / cellWidth)
            const y=Math.floor(e.nativeEvent.offsetY / cellWidth)
            this.judger(x,y,null)
        }else
            this.toast(this.state.winner!==null?'Match Ended! Press Rematch to start a new one! ':'Please Wait Your Opponent!')
    }

    initialize=()=>{
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0,0,this.canvas.width,this.canvas.height)
        ctx.strokeStyle='black'
        ctx.beginPath();
        const row=[]
        for(let i=0;i<=this.state.boardSize;i++){
            const col=[]
            for(let j=0;j<=this.state.boardSize;j++){
                ctx.moveTo(cellWidth/2 + i * cellWidth, cellWidth/2);
                ctx.lineTo(cellWidth/2 + i * cellWidth, cellWidth * this.state.boardSize + cellWidth/2);
                ctx.stroke();
                ctx.moveTo(cellWidth/2, cellWidth/2 + i * cellWidth);
                ctx.lineTo(cellWidth * this.state.boardSize + cellWidth/2, cellWidth/2 + i * cellWidth);
                ctx.stroke();
                col.push(null);
            }
            row.push(col);//initialize null 2D [15][15] Array as the board
        }
        ctx.closePath();
        this.setState({
            board:row,
            winner:null,
            latestMove:'',
            moveNumber:0
        })
    }
      
    judger=(x,y,opponentColor)=>{
        let board=this.state.board
        const isBlack=opponentColor===null?this.state.isBlack:opponentColor
        const moveNumber=this.state.moveNumber
        if(board[y][x]===null){// if the position is empty then place the piece
            this.setState({latestMove:((isBlack?'B ':'W ')+y+', '+x)})
            if(this.state.connected && opponentColor===null)//if drawing own move then emit to opponent
                socket.emit("move", {x:x,y:y,isBlack:isBlack,roomno:this.state.roomno});
            //draw piece
            const ctx = this.canvas.getContext('2d');
            ctx.beginPath()
            ctx.fillStyle = isBlack?"black":"white";//piece color
            ctx.arc(Math.floor(x) * cellWidth+cellWidth/2,//x coord
            Math.floor(y) * cellWidth+cellWidth/2,//y coord
            cellWidth/2,//radius
            0,2*Math.PI)
            ctx.fill();
            ctx.closePath()
            board[y][x]=isBlack // rmb coordinate are reversed compared with the pixel position
            this.setState({
                board:board,
                moveNumber:moveNumber+1
            })
            if(!this.state.connected)
                this.setState({isBlack:!this.state.isBlack})

            if(opponentColor===null&&this.state.connected)
                this.setState({waiting:true})

            if(this.gameOver(x,y,isBlack)){//if game over
                const winner=opponentColor===null?this.state.isBlack:opponentColor
                const winnerText=winner?'Black':'White'
                this.toast(' GG '+winnerText+' Win!')
                this.setState({winner:winnerText,waiting:true})
            }else if(moveNumber+1===(this.state.boardSize+1)*(this.state.boardSize+1)){
                this.toast('Draw!')
            }
        }
    }

    gameOver=(x,y,isBlack)=>{
        const startingIndexVerticle=(y-4)>=0?(y-4):0
        for(let i=startingIndexVerticle;i<=y;i++){
            let counter=0
            for(let j=0;j<5;j++){
                if(i+j>this.state.boardSize)// can optimise
                    break
                if(this.state.board[i+j][x]===isBlack)
                    counter++
                else
                    break;
            }
            //console.warn('counterV: '+counter)
            if(counter===5)
                return true;
        }
        //check Horizontal
        const startingIndexHorizontal=(x-4)>=0?(x-4):0
        for(let i=startingIndexHorizontal;i<=x;i++){
            let counter=0
            for(let j=0;j<5;j++){
                if(i+j>this.state.boardSize)
                    break
                if(this.state.board[y][i+j]===isBlack)
                    counter++
                else
                    break;
            }
            if(counter===5)
                return true;
        }
        //Check \ and /
        for(let i=-4;i<=0;i++){
            let counterSlash=0
            let counterBackSlash=0
            for(let j=0;j<5;j++){
                if(y+i+j>this.state.boardSize||y+i+j<0||x+i+j>this.state.boardSize||x+i+j<0)
                    continue
                if(this.state.board[y+i+j][x+i+j]===isBlack)
                    counterSlash++
                else
                    break
            }
            for(let j=0;j<5;j++){
                if(y-i-j>this.state.boardSize||y-i-j<0||x+i+j>this.state.boardSize||x+i+j<0)
                    continue
                if(this.state.board[y-i-j][x+i+j]===isBlack)
                    counterBackSlash++
                else
                    break
            }
            if(counterSlash===5||counterBackSlash===5)
                return true;
        }
    }

    setBoardSize=(size)=>{
        this.setState({boardSize:size},()=>{this.initialize()})
        if(!this.state.connected)
            this.setState({isBlack:true})
    }

    setColor=(isBlack)=>{
        console.log('id: '+socket.id)
        socket.emit('setPlayingColor',{roomno:this.state.roomno,isBlack:isBlack,size:this.state.boardSize,id:socket.id})
    }

    sendMessage=(e)=>{
        e.preventDefault()
        socket.emit('roomChat',{
            roomno:this.state.roomno,
            message:this.state.message
        })
        let messageArray=this.state.messageArray
        messageArray.push({
            message:this.state.message,
            isOpponent:false
        })
        this.setState({
            message:'',
            messageArray:messageArray
        })
    }

    scrollToBottom=()=>{
        this.messagesEnd.current.scrollIntoView();
    }

    rematch=()=>{
        if(this.state.connected)
            socket.emit('rematch',this.state.roomno)
        else{
            this.initialize()
            this.setState({waiting:false})
        }
    }

    toast=(message)=>{
        this.setState({snackbarMessage:message},()=>{
            setTimeout(()=>{
                this.setState({snackbarMessage:null})
            },2900)
        })
    }

    render(){
        const messageForm=[
            <form onSubmit={this.sendMessage} className='messageForm'>
                <input className="chatInput"
                  value={this.state.message}
                  required={true}
                  onChange={(e)=>{this.setState({message:e.target.value})}}
                  type="text"
                  placeholder="Say something to your opponent!" 
                  autoFocus/>
                <input type='submit' style={{visibility:'hidden'}}/>
            </form>]
        return (
          <div className="mainWrapper">
              <div style={{width:cellWidth*(this.state.boardSize+1),alignSelf:'middle'}}>
                    <div className="label">
                        {this.state.connected?
                            <div className='labelBold'>
                                {this.state.username+' VS '+this.state.opponentName}
                                {this.state.winner==null?null:('| Winner: '+this.state.winner)}
                            </div>:null}  
                        {(this.state.winner!==null && this.state.started)||!this.state.connected?<div onClick={this.rematch} className="labelBold" style={{cursor:'pointer',display:'inline-block'}}>Rematch!</div>:null}
                        <div>
                            {'Playing: '}
                            {<span className="dot" style={this.state.isBlack?{backgroundColor:'black',height:13,width:13}:{backgroundColor:'white',border:'rgba(0, 0, 0, 0.4) 1px solid'}}/>}
                            {' | Status: '+(this.state.waiting?'Waiting... ':'Your Move! ')+'| Latest Move: '+this.state.latestMove}
                        </div>
                    </div>
                    <canvas className="gameboard"
                        ref={(ref)=>(this.canvas=ref)}
                        width={cellWidth*(this.state.boardSize+1)}
                        height={cellWidth*(this.state.boardSize+1)}
                        onClick={this.canvasOnclick}
                    />
                    <Dialog open={this.state.userJoined&&!this.state.started}>
                        <DialogTitle>{this.state.opponentName+" is Challenging You!!!!"}</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                {'Please Choose Black or White stone to start (Black first), first come first served >.<'}
                            </DialogContentText>
                            </DialogContent>
                        <DialogActions>
                            <Button onClick={()=>this.setColor(false)}  color="primary">White</Button>
                            <Button onClick={()=>this.setColor(true)} color="primary" autoFocus>Black</Button>
                        </DialogActions>
                    </Dialog>
              </div>
              {isMobile||!this.state.connected?null:
              <div className="chatboxWrapper">
                  <div className="chatboxLabel">
                      <span className='dot' style={this.state.userJoined?{backgroundColor:'green'}:null}/>
                      {'Room: '+this.state.roomno}
                  </div>
                  <div className="messageContainer" style={{height:cellWidth*(this.state.boardSize+1)-58}}>
                        {this.state.messageArray.map((message)=>(
                            <div className={message.isOpponent?'box s2':'box s1'} 
                                style={message.isOpponent?{background:'rgb(248, 161, 176)',alignSelf:'flex-start',marginLeft:8}:null}>
                                {message.message}
                            </div>
                        ))}
                        <div style={{ float:"left", clear: "both" }}//psedoelement for scrolling to bottom
                            ref={this.messagesEnd}>
                        </div>
                  </div>
                  {messageForm}
              </div>}
              {isMobile&&this.state.connected?
              <div style={{width:'100vw',position:'fixed',bottom:20}}>
                  {messageForm}
              </div>
              :null}
              <div className={this.state.snackbarMessage===null?'snackbar':'snackbar show'}>{this.state.snackbarMessage}</div>
          </div>
        );
      }
}
