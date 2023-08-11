const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer=require("multer");
const path=require("path");
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const fs = require('fs');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');


app.use(express.static('public'));

const User = require('./models/user');
const Blog = require('./models/blogs'); // Update the path to the user model file

app.use(
  session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

mongoose.connect('mongodb://127.0.0.1:27017/blogData')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

app.get('/', async (req, res) => {
    try {
      const blogs = await Blog.find();  
      res.render('home', { blogs });
    } catch (err) {
      console.error('Error fetching blogs:', err);
      res.status(500).send('Internal Server Error');
    }
});

app.get('/signup', (req, res) => {
    res.render('signup');
  });
  
  app.get('/login', (req, res) => {
    res.render('login');
  });
  
  app.post('/signup', (req, res) => {
    const { name, username, password } = req.body;
  
    User.register(new User({ name, username }), password, (err, user) => {
      if (err) {
        console.error('Error creating user:', err);
        res.status(500).send('Internal server error');
      } else {
        passport.authenticate('local')(req, res, () => {
          res.redirect('/');
        });
      }
    });
  });
  
  
  app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
  }));
  
  app.get('/logout', (req, res) => {
    req.logout(function (err) {
      if (err) {
        console.error('Error logging out:', err);
        return res.status(500).json({ error: 'Internal server error' });

      }
      res.redirect('/');
    });
  });

app.get('/publish', (req, res) => {
    if (req.isAuthenticated()) {
      res.render('publish');
    } else {
      res.redirect('/login');
    }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

app.post('/publish', upload.array('blogImages', 5), async (req, res) => {
  const { title, subTitle, category, content} = req.body;
  const blogImages = req.files.map(file => '/uploads/' + file.filename);

  try {
    const blog = new Blog({
      title,
      subTitle, 
      category, 
      content,
      blogImages
    });
    await blog.save();
    
    req.user.blogPosts.push(blog._id);
    await req.user.save();
    res.redirect("/")
  } catch (err) {
    console.error('Error saving blog data:', err);
    res.status(500).send('Internal server error');
  }
});

app.get('/myPosts',async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const userWithBlogs = await User.findById(req.user._id).populate('blogPosts');
  
      const blogs = userWithBlogs.blogPosts;
  
      res.render('myPosts', { blogs });
    } catch (err) {
      console.error('Error fetching blogs:', err);
      res.status(500).send('Internal server error');
    }
  } else {
    res.redirect('/login');
  }
  
});

app.get('/viewBlog/:id', async (req, res) => {
  try {
    const blogId = req.params.id;

    const blog = await Blog.findById(blogId);

    res.render('blog', { blog });
  } catch (err) {
    console.error('Error fetching blog:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/editBlog/:id', async (req, res) => {
  try {
    const bookId = req.params.id;
    const blog = await Blog.findById(bookId);
    if (!blog) {
      return res.status(404).send('Blog not found');
    }
    res.render('editBlog', { blog });
  } catch (err) {
    console.error('Error fetching blog for editing:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/editBlog/:id', upload.array('blogImages', 5), async (req, res) => {
  const { title, subTitle, category, content} = req.body;
  const blogId = req.params.id;
  const blogImages = req.files.map(file => '/uploads/' + file.filename);

  try {
    let blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).send('Blog not found');
    }

      blog.title=title;
      blog.subTitle = subTitle;
      blog.category = category;
      blog.content = content;
      blog.blogImages = blogImages; 

    await blog.save();

    res.redirect('/myPosts');
  } catch (err) {
    console.error('Error updating blog data:', err);
    res.status(500).send('Internal server error');
  }
});


app.get('/removeBlog/:id', async (req, res) => {
  try {
    const blogId = req.params.id;

    const blog = await Blog.findById(blogId);

    blog.blogImages.forEach(img => { 
      const imagePath = path.join(__dirname, 'public', img);
      fs.unlinkSync(imagePath);
    })

    await Blog.findByIdAndRemove(blogId);

    const user = req.user;
    user.blogPosts = user.blogPosts.filter((id)=>id.toString() !== blogId);
    await user.save();

    res.redirect('/myPosts');
  } catch (err) {
    console.error('Error removing blog:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/like/:id', async (req, res) => {
  const blogId = req.params.id;
  if(req.isAuthenticated()){
    try {
      const userId = req.user._id;
      const blog=await Blog.findById(blogId);
  
      const alreadyLiked = blog.likes.some((like) => like.equals(userId));

      if (!alreadyLiked) {
        const userId = req.user._id;
        blog.likes.push(userId);
        await blog.save();
        res.redirect('/viewBlog/'+blogId) 
      } else {
        const userId = req.user._id;
        blog.likes.pull(userId);
        await blog.save();

        res.redirect('/viewBlog/'+blogId)
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal Server Error:');
    }
  }
  else res.redirect('/login');
  
});

app.post('/comment/:id', async (req, res) => {
  const blogId = req.params.id;
  if(req.isAuthenticated()){
    try {
      const userId = req.user._id;
      const comment={
        text:req.body.comment,
        postedBy:req.user.name
      };
      const blog=await Blog.findById(blogId); 
      blog.comments.push(comment);
      await blog.save();
      res.redirect('/viewBlog/'+blogId) 
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal Server Error:');
    }
  }
  else res.redirect('/login');
  
});


























app.listen(3000, () => {
    console.log('Server is listening on port 3000');
});

