console.log(
  'inject.js loaded — not used for AMP. If you are testing non-AMP, uncomment the code below.'
);

let eventId = null;

try {
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    redirect: 'follow',
  };

  const baseUrl = 'https://a.zzazz.com';
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

      // Now that we have the event_id, we can send the poll event
      fetch(`${baseUrl}/event`, {
        ...requestOptions,
        body: JSON.stringify({
          id: result.event_id,
          type: 'poll',
        }),
      }).catch((error) => console.error(error));
    })
    .catch((error) => console.error(error));
} catch (error) {
  console.error('Error initializing AMP analytics:', error);
}

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

class Analytics {
  constructor(url) {
    this.url = url;
    this.timepayUrl =
      'https://timepay-telemetry.staging.zzazz.com/v1/telemetry/';
    this.user_id = localStorage.getItem('qxUserId') || null;
    this.pageVisitTime = null;
    this.pollTimeout = null;
    this.polledUrl = null;
    this.pageId = null;
    this.pageIdPromise = null;
    this.adImpressionId = null;
    this.adImpressionPromise = null;
    this.eventQueue = [];
    this.xTpId = null;
  }

  async sendEvent(payload) {
    console.log(
      'Sending event with pageId:',
      this.pageId,
      'adImpressionId:',
      this.adImpressionId
    );

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'user-id': this.user_id || '',
    };

    try {
      const response = await fetch(`${this.url}event`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      this.user_id = result.user_id;
      localStorage.setItem('qxUserId', this.user_id);

      return result.event_id;
    } catch (err) {
      console.error('Failed to send event:', err);
      throw err;
    }
  }
}

const analyticsRust = new Analytics('https://a.zzazz.com/');
