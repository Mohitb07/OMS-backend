const { StatusCodes } = require("http-status-codes");
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

const prisma = require("../prismaClient");
const {
  cloudinaryImageUploader,
  deleteCloudinaryImage,
} = require("../services/cloudinary");
const ValidationError = require("../errors/ValidationError");
const NotFoundError = require("../errors/NotFoundError");
const { validationResult } = require("express-validator");

const getAllProducts = async (req, res, next) => {
  const { query, page } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  const LIMIT = 12;
  const currentPage = Number(page) || 1;
  try {
    let products = [];
    if (query) {
      products = await prisma.product.findMany({
        where: {
          OR: [
            {
              name: {
                contains: query,
              },
            },
            {
              description: {
                contains: query,
              },
            },
          ],
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

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  try {
    if (query) {
      const count = await prisma.product.count({
        where: {
          OR: [
            {
              name: {
                contains: query,
              },
            },
            {
              description: {
                contains: query,
              },
            },
          ],
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
  const { productId } = req.params;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  try {
    // throw new Error("Test error");
    const product = await prisma.product.findUnique({
      where: {
        product_id: productId,
      },
    });
    if (!product) {
      throw new NotFoundError(`Product with id ${productId} not found`);
    }
    return res.status(StatusCodes.OK).send(product);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  const { name, description, price, image_url } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  const window = new JSDOM("").window;
  const DOMPurify = createDOMPurify(window);
  const clean = DOMPurify.sanitize(description);
  let publicId;
  try {
    const resp = await cloudinaryImageUploader(image_url);
    publicId = resp;
    await prisma.product.create({
      data: {
        name,
        description: clean,
        price,
        image_url: resp,
      },
    });
    return res.status(StatusCodes.CREATED).send({ message: "Product created" });
  } catch (error) {
    if (publicId) {
      await deleteCloudinaryImage(publicId);
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
