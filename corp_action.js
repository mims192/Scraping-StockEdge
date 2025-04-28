import puppeteer from 'puppeteer';

import { getStocksFromCSV } from './stocklist.js';

const stocks = await getStocksFromCSV();

async function scrapeDividendInfo() {
  const browser = await puppeteer.launch({
    headless: false,
    protocolTimeout: 180000,
    defaultViewport: null,
    timeout: 0,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process'
    ]
  });
  
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const page = await browser.newPage();
  
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  );
  
  await page.setExtraHTTPHeaders({
    'accept-language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  });

  // Navigate to the initial page first
  await page.goto('https://web.stockedge.com/share/dr-lal-pathlabs/15890?section=corp-actions', {
    waitUntil: 'networkidle2',
    timeout: 180000
  });

  // Wait for the page to be fully loaded
  await delay(5000);

  const allResults = [];

  // Process each stock one by one
  for (const stock of stocks) {
    try {
      console.log(`Searching for stock: ${stock}`);
      
      // Wait for the page to be completely loaded
      await delay(3000);
      
      // Click on the search bar
      await page.waitForSelector('input.searchbar-input', { timeout: 15000 });
      await page.click('input.searchbar-input');
      await delay(1000);
      
      // Clear any existing search text
      await page.evaluate(() => {
        document.querySelector('input.searchbar-input').value = '';
      });
      await delay(1000);
      
      // Type the stock name slowly with delay between keys
      for (const char of stock) {
        await page.type('input.searchbar-input', char, { delay: 100 });
      }
      
      // Wait longer for search results to appear and stabilize
      await delay(3000);
      await page.waitForSelector('ion-item[button]', { timeout: 15000 });
      await delay(2000);
      
      // Click on the first stock result
      const clickedResult = await page.evaluate(() => {
        const stockItems = Array.from(document.querySelectorAll('ion-item[button]'));
        for (const item of stockItems) {
          const labelText = item.querySelector('ion-label').textContent;
          const chipText = item.querySelector('ion-chip ion-label')?.textContent || '';
          
          if (chipText.includes('Stock')) {
            console.log(`Found stock result: ${labelText}`);
            item.click();
            return labelText;
          }
        }
        return null;
      });
      
      if (!clickedResult) {
        console.log(`No matching stock found for: ${stock}`);
        continue;
      }
      
      console.log(`Clicked on stock: ${clickedResult}`);

      // Wait for navigation to complete - longer timeout
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      await delay(8000);
      
      // Get the current URL
      const currentUrl = page.url();
      console.log(` Navigated to: ${currentUrl}`);
      
      // Check if we're on the corp-actions page, if not, add the section parameter
      if (!currentUrl.includes('section=corp-actions')) {
        const corpActionsUrl = `${currentUrl.split('?')[0]}?section=corp-actions`;
        console.log(`Navigating to corporate actions: ${corpActionsUrl}`);
        await page.goto(corpActionsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(5000);
      }

      // Wait for dividend data to load
      try {
        await page.waitForSelector('ion-item[se-item]', { timeout: 20000 });
      } catch (e) {
        console.log("Could not find dividend information, trying to continue anyway");
      }

      // Extract dividend information
      const dividendData = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('ion-item[se-item]'));
        
        return items.map(item => {
          const rows = item.querySelectorAll('ion-grid ion-row');
          const dividendInfo = {};
          
          rows.forEach(row => {
            const text = row.textContent.trim();
            
            if (text.includes('Ex-Date')) {
              const dateElement = row.querySelector('se-date-label ion-text');
              dividendInfo.exDate = dateElement ? dateElement.textContent.trim() : null;
            } else if (text.includes('Record-Date')) {
              const dateElement = row.querySelector('se-date-label ion-text');
              dividendInfo.recordDate = dateElement ? dateElement.textContent.trim() : null;
            } else if (text.includes('Dividend')) {
              dividendInfo.dividendDetails = text.trim();
            }
          });
          
          return dividendInfo;
        });
      });

      // Clean and parse dividend data
      const parsedDividendData = dividendData.map(item => {
        const text = item.dividendDetails || '';
        
        const datePattern = /(\d{2}\s+[A-Za-z]{3}\s+\d{4})/g;
        const dates = text.match(datePattern) || [];
        
        const dividendPattern = /((?:Interim |Final )?Dividend \d+% @ Rs\. \d+(\.\d+)? per share)/;
        const dividendMatch = text.match(dividendPattern);
        
        return {
          exDate: item.exDate || dates[0] || null,
          recordDate: item.recordDate || dates[1] || null,
          dividendDetails: dividendMatch ? dividendMatch[1] : item.dividendDetails || null
        };
      });
      
      console.log(` Dividend Results for ${stock}:`, parsedDividendData);
      allResults.push({ stock, dividendData: parsedDividendData });
      await delay(2000); // wait before next search
      
    } catch (error) {
      console.log(`Failed to extract data for ${stock}:`, error.message);
      // Continue with the next stock even if this one fails
    }
  }

  console.log("All dividend results:", JSON.stringify(allResults, null, 2));
  console.log(" Waiting 10 seconds before closing the browser...");
  await delay(10000); // Wait for 10 seconds before closing
  
  await browser.close();
  return allResults;
}

// Execute the scraping function
scrapeDividendInfo().then(results => {
  console.log("✅ Scraping completed.");
});