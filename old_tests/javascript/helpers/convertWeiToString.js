module.exports = function (wei) {
  console.log(wei);

  return web3.utils.toWei(wei).toString();
};
