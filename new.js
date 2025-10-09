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
    mode: 'no-cors',
  };

  // call api
  fetch('https://v.zzazz.com/v2/price', requestOptions)
    .then((response) => response.json())
    .then((data) => {
      for (let url in data) {
        const ourDiv = document.getElementById(url);
        ourDiv.innerHTML = `<h2 style="color: blue; margin: 10px">Price: ₹${data[url].price}</h2>`;
      }
    });
};

// poll this function so that the price updates after every 2 seconds
setInterval(() => {
  injectPrice();
}, 1000);

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
