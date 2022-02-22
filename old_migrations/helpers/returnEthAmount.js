module.exports = (ethPrice) => {
  const auroxAmount = 1;
  // $2 per Aurox
  // const auroxValue = auroxAmount * 2;
  const auroxValue = auroxAmount * 2;
  const ethAmount = auroxValue / ethPrice;
  return ethAmount.toFixed(10);
};
