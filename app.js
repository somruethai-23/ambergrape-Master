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
const bodyParser = require('body-parser');

// Model
const Product = require('./models/product');

//Routes 
const userRoutes = require('./routes/auth');

const mongoDB = process.env.MONGO_URL;

// connect to mongoDB for store all of data 
mongoose.connect(mongoDB)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Connection to MongoDB failed:', err);
    });

app.use(expressLayout);

app.use(express.static(__dirname + '/public'));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(flash());

app.use(session({
    secret: process.env.SEC_KEY, // Change this to a random secret key
    resave: false,
    saveUninitialized: false
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

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);
app.set('layout', 'layout/layout');

app.use('/user', userRoutes);


app.get('/', async(req, res) => {
    try{
        const products = await Product.find();
        res.render('index', {products: products, req:req });
    } catch (error) {
        console.log('การดึงข้อมูลผิดพลาด', error);
        res.status(500).send('Internal Server Error');
    }
});


app.listen(process.env.PORT, () => {
    console.log(`Server working at ${process.env.PORT}`);
});