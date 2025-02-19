const express = require('express');
const app = express();
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');
const ejs = require('ejs');
const expressLayout = require('express-ejs-layouts');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { decodeToken } = require('./function/tokenGenerate');


// Model
const Product = require('./models/Product');
const User = require('./models/User');
const Order = require('./models/Order');
const Category = require('./models/Category');

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
app.use(cookieParser());

const mongoStore = MongoStore.create({
    mongoUrl: process.env.MONGO_URL,
    ttl: 14 * 24 * 60 * 60, 
});  

app.use(session({
  secret: process.env.SEC_KEY,
  resave: false,
  saveUninitialized: true,
  store: mongoStore,
  cookie: { secure: true } 
}));


app.set('app', path.join(__dirname, 'app'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);
app.set('layout', 'layout/layout');
app.use('/tinymce', express.static(path.join(__dirname, 'node_modules', 'tinymce')));

const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
      try {
          const decoded = jwt.verify(token, process.env.JWT_SEC);
          req.user = await User.findById(decoded.id).select('-password');
      } catch (err) {
          console.error('Token verification failed:', err);
          req.user = null;
      }
  } else {
      req.user = null;
  }
  next();
};

app.use(authenticateToken);

app.use((req, res, next) => {
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

app.locals.getOrderProgress = function(orderStatus) {
  const statuses = ['ยังไม่ได้ชำระ', 'ชำระแล้ว', 'กำลังดำเนินการ', 'จัดส่งแล้ว', 'สำเร็จ'];
  const index = statuses.indexOf(orderStatus);
  return (index + 1) / statuses.length * 100;
};

//Routes 
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/Admin');
const productRoutes = require('./routes/Product');
const userRoutes = require('./routes/user');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/order');
const categoriesRoutes = require('./routes/categories');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/product', productRoutes);
app.use('/user', userRoutes);
app.use('/cart', cartRoutes);
app.use('/order', orderRoutes);
app.use('/categories', categoriesRoutes);

app.get('/', async (req, res) => {
  const products = await Product.find().populate('category');
  const categories = await Category.find();
  res.render('index', {categories, products, layout: false})
});

app.get('/search', (req, res) => {
  const searchTerm = req.query.q;

  if (searchTerm) {
    Product.find({ productName: { $regex: searchTerm, $options: 'i' } })
      .then(products => {
        res.render('searchResults', { products, searchTerm });
      })
      .catch(err => {
        console.error(err);
        req.flash('error', 'เกิดข้อผิดพลาด หาสินค้าไม่พบ');
        return res.redirect('/');
      });
  } else {
    return res.redirect('/');
  }
});

app.get('/products', async (req, res) => {
  try {
    const { searchTerm = '', categories = 'all', sortOption = '' } = req.query;

    let query = {};
    if (searchTerm) {
      query.productName = new RegExp(searchTerm, 'i');
    }
    if (categories !== 'all') {
      query.category = { $in: categories.split(',') };
    }

    let sort = {};
    switch (sortOption) {
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'oldest':
        sort.createdAt = 1;
        break;
      case 'priceLowToHigh':
        sort['sizes.price'] = 1;
        break;
      case 'priceHighToLow':
        sort['sizes.price'] = -1;
        break;
      case 'alphabetical':
        sort.productName = 1;
        break;
      default:
        break;
    }

    const products = await Product.find(query).sort(sort).populate('category');
    res.json(products);
  } catch (err) {
    req.flash('error', 'เกิดข้อผิดพลาด');
    return res.redirect('/')
  }
});

app.get('/aboutus', (req, res) => {
  res.render('aboutus');
});

app.get('/contactus', (req, res) => {
  res.render('contactus');
});

app.listen(process.env.PORT || 10000 ,  () => {
    console.log(`Server working at ${process.env.PORT}`);
});

app.use((req, res, next) => {
  res.status(404).render('error'); 
});
