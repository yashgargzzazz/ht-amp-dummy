// inject.js
// Note: When this project is served as an AMP page, arbitrary author scripts are not allowed.
// Use amp-script in the page instead (see index.html). The original injection logic is kept
// below (commented) for local testing or non-AMP usage.

console.log(
  'inject.js loaded — not used for AMP. If you are testing non-AMP, uncomment the code below.'
);

const injectPrice = () => {
  console.log('ran the inject price function');
  const articleTags = document.getElementsByClassName('storyLink articleClick');

  // create our divs so that we can inject price inside them
  for (let tag of articleTags) {
    const articleUrl = tag.getAttribute('href');
    const existingPriceDiv = document.getElementById(articleUrl);

    if (existingPriceDiv && existingPriceDiv.id === articleUrl) break;

    const priceDiv = createAmpSignalDiv();
    priceDiv.id = articleUrl;

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
        const h2 = ourDiv.querySelector('h2');
        h2.textContent = data[url].price?.toFixed(2);
        const qapSpan = document.createElement('span');
        qapSpan.style.cssText = `
          font-size: 10px;
          font-weight: 500;
        `;
        qapSpan.textContent = ' QAP';
        h2.appendChild(qapSpan);
      }
    });
};

function createAmpSignalDiv() {
  // Create the outer container
  const container = document.createElement('div');
  container.style.cssText = `
  padding: 6px 12px;
  border: 1px solid #333333;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: white;
  width: fit-content;
  height: fit-content;
  font-family: 'Inter', sans-serif;
`;

  // Create the first image (logo)
  const logoImg = document.createElement('img');
  logoImg.src =
    'https://yashgargzzazz.github.io/ht-amp-dummy/assets/zzazz-logo.svg';
  logoImg.width = 20;
  logoImg.height = 20;
  logoImg.alt = 'zzazz-logo';
  logoImg.style.display = 'block';
  container.appendChild(logoImg);

  // Create the h2 element with span inside
  const h2 = document.createElement('h2');
  h2.style.cssText = `
  padding: 0;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
`;
  h2.textContent = `0.00`;

  const qapSpan = document.createElement('span');
  qapSpan.style.cssText = `
  font-size: 10px;
  font-weight: 500;
`;
  qapSpan.textContent = ' QAP';

  h2.appendChild(qapSpan);
  container.appendChild(h2);

  // Create the trend icon wrapper
  const trendWrapper = document.createElement('div');
  trendWrapper.style.cssText = `
  padding: 4px;
  border-radius: 4px;
  background-color: #2aba7e33;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  width: 16px;
`;

  // Create the trend icon image
  const trendImg = document.createElement('img');
  trendImg.src = 'https://yashgargzzazz.github.io/ht-amp-dummy/assets/up.svg';
  trendImg.width = 10;
  trendImg.height = 10;
  trendImg.alt = 'up-trend';
  trendImg.style.display = 'block';

  trendWrapper.appendChild(trendImg);
  container.appendChild(trendWrapper);

  return container;
}

// poll this function so that the price updates after every 2 seconds
setInterval(() => {
  injectPrice();
}, 1000);
