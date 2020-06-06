const bcrypt = require('bcrypt');
const router = require('express').Router();
const jwt = require('jsonwebtoken');
let User = require('../models/user.model');

router.route('/add').post((req, res) => {
    const newUser = new User(req.body);
    newUser.save()
        .then(() => res.json('Sign Up Successfully!'))
        .catch(err => res.status(400).json("Error"+err));
});

router.route('/login').post((req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    User.findOne({
        //search is the email exist in database,
        //if wanna use username login, just use username:req.body.username to search
        email:email
    }).then(user => {
            if(user){//i.e. if the email exist
                user.comparePassword(password,(error,isMatch)=>{
                    if(isMatch){
                        user.password=undefined; //can use delete user.password but not working
                        res.json(JSON.stringify(user));
                    }
                    else
                        res.json(0)
                });
            }else{
                res.json(1)
            }
        })
        .catch(err=>{
                res.send('error: '+err)
            })
});

module.exports = router;
