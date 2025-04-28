import puppeteer from 'puppeteer';
import { getStocksFromCSV } from './stocklist.js';

const stocks = await getStocksFromCSV();

async function scrapeStockFeeds() {
  console.log('Starting browser...');
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

  try {
    // Navigate to the initial page first
    console.log('Navigating to initial page...');
    await page.goto('https://web.stockedge.com/share/dr-lal-pathlabs/15890?section=feeds', {
      waitUntil: 'networkidle2',
      timeout: 180000
    });

    // Wait for the page to be fully loaded
    await delay(5000);

    const allResults = [];

    // Process each stock one by one
    for (const stock of stocks) {
      try {
        console.log(`🔍 Searching for stock: ${stock}`);
        
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
          console.log(`⚠️ No matching stock found for: ${stock}`);
          continue;
        }
        
        console.log(`✅ Clicked on stock: ${clickedResult}`);

        // Wait for navigation to complete - longer timeout
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        await delay(8000);
        
        // Get the current URL
        const currentUrl = page.url();
        console.log(`📌 Navigated to: ${currentUrl}`);
        
        // Check if we're on the feeds page, if not, add the section parameter
        if (!currentUrl.includes('section=feeds')) {
          const feedsUrl = `${currentUrl.split('?')[0]}?section=feeds`;
          console.log(`🔄 Navigating to feeds section: ${feedsUrl}`);
          await page.goto(feedsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          await delay(5000);
        }

        // Wait for feed items to load
        console.log('Waiting for feed items to load...');
        try {
          await page.waitForSelector('ion-item.item', { timeout: 20000 });
        } catch (e) {
          console.log("⚠️ Could not find feed items, trying to continue anyway");
        }

        // Extract feed information using the original logic
        console.log('Extracting feed data...');
        const feedItems = await page.evaluate(() => {
          const results = [];
          
          const listItems = document.querySelectorAll('ion-item.item');
          
          listItems.forEach(item => {
            const dateElement = item.querySelector('ion-text');
            const date = dateElement ? dateElement.textContent.trim() : null;
            
            const contentElement = item.querySelector('p');
            const content = contentElement ? contentElement.textContent.trim() : null;
            
            // Create an object with the extracted data
            if (date || content) {
              results.push({
                date,
                content
              });
            }
          });
          
          return results;
        });

        console.log(`📊 Scraped ${feedItems.length} feed items for ${stock}`);
        allResults.push({ stock, feedItems });
        await delay(2000); // wait before next search
        
      } catch (error) {
        console.log(`❌ Failed to extract feed data for ${stock}:`, error.message);
        // Continue with the next stock even if this one fails
      }
    }

    console.log("📑 All feed data collected");
    console.log(JSON.stringify(allResults, null, 2));
    
    return allResults;
  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    console.log("⏳ Waiting 10 seconds before closing the browser...");
    await delay(10000); // Wait for 10 seconds before closing
    
    await browser.close();
    console.log('Browser closed.');
  }
}

// Execute the scraping
async function main() {
  try {
    const scrapedData = await scrapeStockFeeds();
    console.log('Scraped data:');
    console.log(JSON.stringify(scrapedData, null, 2));
  } catch (error) {
    console.error('Scraping failed:', error);
  }
}

main();