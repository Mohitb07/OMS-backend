const { Prisma } = require("@prisma/client");
const { processSearchQuery } = require("./aisearch");

const getProductQuery = async (userQuery, sortby) => {
  const query = {};

  if (userQuery && typeof userQuery === "string" && userQuery.trim() !== "") {
    const result = await processSearchQuery(userQuery.trim());

    if (result) {
      const minP = result.minPrice ? parseFloat(result.minPrice) : null;
      const maxP = result.maxPrice ? parseFloat(result.maxPrice) : null;

      const priceFilter = {};
      if (minP !== null && !isNaN(minP)) priceFilter.gte = minP;
      if (maxP !== null && !isNaN(maxP)) priceFilter.lte = maxP;

      const hasPriceFilter = Object.keys(priceFilter).length > 0;
      const searchTerm = result.productName ? result.productName.trim() : userQuery.trim();

      if (searchTerm) {
        const textFilter = [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
        ];

        if (hasPriceFilter) {
          query.where = {
            OR: textFilter.map((item) => ({
              ...item,
              price: priceFilter,
            })),
          };
        } else {
          query.where = {
            OR: textFilter,
          };
        }
      } else if (hasPriceFilter) {
        query.where = {
          price: priceFilter,
        };
      }
    }
  }

  // Sorting logic
  if (sortby === "price") {
    query.orderBy = { price: Prisma.SortOrder.asc };
  } else if (sortby === "price-desc") {
    query.orderBy = { price: Prisma.SortOrder.desc };
  } else if (sortby === "name") {
    query.orderBy = { name: Prisma.SortOrder.asc };
  } else if (sortby === "newest") {
    query.orderBy = { createdAt: Prisma.SortOrder.desc };
  } else if (sortby === "oldest") {
    query.orderBy = { createdAt: Prisma.SortOrder.asc };
  }

  return query;
};

module.exports = {
  getProductQuery,
};
