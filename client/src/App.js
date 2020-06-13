import React, { Component } from 'react';
import Cookies from 'js-cookie'
import './App.css';
import Board from './components/Board'

class App extends Component {
  constructor(props){
    super(props)
    this.state={
      gotCookie:false,
      showDialog:true,
      username:'',
      roomno:null,
      onlineMode:false
    }
  }

  setMode=(e,isOnline)=>{
    if(isOnline)
      e.preventDefault()
    this.setState({
      showDialog:false,
      onlineMode:isOnline
    })
    Cookies.set('username',this.state.username, { expires: 1 })
  }

  componentDidMount(){
    const username=Cookies.get('username')
    if(username!==undefined){
      console.warn('got cookie '+username)
      this.setState({username:username,gotCookie:true})
    }
  }

  render(){
    return (
      <div className="App">
        {this.state.showDialog?
        <div className="homeScreen">
          <div className="content">
            <div className="container">
              <div className="left">
                <div className="headerText">Gomoku.io</div>
                <div className="detailText">Please Choose the mode that you want to play</div>
              </div>
              <div className="right">
                <form className="mainForm" onSubmit={(e)=>this.setMode(e,true)}>
                  <label className="mainLabel">Username</label>
                  <input className="mainInput" value={this.state.username} type="text" onChange={(e)=>{this.setState({username:e.target.value})}} autoFocus/>
                  <label className="mainLabel">Room Number (optional)</label>
                  <input className="mainInput" type="number" onChange={(e)=>{this.setState({roomno:e.target.value})}}/>
                  <div className="ButtonWrapper">
                    <div className="submitButton" onClick={()=>this.setMode(null,false)} style={{display:'inline-block',marginLeft:0}}>Play Local</div>
                    <input className="submitButton" type="submit" value="Find a Match!"/>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        :<Board onlineMode={this.state.onlineMode} username={this.state.username} roomno={this.state.roomno}/>
        }
      </div>
    );
  }
}

export default App;
