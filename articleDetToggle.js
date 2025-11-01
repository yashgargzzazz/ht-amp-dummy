(async function bootstrapPriceWidget() {
  // ---- Local State ----
  const signalDiv = document.getElementById('zzazz-signal-div');
  const trackingId = signalDiv?.getAttribute('data-zzazz-t-id');
  const BASE_URL = 'https://beta.a.zzazz.com/event';
  const ENABLE_API = `https://cdn.zzazz.com/widget-rules/0999894d-399f-4e1f-ac8e-25861d437ce8.json`;
  const PRICE_API = 'https://beta.v.zzazz.com/v3/price';

  let session = { user_id: null, event_id: null };
  let lastPrice = null;
  let widgetVisible = false;
  let isPriced = false;
  let lastScrollTime = 0;

  // ---- Utils ----
  const getBrowserDimensions = () => ({
    width: window?.innerWidth || 0,
    height: window?.innerHeight || 0,
  });

  const getDeviceDimensions = () => ({
    width: window?.screen?.width || 0,
    height: window?.screen?.height || 0,
  });

  // ---- Debounce Helper ----
  function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }

  // ---- Event Sender (AMP-compatible) ----
  async function sendEvent(type, extraPayload = {}) {
    const payload = {
      type,
      ...extraPayload,
      id: session.event_id,
      pageId: session.event_id,
    };

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'tracking-id': `${trackingId}`,
      ...(session.user_id && { 'user-id': session.user_id }),
    };

    try {
      // Use fetch without credentials (AMP restriction)
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      // Update session if we got user/event IDs
      if (data?.user_id) session.user_id = data.user_id;
      if (data?.event_id) session.event_id = data.event_id;

      return { ok: res.ok, data };
    } catch (err) {
      console.error(`Failed to send event ${type}:`, err);
      return { ok: false, data: null };
    }
  }

  // ---- Send initial pageview ----
  async function sendPageViewEvent() {
    const payload = {
      browser: getBrowserDimensions(),
      device: getDeviceDimensions(),
      url: window.location.href,
      referrer: document.referrer,
    };

    const { ok, data } = await sendEvent('pageview', payload);
    if (ok && data) {
      if (data.user_id) session.user_id = data.user_id;
      if (data.event_id) session.event_id = data.event_id;
    }
  }

  // ---- Send scroll event ----
  async function sendScrollEvent() {
    const now = Date.now();
    // Throttle scroll events to max once per 500ms
    if (now - lastScrollTime < 500) return;
    lastScrollTime = now;

    try {
      const payload = {
        scrollPosition: window?.scrollY || 0,
        browser: getBrowserDimensions(),
        device: getDeviceDimensions(),
      };
      await sendEvent('scroll', payload);
      console.log('Scroll event sent:', payload.scrollPosition);
    } catch (err) {
      console.error('Scroll event error:', err);
    }
  }

  // ---- Send click event ----
  function getElementUrl(el) {
    if (!el) return null;

    if (el.tagName === 'A' && el.href) return el.href;
    if (el.tagName === 'BUTTON' && el.formAction) return el.formAction;
    if (el.tagName === 'BUTTON' && el.getAttribute('data-url'))
      return el.getAttribute('data-url');

    // Manual fallback for closest()
    let parent = el.parentNode;
    while (parent) {
      const tag = parent.tagName;
      if (tag === 'A' && parent.href) return parent.href;
      if (tag === 'BUTTON' && parent.formAction) return parent.formAction;
      if (tag === 'BUTTON' && parent.getAttribute('data-url'))
        return parent.getAttribute('data-url');
      parent = parent.parentNode;
    }

    return null;
  }

  async function sendClickEvent(event) {
    try {
      const clickedEl = event?.target;
      const payload = {
        browser: getBrowserDimensions(),
        device: getDeviceDimensions(),
        element: {
          tag: clickedEl?.tagName?.toLowerCase() || null,
          url: getElementUrl(clickedEl) || null,
          position: {
            x: event?.pageX || 0,
            y: event?.pageY || 0,
          },
        },
      };
      await sendEvent('click', payload);
      console.log('Click event sent:', payload.element);
    } catch (err) {
      console.error('Click event error:', err);
    }
  }

  // ---- Send price event ----
  async function sendPriceEvent(data) {
    if (!isPriced) {
      try {
        await sendEvent('price', data);
        isPriced = true;
      } catch (err) {
        console.log(err);
      }
    }
  }

  // ---- Remote Enable Check ----
  async function isPillEnabled() {
    try {
      const res = await fetch(`${ENABLE_API}?dt=${Date.now()}`);
      const data = await res.json();
      return data.showWidget === true;
    } catch (err) {
      console.error('Enable API error:', err);
      return false;
    }
  }

  // ---- Price Fetching ----
  async function fetchAndDisplayPrice() {
    const articleUrl = signalDiv?.getAttribute('data-url');
    if (!articleUrl) {
      console.warn('No data-url attribute found');
      return;
    }

    try {
      const res = await fetch(`${PRICE_API}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [articleUrl], currency: 'inr' }),
      });

      const data = await res.json();
      const priceData = data[articleUrl];

      if (!priceData || isNaN(priceData.qap)) {
        signalDiv.classList.add('hidden');
        widgetVisible = false;
        return;
      }

      const price = priceData.qap.toFixed(2);

      // Send price event
      sendPriceEvent({
        url: articleUrl,
        qap: priceData.qap,
        price: priceData.price,
        currency: 'inr',
      });

      // Update DOM
      const priceEl = document.getElementById('zzazz-price');
      const trendElUp = document.getElementById('zzazz-trend-up');
      const trendElDown = document.getElementById('zzazz-trend-down');

      if (priceEl && priceEl.firstChild) {
        priceEl.firstChild.textContent = `${price} `;
      }

      // Show widget if hidden
      if (!widgetVisible) {
        signalDiv.classList.remove('hidden');
        widgetVisible = true;
      }

      // Update trend indicators
      if (lastPrice !== null && trendElUp && trendElDown) {
        trendElUp.style.display = price >= lastPrice ? 'flex' : 'none';
        trendElDown.style.display = price < lastPrice ? 'flex' : 'none';
      }

      lastPrice = price;
    } catch (err) {
      console.error('Price fetch error:', err);
      signalDiv?.classList.add('hidden');
    }
  }

  // ---- Manual Polling (AMP-compatible way) ----
  async function startPricePolling() {
    await fetchAndDisplayPrice();

    // Poll every 3 seconds (recursive setTimeout instead of setInterval)
    function poll() {
      fetchAndDisplayPrice().finally(() => {
        setTimeout(poll, 3000);
      });
    }

    setTimeout(poll, 3000);
  }

  // ---- Event Listeners (Try to attach) ----
  // const debouncedScroll = debounce(sendScrollEvent, 500);
  const debouncedClick = debounce(sendClickEvent, 300);

  try {
    // Try to attach scroll listener
    // window.addEventListener('scroll', debouncedScroll, { passive: true });
    console.log('Scroll listener attached');
  } catch (err) {
    console.warn('Could not attach scroll listener:', err);
  }

  try {
    // Try to attach click listener
    window.addEventListener('click', debouncedClick, { passive: true });
    console.log('Click listener attached');
  } catch (err) {
    console.warn('Could not attach click listener:', err);
  }

  // ---- Bootstrap ----
  try {
    const enabled = await isPillEnabled();
    if (!enabled) {
      console.warn('Price pill disabled remotely.');
      signalDiv?.classList.add('hidden');
      return;
    }

    console.log('Price pill enabled by remote rules.');

    // Send initial pageview
    await sendPageViewEvent();

    // Start price polling
    await startPricePolling();
  } catch (err) {
    console.error('Bootstrap error:', err);
    signalDiv?.classList.add('hidden');
  }
})();
