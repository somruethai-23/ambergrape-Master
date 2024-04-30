const express = require('express');
const app = express();
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');
const ejs = require('ejs');
const expressLayout = require('express-ejs-layouts');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const MongoStore = require('connect-mongo');

// Model
const Product = require('./models/Product');
const User = require('./models/User');

//Routes 
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/Admin');
const productRoutes = require('./routes/Product');



const mongoDB = process.env.MONGO_URL;

// connect to mongoDB for store all of data 
mongoose.connect(mongoDB)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Connection to MongoDB failed:', err);
    });

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(expressLayout);
app.use(flash());

const mongoStore = MongoStore.create({
    mongoUrl: process.env.MONGO_URL,
    ttl: 14 * 24 * 60 * 60, 
});  


// ตั้งค่า passport-local strategy
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
          const user = await User.findOne({ username: username });
          if (!user) {
            return done(null, false, { message: 'Incorrect username.' });
          }
          if (!user.validPassword(password)) {
            return done(null, false, { message: 'Incorrect password.' });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});
  
passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  });

// session login logout
app.use(session({
    secret: process.env.SEC_KEY,
    resave: false,
    saveUninitialized: true,
    store: mongoStore,
}));

app.use(passport.initialize());
app.use(passport.session());


// can access in any template
app.use((req,res,next)=>{
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.use((req, res, next) => {
    res.locals.layout = false;
    next();
});

app.set('app', path.join(__dirname, 'app'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);
app.set('layout', 'layout/layout');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/product', productRoutes);

app.get('/', async(req, res) => {
    try {
      const products = await Product.find().populate('category');

        res.render('index', { products: products, req: req });
    } catch (error) {
        console.log('การดึงข้อมูลผิดพลาด', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/test', (req,res) => {
  res.render('test', { req:req});
})


app.listen(process.env.PORT, () => {
    console.log(`Server working at ${process.env.PORT}`);
});