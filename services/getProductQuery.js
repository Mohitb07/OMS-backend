const { Prisma } = require("@prisma/client");
const { processSearchQuery } = require("./aisearch");

const getProductQuery = async (userQuery, sortby) => {
  const query = Object.assign({});

  if (userQuery) {
    const result = await processSearchQuery(userQuery);
    query["where"] = {
      OR: [
        {
          name: {
            contains: result.productName ? result.productName : undefined,
          },
          price: {
            gte: result.minPrice ? result.minPrice : undefined,
            lte: result.maxPrice ? result.maxPrice : undefined,
          },
        },
        {
          description: {
            contains: result.productName ? result.productName : undefined,
          },
          price: {
            gte: result.minPrice ? result.minPrice : undefined,
            lte: result.maxPrice ? result.maxPrice : undefined,
          },
        },
      ],
    };
  }

  if (sortby === "price") {
    query["orderBy"] = {
      price: Prisma.SortOrder.asc,
    };
  }

  if (sortby === "price-desc") {
    query["orderBy"] = {
      price: Prisma.SortOrder.desc,
    };
  }

  if (sortby === "name") {
    query["orderBy"] = {
      name: Prisma.SortOrder.asc,
    };
  }

  if (sortby === "newest") {
    query["orderBy"] = {
      createdAt: Prisma.SortOrder.desc,
    };
  }

  if (sortby === "oldest") {
    query["orderBy"] = {
      createdAt: Prisma.SortOrder.asc,
    };
  }

  return query;
};

module.exports = {
  getProductQuery,
};
