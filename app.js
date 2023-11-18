const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('express-flash');
const session = require('express-session');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const path = require('path'); // Import the path module
const multer = require('multer');
const memoryStorage = multer.memoryStorage();
const ProfilePicture = require('./models/ProfilePIcture'); // Assuming you have a model for profile pictures
const axios = require('axios'); // You can use Axios for making API requests
const fs = require('fs');  // Add this line to import the fs module

require('dotenv').config();


const app = express();
const router = express.Router();




app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: true, saveUninitialized: true }));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs'); // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Specify the views directory (replace 'views' with the actual path)


const storage = multer.memoryStorage(); // Use memory storage to store files in memory instead of saving them to disk
const upload = multer({ storage: memoryStorage });


// Connect to your MongoDB database using the environment variable
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Passport.js Configuration
passport.use(
  new LocalStrategy(async (username, password, done) => {
    const user = await User.findOne({ username });
    if (!user) {
      return done(null, false, { message: 'User not found' });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return done(null, false, { message: 'Incorrect password' });
    }
    return done(null, user);
  })
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  User.findById(id)
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, null);
    });
});


// Replace with your Deezer App ID and Secret Key
const APP_ID = 'YOUR_APP_ID';
const SECRET_KEY = 'YOUR_SECRET_KEY';

// Define the Deezer API endpoint for trending songs
const TRENDING_API_URL = 'https://api.deezer.com/playlist/3155776842';

// Make a GET request to the API with authentication
axios.get(TRENDING_API_URL, {
  params: {
    app_id: APP_ID,
    secret: SECRET_KEY,
  },
})
  .then(response => {
    const trendingSongs = response.data.tracks.data;
    // You can now display the trending songs on your homepage
  })
  .catch(error => {
    console.error('Error fetching trending songs:', error);
  });


app.post('/register', async (req, res) => {
  const { username, password, email, profilePictureURL } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = new User({
    username,
    email,
    password: hashedPassword,
    profilePictureURL, // Save the profile picture URL
  });

  try {
    await user.save();
    res.redirect('/login.html'); // Redirect to the login page
  } catch (error) {
    res.status(500).send('An error occurred during registration');
  }
});


app.post('/login', (req, res, next) => {
  console.log('Received a login request');
  passport.authenticate('local', {
    successRedirect: 'homepage',
    failureRedirect: '/login.html',
    failureFlash: true,
  })(req, res, next);
});

// In your Node.js code
app.get('/homepage', async (req, res) => {
  try {
      // Make a request to Deezer's API to get trending songs
      const response = await axios.get('https://api.deezer.com/chart/0/tracks'); // You may need to adjust the URL according to Deezer's API documentation

      // Extract the trending songs data from the response
      const trendingSongs = response.data.data;

      // Render your homepage template and pass the trendingSongs data
      res.render('homepage', { trendingSongs });
  } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while fetching trending songs.');
  }
});


app.get('/profile', (req, res) => {
  // Check if the user is authenticated
  if (req.isAuthenticated()) {
    // Pass the user object to the template
    res.render('profile', { user: req.user, userName: req.user.username });
  } else {
    // Redirect to the login page if not authenticated
    res.redirect('/login.html');
  }
});


// Render the search page
// Handle the search form submission
app.post('/search', async (req, res) => {
  try {
    const query = req.body.query;

    // Replace YOUR_APP_ID and YOUR_SECRET_KEY with your Deezer application ID and secret key
    const APP_ID = process.env.YOUR_APP_ID;
    const SECRET_KEY = process.env.YOUR_SECRET_KEY;
    const DEEZER_AUTH_ENDPOINT = 'https://connect.deezer.com/oauth/access_token.php';

    // Make a POST request to obtain an access token
    const response = await axios.post(DEEZER_AUTH_ENDPOINT, null, {
      params: {
        app_id: APP_ID,
        secret: SECRET_KEY,
        output: 'json',
      },
    });

    const accessToken = response.data.access_token;

    // Now, you can use the obtained access token to make authenticated requests to the Deezer API.
    // Make your API request using the access token and handle the response.

    // Example API request:
    const DEEZER_API_ENDPOINT = 'https://api.deezer.com/search';
    const apiResponse = await axios.get(`${DEEZER_API_ENDPOINT}?q=${query}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Extract search results from the API response
    const searchResults = apiResponse.data.data.map(result => {
      return {
        audioUrl: result.preview, // Get the audio URL from the API response
        artist: { name: result.artist.name }, // Get the artist name
        title: result.title, // Get the title
        album: { cover_medium: result.album.cover_medium }, // Get the album cover
      };
    });

    // Render the search results template and pass the searchResults data
    res.render('search-results', { searchResults });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while searching for music.');
  }
});

app.post('/upload', upload.single('profilePicture'), async (req, res, next) => {
  if (req.file) {
    const userId = req.user._id;

    try {
      // Delete the existing profile picture data for the user
      await ProfilePicture.deleteMany({ user: userId });

      // Save the new profile picture document
      const profilePicture = new ProfilePicture({
        filename: req.file.originalname,
        user: userId,
        contentType: req.file.mimetype,
        data: req.file.buffer,
      });

      await profilePicture.save();

      // Redirect to the profile page with a success message
      res.redirect('/profile?success=Profile%20picture%20uploaded%20successfully');
    } catch (error) {
      console.error('Error saving profile picture:', error);
      res.status(500).send('Error saving profile picture to the database');
    }
  } else {
    // Pass the control to the next middleware or route handler
    next();
  }
});

// Add a new middleware or route handler to handle the case when no file is uploaded
app.use('/upload', (req, res) => {
  // Render a simple error message
  res.status(400).send('No file uploaded');
});




// Update the route to handle profile picture retrieval
app.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const profilePicture = await ProfilePicture.findOne({ user: userId });

    if (profilePicture) {
      // Set the content type based on the profile picture's content type
      const contentType = profilePicture.contentType || 'image/png';
      res.setHeader('Content-Type', contentType);

      // Send the profile picture directly from the database
      if (profilePicture.data instanceof Buffer) {
        res.send(profilePicture.data);
      } else {
        res.status(500).json({ error: 'Invalid profile picture data format' });
      }
    } else {
      // Provide a default profile picture or handle the case where no profile picture is found
      res.sendFile(path.join(__dirname, '/public/img/profile-user.png'));
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error retrieving profile picture' });
  }
});


// Define a route for logging out
app.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) {
      // Handle the error, if any.
      console.error(err);
    }
    res.redirect('/login.html'); // Redirect to the home page or any other page you prefer.
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});