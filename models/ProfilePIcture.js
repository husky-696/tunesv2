const mongoose = require('mongoose');

const profilePictureSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  data: Buffer,  // Make sure this field is present to store binary data
  contentType: String,
});

const ProfilePicture = mongoose.model('ProfilePicture', profilePictureSchema, 'user_pfps');

module.exports = ProfilePicture;

