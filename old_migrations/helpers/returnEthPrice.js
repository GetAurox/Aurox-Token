const axios = require("axios");

module.exports = async () => {
  try {
    const { data } = await axios.get(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
      {
        params: {
          symbol: "ETH",
        },
        headers: {
          "X-CMC_PRO_API_KEY": "705b4dca-565e-4767-b1e6-33a11fdd87c5",
        },
      }
    );

    return data.data.ETH.quote.USD.price;
  } catch (e) {
    throw Error(e);
  }
};
