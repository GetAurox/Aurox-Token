module.exports = function (stakeObj) {
  return stakeObj.logs[0].args.stakeAddress;
};
