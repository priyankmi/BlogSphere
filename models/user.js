const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  name:{
    type:String,
    required:true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  blogs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Blog' }]

});

userSchema.plugin(passportLocalMongoose);


module.exports = mongoose.model("User", userSchema);

