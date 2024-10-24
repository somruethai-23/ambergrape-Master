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
const nodemailer = require("nodemailer");
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
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
  saveUninitialized: false,
  store: mongoStore,
  cookie: { secure: false }  // ควรเป็น true ถ้าใช้ HTTPS
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
  res.locals.user = req.user || null; // ส่งข้อมูล user ไปยังทุกๆ template
  next();
});

app.use((req, res, next) => {
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
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
        res.status(500).render('error', { message: 'เกิดข้อผิดพลาดในการค้นหา' });
      });
  } else {
    res.redirect('/');
  }
});

app.get('/products', async (req, res) => {
  try {
    const { searchTerm = '', categories = 'all', sortOption = '' } = req.query;

    // Build query object
    let query = {};
    if (searchTerm) {
      query.productName = new RegExp(searchTerm, 'i');
    }
    if (categories !== 'all') {
      // Split categories and ensure all selected categories are included
      query.category = { $in: categories.split(',') };
    }

    // Sorting
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

    // Find products
    const products = await Product.find(query).sort(sort).populate('category');
    res.json(products);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/aboutus', (req, res) => {
  res.render('aboutus');
});

app.get('/contactus', (req, res) => {
  res.render('contactus');
});

app.post('/send-email', (req, res) => {
  const { name, email, message } = req.body;

  const oauth2Client = new OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SEC,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN
  });

  async function sendEmail() {
    try {

      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: 'ambergrape2020@gmail.com',
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SEC,
          refreshToken: process.env.Google_RefToken,
          accessToken: process.env.Google_AccToken,
        },
      });

      let mailOptions = {
        from: email,
        to: 'ambergrape2020@gmail.com',
        subject: `จาก ${name}`,
        text: `ข้อความจาก ${name} กล่าวว่า: ${message}`,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          req.flash('error', 'ส่งข้อความไม่ผ่าน');
          console.log(err);
          res.redirect('/contactus');
        } else {
          req.flash('success', 'ได้รับอีเมลเรียบร้อยค่ะ');
          res.redirect('/contactus');
        }
      });
    } catch (error) {
      console.error('Error during sending email: ', error);
      req.flash('error', 'เกิดข้อผิดพลาดกับการส่งอีเมล');
      res.redirect('/contactus');
    }
  }

  sendEmail();
});

app.listen(process.env.PORT, '0.0.0.0',  () => {
    console.log(`Server working at ${process.env.PORT}`);
});

app.use((req, res, next) => {
  res.status(404).render('error'); 
});
