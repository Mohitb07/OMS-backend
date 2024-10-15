const CloudinaryError = require("../errors/CloudinaryError");

const cloudinary = require("cloudinary").v2;

const CLOUDINARY_UPLOAD_PRESET = "oms";

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
    console.error("Error fetching Cloudinary image details:", error);
    return null;
  }
}

async function cloudinaryImageUploader(image_url) {
  try {
    const resp = await cloudinary.uploader.upload(image_url, {
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
    });
    return resp.public_id;
  } catch (error) {
    throw new CloudinaryError("Error uploading image to cloudinary");
  }
}

async function deleteCloudinaryImage(public_id) {
  try {
    await cloudinary.uploader.destroy(public_id);
  } catch (error) {
    throw new CloudinaryError("Error deleting image from Cloudinary:");
  }
}

module.exports = {
  cloudinary,
  getCloudinaryImageURL,
  cloudinaryImageUploader,
  deleteCloudinaryImage,
};
