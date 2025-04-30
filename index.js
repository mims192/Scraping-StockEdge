import { scrapeDividendInfo } from "./corp_action.js";
import scrape from "./daily.js";
import feed from "./feed.js";
import scrapeFPI from "./FPI_activity.js";
import scrapeMonthly2 from "./Monthly2.js";
import scrapeMonthly from "./Monthlydelivery.js";
import news from "./news.js";

async function runScrapersSequentially() {
  try {
    await scrape();           
    await news();                
    await scrapeMonthly();      
    await scrapeDividendInfo();  
    await scrapeMonthly2();     
    await scrapeFPI();          
    await feed();                
    console.log(" All scrapers completed.");
  } catch (err) {
    console.error(" Error running scrapers:", err);
  }
}

runScrapersSequentially();
