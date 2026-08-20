const { StatusCodes } = require("http-status-codes");
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");
const { validationResult } = require("express-validator");

const prisma = require("../prismaClient");
const ValidationError = require("../errors/ValidationError");
const NotFoundError = require("../errors/NotFoundError");
const {
  cloudinaryImageUploader,
  deleteCloudinaryImage,
} = require("../services/cloudinary");
const { getProductQuery } = require("../services/getProductQuery");

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const createProduct = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  const { name, description, price, image_url } = req.body;
  const cleanDescription = DOMPurify.sanitize(description);

  let imagePublicIdOrUrl = image_url;
  // If image_url starts with data: or http/https, try uploading to Cloudinary if configured
  if (image_url && (image_url.startsWith("data:") || image_url.startsWith("http"))) {
    try {
      const resp = await cloudinaryImageUploader(image_url);
      if (resp) {
        imagePublicIdOrUrl = resp;
      }
    } catch (err) {
      console.warn("Cloudinary upload fallback to raw image_url:", err.message);
    }
  }

  const product = await prisma.product.create({
    data: {
      name,
      description: cleanDescription,
      price: parseFloat(price),
      image_url: imagePublicIdOrUrl,
    },
  });

  return res.status(StatusCodes.CREATED).json({
    message: "Product created successfully",
    product,
  });
};

const getAllProducts = async (req, res, next) => {
  const { query, page, limit, sortby } = req.query;

  const LIMIT = Number(limit) || 12;
  const currentPage = Number(page) || 1;

  try {
    const filterQuery = await getProductQuery(query, sortby);

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        ...filterQuery,
        take: LIMIT,
        skip: (currentPage - 1) * LIMIT,
      }),
      prisma.product.count(filterQuery.where ? { where: filterQuery.where } : undefined),
    ]);

    return res.status(StatusCodes.OK).json({
      products,
      pagination: {
        totalCount,
        currentPage,
        totalPages: Math.ceil(totalCount / LIMIT),
        limit: LIMIT,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  const { productId } = req.params;

  const product = await prisma.product.findUnique({
    where: { product_id: productId },
  });

  if (!product) {
    throw new NotFoundError(`Product with id ${productId} not found`);
  }

  return res.status(StatusCodes.OK).json(product);
};

const updateProduct = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  const { productId } = req.params;
  const { name, description, price, image_url } = req.body;

  const existingProduct = await prisma.product.findUnique({
    where: { product_id: productId },
  });

  if (!existingProduct) {
    throw new NotFoundError(`Product with id ${productId} not found`);
  }

  const updateData = {};

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = DOMPurify.sanitize(description);
  if (price !== undefined) updateData.price = parseFloat(price);

  if (image_url !== undefined && image_url !== existingProduct.image_url) {
    let newImageUrl = image_url;
    if (image_url && (image_url.startsWith("data:") || image_url.startsWith("http"))) {
      try {
        const resp = await cloudinaryImageUploader(image_url);
        if (resp) {
          newImageUrl = resp;
          // Optionally attempt cleanup of previous image
          if (existingProduct.image_url && !existingProduct.image_url.startsWith("http")) {
            await deleteCloudinaryImage(existingProduct.image_url).catch((err) =>
              console.warn("Failed to delete previous image:", err.message)
            );
          }
        }
      } catch (err) {
        console.warn("Cloudinary upload fallback to raw image_url:", err.message);
      }
    }
    updateData.image_url = newImageUrl;
  }

  const updatedProduct = await prisma.product.update({
    where: { product_id: productId },
    data: updateData,
  });

  return res.status(StatusCodes.OK).json({
    message: "Product updated successfully",
    product: updatedProduct,
  });
};

const deleteProduct = async (req, res, next) => {
  const { productId } = req.params;

  const existingProduct = await prisma.product.findUnique({
    where: { product_id: productId },
  });

  if (!existingProduct) {
    throw new NotFoundError(`Product with id ${productId} not found`);
  }

  // Delete image from Cloudinary if applicable
  if (existingProduct.image_url && !existingProduct.image_url.startsWith("http")) {
    await deleteCloudinaryImage(existingProduct.image_url).catch((err) =>
      console.warn("Failed to delete product image from Cloudinary:", err.message)
    );
  }

  await prisma.product.delete({
    where: { product_id: productId },
  });

  return res.status(StatusCodes.OK).json({
    message: `Product with id ${productId} deleted successfully`,
  });
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
