const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function getCloudinaryImageURL(cloudinaryString) {
  try {
    const imageDetails = await cloudinary.api.resource(cloudinaryString);
    return imageDetails.secure_url;
  } catch (error) {
    console.error('Error fetching Cloudinary image details:', error);
    return null;
  }
}

module.exports = { cloudinary, getCloudinaryImageURL };
