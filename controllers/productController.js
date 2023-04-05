const prisma = require("../prismaClient");

const getAllProducts = async (req, res) => {
  try {
    const products = await prisma.products.findMany();
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
  const { product_id, name, description, price, image_url } = req.body;
  try {
    await prisma.products.create({
      data: {
        product_id,
        name,
        description,
        price,
        image_url,
      },
    });
    return res.status(201).send({ message: "Product created" });
  } catch (error) {
    console.error(error)
    return res.status(500).send({ message: "Internal server error try again again" });
  }
};

module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
};
