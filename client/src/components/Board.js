import React, { Component } from 'react';
import {isMobile} from "react-device-detect";
import io from 'socket.io-client';

let cellWidth=isMobile?28:40
const socket = io();//socket io is listening on 8000 port, care this may cause heroku bug
//var socket = io();
//const socket = io('localhost:5000');


export default class Board extends Component{
    constructor(props){
        super(props)
        this.state={
            roomPlayerNumber:0,
            username:'',
            opponentName:'',
            isBlack:true,
            board:[],//null:empty, true: black, false:white
            winner:null,
            boardSize:isMobile?11:15,
            moveNumber:0,
            waiting:false,
            roomno:null,//connected room number
            fixedColor:false,
            userJoined:false,
            connected:false //connected if online pvp, else play with computer or local pvp
        }
        this.sendSocketIO = this.sendSocketIO.bind(this);
    }

    componentDidMount(){
        if(this.props.onlineMode){
            this.setState({username:this.props.username})
            socket.on("move",(move)=>{
                console.log('Received Opponent Move: x:'+move.x+' y:'+move.y+' isBlack: '+move.isBlack);
                this.setState({waiting:false})
                this.judger(move.x,move.y,move.isBlack)
            })
            socket.on("emitUsername",(username)=>{
                this.setState({opponentName:username})
            })
            socket.on('connectToRoom',(data)=>{
                console.warn('connected to room no. '+data.roomno+'number of clients '+data.clientCount)
                if(data.clientCount===1){
                    console.log('Emitting username out!!!')
                    socket.emit('emitUsername',{
                        roomno:data.roomno,
                        username:this.state.username
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
                }
            });
            socket.on('setPlayingColor',(data)=>{//received opponent color setting
                this.setState({
                    isBlack:!data.isBlack,
                    waiting:data.isBlack// black first, !data.isBlack is self color, so data.isBlack is true mean waiting is true
                })
            })
            if(this.state.roomno===null)
                socket.emit('joinRoom',null)
        }else{
            socket.disconnect()
        }
        this.initialise()
    }

    canvasOnclick=(e)=>{
        if(!this.state.waiting){
            const x=Math.floor(e.nativeEvent.offsetX / cellWidth)
            const y=Math.floor(e.nativeEvent.offsetY / cellWidth)
            this.judger(x,y,null)
        }else{
            alert('Please Wait Your Opponent! Or please choose a color to start')
        }
    }
    
    sendSocketIO(x,y,isBlack) {
        console.log('Emitting a move')
        socket.emit("move", {x:x,y:y,isBlack:isBlack,roomno:this.state.roomno});
    }

    initialise=()=>{
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
            row.push(col);//initialise null 2D [15][15] Array as the board
        }
        ctx.closePath();
        this.setState({board:row})
    }
      
    judger=(x,y,opponentColor)=>{
        let board=this.state.board
        const isBlack=opponentColor===null?this.state.isBlack:opponentColor
        const moveNumber=this.state.moveNumber
        if(board[y][x]===null){// if the position is empty then place the piece
            //draw piece
            if(this.state.connected && opponentColor===null){
                this.sendSocketIO(x,y,this.state.isBlack)//sent the move to socketio
            }
            const ctx = this.canvas.getContext('2d');
            ctx.beginPath()
            ctx.fillStyle = isBlack?"black":"white";//piece color
            ctx.arc(Math.floor(x) * cellWidth+cellWidth/2,//x coord
            Math.floor(y) * cellWidth+cellWidth/2,//y coord
            cellWidth/2,//radius
            0,2*Math.PI)
            ctx.fill();
            ctx.closePath()
            //change board state
            board[y][x]=isBlack // rmb coordinate are reversed compared with the pixel position
            this.setState({
                board:board,
                moveNumber:moveNumber+1
            })
            if(!this.state.connected){
                this.setState({isBlack:!this.state.isBlack})
            }

            if(opponentColor===null&&this.state.connected){
                this.setState({waiting:true})
            }

            if(this.gameOver(x,y,isBlack)){//if game over
                const winner=opponentColor===null?this.state.isBlack:opponentColor
                const winnerText=winner?'Black':'White'
                alert(' GG '+winnerText+' Win!')
                this.setState({winner:this.state.isBlack})
            }else if(moveNumber+1===(this.state.boardSize+1)*(this.state.boardSize+1)){
                alert('Draw!')
            }
        }
    }

    gameOver=(x,y,isBlack)=>{// only need to check surrounding pieces of the latest move
        //console.table(this.state.board)
        //check Verticle
        const startingIndexVerticle=(y-4)>=0?(y-4):0
        //const endingIndexVerticle=(y+4)<=15?(y+4):15 // if endingIndex>15, then j cant be larger than 15
        //console.log('y x: '+y+' '+x)
        //console.log('Verticle Index: '+startingIndexVerticle)
        for(let i=startingIndexVerticle;i<=y;i++){
            let counter=0
            for(let j=0;j<5;j++){
                if(i+j>this.state.boardSize)// can optimise
                    break//or maybe continue
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
        //console.log('Horizontal Index: '+startingIndexHorizontal)
        for(let i=startingIndexHorizontal;i<=x;i++){
            let counter=0
            for(let j=0;j<5;j++){
                if(i+j>this.state.boardSize)
                    break//or maybe continue
                if(this.state.board[y][i+j]===isBlack)
                    counter++
                else
                    break;
            }
            //console.warn('counterH: '+counter)
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
                //console.log('Backslash coordinate: '+(y-i-j)+' '+(x+i+j))
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
        this.setState({
            boardSize:size,
            isBlack:true,
            moveNumber:0
        },()=>{
            this.initialise()
        })
    }

    setColor=(isBlack)=>{
        if(this.state.userJoined&&this.state.connected)
            socket.emit('setPlayingColor',{roomno:this.state.roomno,isBlack:isBlack})
        this.setState({
            isBlack:isBlack,
            waiting:!isBlack
        })
    }

    render(){
        const player=this.state.isBlack?'Black':'White'
        const status=this.state.waiting?'Waiting...':'Your Move!'
        return (
          <div className="boardWrapper">
                <div className="label">
                    {this.state.connected?
                        <div>
                            <div>{this.state.username+' VS '+this.state.opponentName}</div>
                            <div>{'You have joined in Room: '+this.state.roomno}</div>
                        </div>
                        :null
                    }
                    <div>{'Playing: '+player+' | Status: '+status}</div>
                    <div onClick={this.initialise} style={{cursor:'pointer',display:'inline'}}>(Reset) </div>
                    <div style={{display:'inline'}}>Choose Color: </div>
                    <div onClick={()=>this.setColor(true)} style={{cursor:'pointer',display:'inline'}}> BLACK |</div>
                    <div onClick={()=>this.setColor(false)} style={{cursor:'pointer',display:'inline'}}> WHITE </div>
                </div>

                <canvas className="gameboard"
                    ref={(ref)=>(this.canvas=ref)}
                    width={cellWidth*(this.state.boardSize+1)}
                    height={cellWidth*(this.state.boardSize+1)}
                    onClick={this.canvasOnclick}
                />
          </div>
        );
      }
}
