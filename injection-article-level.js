// inject.js
// Note: When this project is served as an AMP page, arbitrary author scripts are not allowed.
// Use amp-script in the page instead (see index.html). The original injection logic is kept
// below (commented) for local testing or non-AMP usage.

console.log(
  'inject.js loaded — not used for AMP. If you are testing non-AMP, uncomment the code below.'
);

const BASE_URL = 'https://beta.a.zzazz.com/event';

// Helper function to get device dimensions
function getDeviceDimensions() {
  return {
    width:
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth,
    height:
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight,
  };
}

// Pageview API call
async function sendPageview({ url }) {
  const device = getDeviceDimensions();
  const user_id = localStorage.getItem('user_id') || '';

  const payload = {
    url: url || '',
    device: {
      width: device.width,
      height: device.height,
    },
    type: 'pageview',
  };

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(user_id && { 'user-id': user_id }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Pageview request failed:', response.status);
    }
    const json = await response.json();
    localStorage.setItem('user_id', json.user_id);
    localStorage.setItem('event_id', json.event_id);
  } catch (error) {
    console.error('Pageview error:', error);
  }
}

// Poll API call
async function sendPoll() {
  const device = getDeviceDimensions();
  const user_id = localStorage.getItem('user_id') || 'TEST_ID';
  const event_id = localStorage.getItem('event_id') || 'TEST_ID';

  const payload = {
    type: 'poll',
    id: event_id,
  };

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': user_id,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Poll request failed:', response.status);
    }
  } catch (error) {
    console.error('Poll error:', error);
  }
}

const injectPriceArticleLevel = () => {
  console.log('ran the inject price function');
  const signalDiv = document.getElementById('zzazz-signal-div');
  const articleUrl = signalDiv.getAttribute('data-url');

  console.log({ signalDiv: signalDiv.textContent });

  const raw = JSON.stringify({
    urls: [articleUrl],
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
      const priceData = data[articleUrl];

      // if div is already present, do not create again, just update the price
      const existingPriceDiv = document.getElementById(articleUrl);
      if (existingPriceDiv) {
        const h2 = existingPriceDiv.querySelector('h2');
        h2.textContent = priceData.price?.toFixed(2);
        const qapSpan = document.createElement('span');
        qapSpan.style.cssText = `
          font-size: 10px;
          font-weight: 500;
        `;
        qapSpan.textContent = ' QAP';
        h2.appendChild(qapSpan);
        return;
      }

      const priceDiv = createAmpSignalDiv();
      priceDiv.id = articleUrl;
      const h2 = priceDiv.querySelector('h2');
      h2.textContent = priceData.price?.toFixed(2);
      const qapSpan = document.createElement('span');
      qapSpan.style.cssText = `
          font-size: 10px;
          font-weight: 500;
        `;
      qapSpan.textContent = ' QAP';
      h2.appendChild(qapSpan);

      signalDiv.parentNode.appendChild(priceDiv);
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
  font-family: 'Inter', sans-serif !important;
  margin-top: 12px;
`;

  // Create the first image (logo)
  const logoImg = document.createElement('amp-img');
  logoImg.src =
    'https://yashgargzzazz.github.io/ht-amp-dummy/assets/zzazz-logo.svg';
  logoImg.setAttribute('width', '20');
  logoImg.setAttribute('height', '20');
  logoImg.setAttribute('layout', 'fixed');
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
  const trendImg = document.createElement('amp-img');
  trendImg.src = 'https://yashgargzzazz.github.io/ht-amp-dummy/assets/up.svg';
  trendImg.setAttribute('width', '10');
  trendImg.setAttribute('height', '10');
  trendImg.setAttribute('layout', 'fixed');
  trendImg.alt = 'up-trend';
  trendImg.style.display = 'block';

  trendWrapper.appendChild(trendImg);
  container.appendChild(trendWrapper);

  return container;
}
// poll this function so that the price updates after every 2 seconds
setInterval(() => {
  injectPriceArticleLevel();
}, 1000);

// Call sendPageview once when script loads
sendPageview({ url: 'https://hindustantimes.com/amp' });

// Poll API call every 10 seconds
setInterval(() => {
  sendPoll();
}, 10000);
