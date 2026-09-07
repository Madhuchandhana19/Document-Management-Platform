const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER_CONSOLE_ERROR:', msg.text());
    } else {
      console.log('BROWSER_CONSOLE:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('BROWSER_PAGE_ERROR:', err.toString());
  });

  page.on('requestfailed', request => {
    console.log('BROWSER_REQUEST_FAILED:', request.url(), request.failure().errorText);
  });

  try {
    await page.goto('http://localhost:8443/', { waitUntil: 'networkidle0' });
    
    // Log in if we are redirected to login page
    if (page.url().includes('login') || (await page.$('input[type="email"]'))) {
        console.log('Logging in...');
        await page.type('input[type="email"]', 'admin@dms.com');
        await page.type('input[type="password"]', 'Password123!');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }
    
    console.log('Current URL:', page.url());
    
    // Go to Notifications
    await page.goto('http://localhost:8443/notifications', { waitUntil: 'networkidle0' });
    
    // Check if there are any error overlays in the DOM
    const viteError = await page.evaluate(() => {
        const overlay = document.querySelector('vite-error-overlay');
        return overlay ? overlay.shadowRoot.innerHTML : null;
    });
    if (viteError) {
        console.log('VITE ERROR OVERLAY:', viteError);
    }

  } catch (err) {
    console.log('SCRIPT_ERROR:', err);
  } finally {
    await browser.close();
  }
})();
