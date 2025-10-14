console.log(
  'inject.js loaded — not used for AMP. If you are testing non-AMP, uncomment the code below.'
);

const injectPrice = async () => {
  console.log('ran the inject price function');
  const articleTags = document.getElementsByClassName('storyLink articleClick');

  // create our divs so that we can inject price inside them
  for (let tag of articleTags) {
    const articleUrl = tag.getAttribute('href');
    const existingPriceDiv = document.getElementById(articleUrl);

    if (existingPriceDiv && existingPriceDiv.id === articleUrl) break;

    const priceDiv = document.createElement('div');
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
    .then(async (data) => {
      for (let url in data) {
        const ourDiv = document.getElementById(url);
        if (!ourDiv) continue;
        ourDiv.innerHTML = `<h2 style="color: blue; margin: 10px">Price: ₹${data[url].price}</h2>`;
      }
    });
};

// poll this function so that the price updates after every 2 seconds

setInterval(() => {
  injectPrice();
}, 1000);

const requestOptions = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  redirect: 'follow',
};
const baseUrl = 'https://a.zzazz.com';

const pageViewAPI = () => {
  try {
    fetch(`${baseUrl}/event`, {
      ...requestOptions,
      body: JSON.stringify({
        'user-id': localStorage.getItem('user_id') || '',
        url: window.location.href, // Dynamic URL from window
        referrer: document.referrer || '', // Dynamic referrer from document
        device: {
          width: window.screen ? window.screen.width : 0, // Dynamic screen width
          height: window.screen ? window.screen.height : 0, // Dynamic screen height
        },
        is_premium: document.body.getAttribute('data-premium') || 'false',
        price: document.body.getAttribute('data-price') || 0,
        currency: document.body.getAttribute('data-currency') || 'USD',
        type: 'pageview',
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        localStorage.setItem('user_id', result.user_id);
        localStorage.setItem('event_id', result.event_id);
      })
      .catch((error) => console.error(error));
  } catch (error) {
    console.error('Error initializing AMP analytics:', error);
  }
};

const pollAPI = () => {
  try {
    const eventId = localStorage.getItem('event_id');
    if (!eventId) return;
    fetch(`${baseUrl}/event`, {
      ...requestOptions,
      body: JSON.stringify({
        id: eventId,
        type: 'poll',
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        localStorage.setItem('user_id', result.user_id);
        localStorage.setItem('event_id', result.event_id);
      })
      .catch((error) => console.error(error));
  } catch (error) {
    console.error('Error sending poll event:', error);
  }
};
