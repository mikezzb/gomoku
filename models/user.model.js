const mongoose = require('mongoose');
let bcrypt = require('bcrypt');
const SALT_WORK_FACTOR = 10;

const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    iconURL: {
        type: String,
        required: false,
        unique: false,
        trim: false,
    },
    password:{
        type: String,
        required: true,
        unique: false,
        minlength: 6
    },
    username:{
        type: String,
        required: true,
        unique: true,
    }
}, {
    timestamps: true,
});

userSchema.pre('save', async function save(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
        this.password = await bcrypt.hash(this.password, salt);
        return next();
    } catch (err) {
        console.warn(next(err));
        return next(err);
    }
});

userSchema.methods.comparePassword = function(plaintext, callback) {
    return callback(null, bcrypt.compareSync(plaintext, this.password));
};

const User = mongoose.model('User', userSchema);

module.exports = User;
