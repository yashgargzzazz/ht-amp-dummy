// inject.js
// Note: When this project is served as an AMP page, arbitrary author scripts are not allowed.
// Use amp-script in the page instead (see index.html). The original injection logic is kept
// below (commented) for local testing or non-AMP usage.

console.log(
  'inject.js loaded — not used for AMP. If you are testing non-AMP, uncomment the code below.'
);

const getPriceJson = () => {
  console.log('ran the inject price function');
  const articleTags = document.getElementsByClassName('storyLink articleClick');

  // create our divs so that we can inject price inside them
  for (let tag of articleTags) {
    const articleUrl = tag.getAttribute('href');
    const existingPriceDiv = document.getElementById(articleUrl);

    if (existingPriceDiv && existingPriceDiv.id === articleUrl) break;

    const priceDiv = document.createElement('amp-script');
    priceDiv.setAttribute('width', '100px');
    priceDiv.setAttribute('height', '100px');
    priceDiv.setAttribute('src', 'new-article-level.js');
    priceDiv.id = articleUrl;
    priceDiv.innerHTML = `<h2 style="color: blue; margin: 10px">Price: ₹${0}</h2>`;

    //render this div below the article link after the updated date
    tag.parentNode.insertBefore(priceDiv, tag.nextSibling);
  }

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
        const ourDiv = document.getElementById(url);
        if (!ourDiv) continue;
        ourDiv.innerHTML = `<h2 style="color: blue; margin: 10px">Price: ₹${data[url].price}</h2>`;
      }
    });
};

// poll this function so that the price updates after every 2 seconds
setInterval(() => {
  getPriceJson();
}, 1000);
