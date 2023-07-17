const prisma = require("../prismaClient");
const { cloudinary } = require("../services/cloudinary");

const getAllProducts = async (req, res) => {
  const { query } = req.body;
  console.log("what is query", query);
  try {
    let products = [];
    if (query) {
      products = await prisma.products.findMany({
        where: {
          name: {
            search: query,
          },
          description: {
            search: query,
          },
        },
      });
    } else {
      products = await prisma.products.findMany();
    }
    if (products.length === 0) {
      return res.status(200).json([]);
    }
    return res.status(200).json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

const getProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await prisma.products.findUnique({
      where: {
        product_id: productId,
      },
    });
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }
    return res.status(200).json(product);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

const createProduct = async (req, res) => {
  const { name, description, price, image_url } = req.body;
  try {
    const resp = await cloudinary.uploader.upload(image_url, {
      upload_preset: "oms",
    });
    console.log("res", resp);
    await prisma.products.create({
      data: {
        name,
        description,
        price,
        image_url: resp.public_id,
      },
    });
    return res.status(201).send({ message: "Product created" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .send({ message: "Internal server error try again again" });
  }
};

module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
};
