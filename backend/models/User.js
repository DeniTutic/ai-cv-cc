const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    auth0Id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String },
    picture: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
