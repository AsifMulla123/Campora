if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const MongoStore = require('connect-mongo');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');


const userRoutes = require('./routes/users');
const campgroundRoutes = require('./routes/campgrounds');
const reviewRoutes = require('./routes/reviews');
const bookingRoutes = require('./routes/bookings');

// Use DB_URL from .env or fallback to localhost
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/campora';
mongoose.connect(dbUrl)
  .then(() => console.log("Database connected"))
  .catch(err => console.error("Mongo Connection Error:", err));


// const db = mongoose.connection;
// db.on("error", console.error.bind(console, "connection error:"));
// db.once("open", () => {
//     console.log("Database connected");
// });

const app = express();

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))

// session store using connect-mongo
const store = MongoStore.create({
  mongoUrl: dbUrl,
  touchAfter: 24 * 3600, // lazy update period (in seconds)
  crypto: {
    secret: process.env.SECRET || 'thisshouldbeabettersecret'
  }
});

const sessionConfig = {
  store,
  name: 'session',
  secret: process.env.SECRET || 'thisshouldbeabettersecret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    // secure: true, // enable in production (HTTPS)
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
};
app.use(session(sessionConfig));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware to load full user data including isAdmin
app.use(async (req, res, next) => {
    if (req.user) {
        try {
            req.user = await User.findById(req.user._id);
        } catch (err) {
            console.error('Error loading user:', err);
        }
    }
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})


app.use('/', userRoutes);
app.use('/bookings', bookingRoutes);
app.use('/campgrounds/:id/reviews', reviewRoutes);
app.use('/campgrounds', campgroundRoutes);


app.get('/', (req, res) => {
    res.render('home')
});


app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err })
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
console.log(`Serving on port ${port}`)
})


