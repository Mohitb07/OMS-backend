const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function getRandomAvatar() {
  try {
    const result = await cloudinary.search.expression(`folder:Avatars`).execute();

    const avatars = result.resources;
    if (!avatars || avatars.length === 0) {
      throw new Error("No avatars found in the folder.");
    }

    const randomIndex = Math.floor(Math.random() * avatars.length);
    return avatars[randomIndex].secure_url; // Return the secure URL of the random avatar.

  } catch (error) {
    console.error("Error fetching avatars:", error);
    return null;
  }
}

module.exports = {
  getRandomAvatar,
};
