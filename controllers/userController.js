const { StatusCodes } = require("http-status-codes");

const userInfo = async (req, res) => res.status(StatusCodes.OK).json(req.user);

module.exports = {
  userInfo,
};
