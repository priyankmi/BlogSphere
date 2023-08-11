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
  category: {
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
  },
  likes:[{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    text:String,
    postedBy:String
  }]
});

module.exports = mongoose.model("Blog", blogSchema);

