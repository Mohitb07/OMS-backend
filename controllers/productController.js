const { StatusCodes } = require("http-status-codes");
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

const prisma = require("../prismaClient");
const { cloudinary } = require("../services/cloudinary");

const getAllProducts = async (req, res, next) => {
  const { query, page } = req.body;
  const LIMIT = 10;
  const currentPage = Number(page) || 1;
  try {
    let products = [];
    if (query) {
      products = await prisma.product.findMany({
        where: {
          name: {
            search: query,
          },
          description: {
            search: query,
          },
        },
        take: LIMIT,
        skip: (currentPage - 1) * LIMIT,
      });
    } else {
      products = await prisma.product.findMany({
        take: LIMIT,
        skip: (currentPage - 1) * LIMIT,
      });
    }
    if (products.length === 0) {
      return res.status(StatusCodes.OK).json([]);
    }
    return res.status(StatusCodes.OK).json(products);
  } catch (error) {
    next(error);
  }
};

const getProductsCount = async (req, res, next) => {
  const { query } = req.body;
  try {
    if (query) {
      const count = await prisma.product.count({
        where: {
          name: {
            search: query,
          },
          description: {
            search: query,
          },
        },
      });
      return res.status(StatusCodes.OK).json({ count });
    } else {
      const count = await prisma.product.count();
      return res.status(StatusCodes.OK).json({ count });
    }
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await prisma.product.findUnique({
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
    await prisma.product.create({
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

const createDevProduct = async (req, res, next) => {
  const promises = Array.from({ length: 20 }, async (_, i) => {
    const product = {
      // your product data here
      name: `Product ${i}`,
      description: `Description for Product ${i}`,
      price: Math.floor(Math.random() * 100) + 1,
      image_url: "dummy",
      // add more fields as per your product schema
    };
    return prisma.product.create({ data: product });
  });

  const products = await Promise.all(promises);
  return res.status(StatusCodes.CREATED).send({
    message: `${products.length} products created`,
  });
};

module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
  createDevProduct,
  getProductsCount,
};
