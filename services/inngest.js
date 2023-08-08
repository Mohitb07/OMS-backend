const { PrismaClient } = require("@prisma/client");
const { InngestMiddleware, Inngest } = require("inngest");

const prismaMiddleware = new InngestMiddleware({
  name: "Prisma Middleware",
  init() {
    const prisma = new PrismaClient();

    return {
      onFunctionRun(ctx) {
        return {
          transformInput(ctx) {
            return {
              // Anything passed via `ctx` will be merged with the function's arguments
              ctx: {
                prisma,
              },
            };
          },
        };
      },
    };
  },
});

const inngest = new Inngest({
  name: "wondrmart",
  eventKey: process.env.INNGEST_EVENT_KEY,
  middleware: [prismaMiddleware],
});

module.exports = {
  inngest,
};
