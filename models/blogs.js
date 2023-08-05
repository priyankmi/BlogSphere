const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title:{
    type:String,
    required:true
  },
  subTitle: {
    type: String,
    required: true,
  },
  place: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  blogImages: {
    type: Array,
    required: true
  }
});

module.exports = mongoose.model("Blog", userSchema);

