import React, { Component } from 'react';
import './App.scss';
import Board from './components/Board'
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import TextField from '@material-ui/core/TextField';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

class App extends Component {
  constructor(props){
    super(props)
    this.state={
      showDialog:true,
      username:'',
      onlineMode:false
    }
  }

  setMode=(isOnline)=>{
    this.setState({
      showDialog:false,
      onlineMode:isOnline
    })
  }

  render(){
    return (
      <div className="App">
        {this.state.showDialog?null:
        <Board onlineMode={this.state.onlineMode} username={this.state.username}/>
        }
        <Dialog open={this.state.showDialog} aria-labelledby="form-dialog-title">
          <DialogTitle id="form-dialog-title">Welcome to Gomoku.IO !</DialogTitle>
          <DialogContent>
              <DialogContentText>
                  {'Enter a username to find a match online. Or if you want to play locally, please hit play local'}
              </DialogContentText>
              <TextField
                  autoFocus
                  onChange={(e)=>{this.setState({username:e.target.value})}}
                  margin="dense"
                  id="name"
                  label="Username"
                  type="username"
                  fullWidth
              />
          </DialogContent>
          <DialogActions>
              <Button onClick={()=>this.setMode(false)} color="primary">
                  Play Local
              </Button>
              <Button onClick={()=>this.setMode(true)}  color="primary">
                  Find a match!
              </Button>
          </DialogActions>
          </Dialog>
      </div>
    );
  }
}

export default App;
