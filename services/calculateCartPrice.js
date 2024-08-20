const calculateCartPrice = (cartItems) => {
    return cartItems.reduce(
      (acc, currentCartItem) =>
        acc +
        Number(currentCartItem.quantity) * Number(currentCartItem.product.price),
      0
    );
  };

  module.exports = {
    calculateCartPrice
  };
  