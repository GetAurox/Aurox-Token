module.exports = (value, accuracy) => {
  const accuracySplitter = 10 ** accuracy;
  const reducedValue = Math.round(value / accuracySplitter);
  return reducedValue * accuracySplitter;
};
