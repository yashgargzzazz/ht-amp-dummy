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

        // Track price update event (custom event)
        await analyticsRust.trackEvent('price_update', {
          url,
          price: data[url].price,
          currency: 'inr',
          referrer: document.referrer || null,
        });
      }
    });
};

// poll this function so that the price updates after every 2 seconds
setInterval(() => {
  injectPrice();
}, 1000);

// Track pageview event on load
window.addEventListener('DOMContentLoaded', async () => {
  await analyticsRust.trackPageView(window.location.href, 'inr');
});

// Track click events on article links
document.addEventListener('click', async (e) => {
  const target = e.target.closest('.storyLink.articleClick');
  if (target) {
    const articleUrl = target.getAttribute('href');
    await analyticsRust.clickEvent({
      element: 'storyLink',
      pricingUiVersion: 'v1',
      articleUrl,
      price: null,
      currency: 'inr',
      isPremium: false,
    });
  }
});

// Example: Track hover event on article links (if needed)
const articleTags = document.getElementsByClassName('storyLink articleClick');
for (let tag of articleTags) {
  tag.addEventListener('mouseenter', async () => {
    await analyticsRust.trackArticleHover(
      'hover',
      tag.getAttribute('href'),
      null,
      'inr'
    );
  });
}

class Analytics {
  constructor(url) {
    this.url = url;
    this.timepayUrl =
      'https://timepay-telemetry.staging.zzazz.com/v1/telemetry/';
    this.user_id = localStorage.getItem('qxUserId') || null;
    this.pageVisitTime = null;
    this.pollTimeout = null;
    this.polledUrl = null;
    this.userDomainId = '55630ec4-c594-44b8-88f3-f2da59f8a113-brightbotsai.com';
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

  async sendTimePayEvent(payload) {
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

    headers['x-tp-device'] =
      localStorage.getItem('zzazz-device-id') || this.xTpId;

    try {
      const response = await fetch(`${this.timepayUrl}events`, {
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

  // Add this method to the Analytics class
  async sendToAllServices(payload) {
    return Promise.all([
      this.sendTimePayEvent(payload),
      this.sendEvent(payload),
    ]).then(([, eventResult]) => {
      // Return the result from sendEvent instead of sendTimePayEvent
      return eventResult;
    });
  }

  getDeviceInfo() {
    return {
      width: window?.screen?.width,
      height: window?.screen?.height,
    };
  }

  async trackEvent(type, eventProps) {
    const basePayload = {
      type,
      url: eventProps.url,
      referrer: eventProps.referrer,
      device: this.getDeviceInfo(),
    };

    if (type === 'pageview') {
      basePayload.is_premium = eventProps.is_premium;
      basePayload.price = eventProps.price || null;
      basePayload.currency = eventProps.currency;
    }

    return this.sendEvent(basePayload);
  }

  async trackPageView(url, currency) {
    if (url !== window.top.location.href) return;

    clearTimeout(this.pollTimeout);
    this.polledUrl = url;
    this.pageVisitTime = Date.now();

    this.pageIdPromise = this.trackEvent('pageview', {
      url,
      referrer: document.referrer || null,
      currency,
    }).then((eventId) => {
      this.pageId = eventId;
      this.pollEvent(eventId, url);
      return eventId;
    });

    return this.pageIdPromise;
  }

  pollEvent(eventId, url) {
    if (url !== this.polledUrl) return;

    console.log('poll event--', eventId);
    const payload = { type: 'poll', id: eventId };

    fetch(`${this.url}event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'user-id': this.user_id || '',
      },
      body: JSON.stringify(payload),
    })
      .then(() => {
        const elapsed = Date.now() - this.pageVisitTime;
        const waitTime = elapsed > 600000 ? 60000 : 5000;

        this.pollTimeout = setTimeout(
          () => this.pollEvent(eventId, url),
          waitTime
        );
      })
      .catch(console.error);
  }

  async adImpressionEvent({ adId, timePayVariant }) {
    // Ensure pageId is available before sending ad impression
    if (!this.pageIdPromise) throw new Error('Page ID not initialized');

    // Wait for pageId to be resolved
    await this.pageIdPromise;

    // Only send ad impression if not already sent for this adId
    if (this.adImpressionId) return this.adImpressionPromise;

    const payload = {
      type: 'ad',
      pageId: this.pageId,
      subtype: 'impression',
      pageUrl: window.location.href,
      adId: `${adId}`,
      position: 'overlay',
      adVariantId: timePayVariant,
    };

    this.adImpressionPromise = this.sendToAllServices(payload).then(
      (eventId) => {
        this.adImpressionId = eventId;
        this.flushEventQueue();
        return eventId;
      }
    );

    return this.adImpressionPromise;
  }

  async queueOrSendEvent(eventFn, args) {
    if (this.pageId && this.adImpressionId && this.xTpId) {
      return eventFn.call(this, args);
    }

    this.eventQueue.push({ eventFn, args });
    console.log('Event queued:', this.eventQueue);

    // Try to get xTpId from local storage if it's not set yet
    if (!this.xTpId) {
      this.xTpId = localStorage.getItem('zzazz-device-id');
    }

    if (this.pageIdPromise && this.adImpressionPromise) {
      await Promise.all([this.pageIdPromise, this.adImpressionPromise]);
      this.flushEventQueue();
    }
  }

  async flushEventQueue() {
    console.log('Flushing event queue:', this.eventQueue.length);
    for (const { eventFn, args } of this.eventQueue) {
      await eventFn.call(this, args);
    }
    this.eventQueue = [];
  }

  async _adInteractionEvent({ adId, action, time, timePayVariant }) {
    const payload = {
      type: 'ad',
      pageId: this.pageId,
      adImpressionId: this.adImpressionId,
      subtype: 'interaction',
      pageUrl: window.location.href,
      adId: `${adId}`,
      action,
      time,
      label: '',
      adVariantId: timePayVariant,
    };

    return this.sendToAllServices(payload);
  }

  async _adProgressEvent({ adId, action, time, timePayVariant }) {
    const payload = {
      type: 'ad',
      pageId: this.pageId,
      adImpressionId: this.adImpressionId,
      subtype: 'progress',
      pageUrl: window.location.href,
      adId: `${adId}`,
      action,
      time,
      label: '',
      adVariantId: timePayVariant,
    };
    return this.sendToAllServices(payload);
  }

  async _adDisengagementEvent({ adId, action, time, timePayVariant }) {
    const payload = {
      type: 'ad',
      pageId: this.pageId,
      adImpressionId: this.adImpressionId,
      subtype: 'disengagement',
      pageUrl: window.location.href,
      adId: `${adId}`,
      action,
      time,
      label: '',
      adVariantId: timePayVariant,
    };
    return this.sendToAllServices(payload);
  }

  async _adContentUnlockedEvent({ price, timePayVariant, currency }) {
    const payload = {
      type: 'contentUnlocked',
      pageId: this.pageId,
      adImpressionId: this.adImpressionId,
      pageUrl: window.location.href,
      unlockMethod: 'advertisement',
      price,
      currency: currency,
      adVariantId: timePayVariant,
    };
    return this.sendToAllServices(payload);
  }

  async _adErrorEvent({ adId }) {
    const payload = {
      type: 'ad',
      pageId: this.pageId,
      adImpressionId: this.adImpressionId,
      subtype: 'error',
      pageUrl: window.location.href,
      adId: `${adId}`,
      errorCode: 'ERR_TIMEOUT',
      errorMessage: 'Ad failed to load within 5s',
      severity: 'warning',
    };
    return this.sendToAllServices(payload);
  }

  async adInteractionEvent(args) {
    return this.queueOrSendEvent(this._adInteractionEvent, args);
  }

  async adProgressEvent(args) {
    return this.queueOrSendEvent(this._adProgressEvent, args);
  }

  async adDisengagementEvent(args) {
    return this.queueOrSendEvent(this._adDisengagementEvent, args);
  }

  async adContentUnlockedEvent(args) {
    return this.queueOrSendEvent(this._adContentUnlockedEvent, args);
  }

  async adErrorEvent(args) {
    return this.queueOrSendEvent(this._adErrorEvent, args);
  }

  async trackArticleHover(eventType, url, price, currency) {
    const payload = { url, price, currency };
    return this.trackEvent(eventType, payload);
  }

  async graphEvent({ articleUrl, subtype, element, price, currency }) {
    const payload = {
      pageUrl: window.location.href,
      articleUrl,
      type: 'graph',
      subtype,
      userDomainId: this.userDomainId,
      ...(subtype === 'open'
        ? { price: parseFloat(price), currency }
        : { element }),
    };

    return this.sendEvent(payload);
  }

  async paywindowEvent({ url, subtype, price, currency }) {
    const payload = {
      type: 'paywindow',
      subtype,
      url,
      price,
      currency,
      device: this.getDeviceInfo(),
    };

    return this.sendEvent(payload);
  }

  async unlockEvent({ url, subtype, price, currency }) {
    const payload = {
      type: 'unlock',
      subtype,
      url,
      price,
      currency,
    };

    return this.sendToAllServices(payload);
  }

  async adEvent({
    url,
    subtype,
    price,
    currency,
    id,
    ad_name,
    ad_type,
    ad_no,
  }) {
    const payload = {
      type: 'ad',
      subtype,
      ad_no,
      ...(subtype === 'start' || subtype === 'notStarted'
        ? { url, price, currency, ad_name, ad_type }
        : { id }),
    };

    return this.sendEvent(payload);
  }

  async clickEvent({
    element,
    pricingUiVersion,
    articleUrl,
    price,
    currency,
    isPremium,
  }) {
    const payload = {
      type: 'click',
      page_url: window.location.href,
      element,
      pricing_ui_version: pricingUiVersion,
      article_url: articleUrl,
      price,
      currency,
      is_premium: isPremium,
    };

    return this.sendEvent(payload);
  }
}

const analyticsRust = new Analytics('https://a.zzazz.com/');

// const wrapBodyBtn = document.getElementById('wrap_body_in_amp_script');
// wrapBodyBtn.addEventListener('click', () => {
//   const body = document.body;
//   const ampScript = document.createElement('amp-script');
//   ampScript.setAttribute('width', '100%');
//   ampScript.setAttribute('height', '100%');
//   ampScript.setAttribute('src', 'index.js');

//   // Move all existing body children into the new amp-script element
//   while (body.firstChild) {
//     ampScript.appendChild(body.firstChild);
//   }

//   // Append the new amp-script element to the body
//   body.appendChild(ampScript);
// });

// const injectPriceBtn = document.getElementById('inject_price');

// injectPriceBtn.addEventListener('click', () => injectPrice());

/*
(function () {
  function doInject() {
    try {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "widget.js" + `?${Date.now()}`;

      const target = document.body || document.head || document.documentElement;
      target.append(script);

      const style = document.createElement("style");
      style.type = "text/css";
      style.id = "zzazz_dynamic_css";
      style.textContent = `\n .zzazz-popup {\n    padding: 5px 10px;}\n`;
      (document.head || document.documentElement).appendChild(style);
    } catch (err) {
      console.error('inject.js failed to inject:', err);
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', doInject);
  } else {
    doInject();
  }
})();
*/
