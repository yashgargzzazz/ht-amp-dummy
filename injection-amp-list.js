// inject.js
// Note: When this project is served as an AMP page, arbitrary author scripts are not allowed.
// Use amp-script in the page instead (see index.html). The original injection logic is kept
// below (commented) for local testing or non-AMP usage.

console.log(
  'inject.js loaded — not used for AMP. If you are testing non-AMP, uncomment the code below.'
);

const getPrices = async () => {
  console.log('ran the inject price function');
  const outputJson = [];

  const articleTags = document.getElementsByClassName('storyLink articleClick');

  const articleUrls = Array.from(articleTags).map((tag) =>
    tag.getAttribute('href')
  );

  const raw = JSON.stringify({
    urls: articleUrls,
    currency: 'inr',
  });

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: raw,
  };

  // call api
  fetch('https://v.zzazz.com/v2/price', requestOptions)
    .then((response) => response.json())
    .then((data) => {
      for (let url in data) {
        outputJson.push({ url: url, price: data[url].price });
      }
    });

  return outputJson;
};

setInterval(async () => {
  const priceData = await getPrices();
  const stringifiedData = JSON.stringify(priceData, null, 2);
  console.log({
    priceData,
  });
}, 1000);
