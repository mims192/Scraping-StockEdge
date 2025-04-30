import { scrapeDividendInfo } from "./corp_action.js";
import scrape from "./daily.js";
import feed from "./feed.js";
import scrapeFPI from "./FPI_activity.js";
import scrapeMonthly2 from "./Monthly2.js";
import scrapeMonthly from "./Monthlydelivery.js";
import news from "./news.js";

import { getStocksFromCSV } from './stocklist.js';
const stocks = await getStocksFromCSV();

async function runScrapersSequentially() {
  try {
    await scrape(stocks);           
    await news(stocks);                
    await scrapeMonthly(stocks);      
    await scrapeDividendInfo(stocks);  
    await scrapeMonthly2(stocks);     
    await scrapeFPI(stocks);          
    await feed(stocks);                
    console.log(" All scrapers completed.");
  } catch (err) {
    console.error(" Error running scrapers:", err);
  }
}

runScrapersSequentially();
