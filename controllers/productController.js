const { StatusCodes } = require("http-status-codes");
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

const prisma = require("../prismaClient");
const { cloudinary } = require("../services/cloudinary");

const getAllProducts = async (req, res, next) => {
  const { query } = req.body;
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
      return res.status(StatusCodes.OK).json([]);
    }
    return res.status(StatusCodes.OK).json(products);
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await prisma.products.findUnique({
      where: {
        product_id: productId,
      },
    });
    if (!product) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .send({ message: "Product not found" });
    }
    return res.status(StatusCodes.OK).json(product);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  const { name, description, price, image_url } = req.body;

  if (!name || !description || !price || !image_url) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: "Missing required fields" });
  }
  let publicId;
  const window = new JSDOM("").window;
  const DOMPurify = createDOMPurify(window);
  const clean = DOMPurify.sanitize(description);
  try {
    const resp = await cloudinary.uploader.upload(image_url, {
      upload_preset: "oms",
    });
    publicId = resp.public_id;
    await prisma.products.create({
      data: {
        name,
        description: clean,
        price,
        image_url: resp.public_id,
      },
    });
    return res.status(StatusCodes.CREATED).send({ message: "Product created" });
  } catch (error) {
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        next(error);
      }
    }
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
};
