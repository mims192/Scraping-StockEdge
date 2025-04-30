import { scrapeDividendInfo } from "./corp_action.js";
import scrape from "./daily.js";
import feed from "./feed.js";
import scrapeFPI from "./FPI_activity.js";
import scrapeMonthly from "./monthly.js";
import scrapeMonthly2 from "./Monthly2.js";
import news from "./news.js";

scrape();
news();
scrapeMonthly();
scrapeDividendInfo();
scrapeMonthly2();
scrapeFPI();
feed();