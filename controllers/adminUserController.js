const { StatusCodes } = require("http-status-codes");
const prisma = require("../prismaClient");
const NotFoundError = require("../errors/NotFoundError");

/**
 * Get all storefront customers (with search, pagination, and order counts)
 */
const getAllUsers = async (req, res, next) => {
  const { query, search, page, limit, sortby } = req.query;

  const searchTerm = (search || query || "").trim();
  const LIMIT = Math.max(Number(limit) || 10, 1);
  const currentPage = Math.max(Number(page) || 1, 1);

  const where = searchTerm
    ? {
        OR: [
          { username: { contains: searchTerm } },
          { email: { contains: searchTerm } },
        ],
      }
    : undefined;

  const orderBy = {
    createdAt: sortby === "oldest" ? "asc" : "desc",
  };

  try {
    const [users, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where,
        take: LIMIT,
        skip: (currentPage - 1) * LIMIT,
        orderBy,
        select: {
          customer_id: true,
          username: true,
          email: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              addresses: true,
            },
          },
        },
      }),
      prisma.customer.count(where ? { where } : undefined),
    ]);

    return res.status(StatusCodes.OK).json({
      users,
      pagination: {
        totalCount,
        currentPage,
        totalPages: Math.ceil(totalCount / LIMIT) || 1,
        limit: LIMIT,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single storefront customer details including addresses and recent orders
 */
const getUserById = async (req, res, next) => {
  const { userId } = req.params;

  try {
    const user = await prisma.customer.findUnique({
      where: { customer_id: userId },
      select: {
        customer_id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          orderBy: { createdAt: "desc" },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            order_id: true,
            order_amount: true,
            payment_method: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
            addresses: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError(`User with id ${userId} not found`);
    }

    return res.status(StatusCodes.OK).json({ user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
};
