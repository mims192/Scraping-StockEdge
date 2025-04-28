import puppeteer from 'puppeteer';
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const scrape=async()=>{
  const browser=await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process'
    ]
  })
  const page=await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'accept-language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  });
  
  try{
    await page.goto('https://web.stockedge.com/fii-activity?section=fpi-sectoral-activity&asset-type=equity', {
        waitUntil: 'networkidle2',
        timeout: 180000
      });
    const dates= await page.evaluate(()=>{
        const dateElements = document.querySelectorAll('se-date-label > ion-text');
        return Array.from(dateElements).map(el => el.textContent.trim());
    })
    
    console.log("Dates:" ,dates)
    const companiesData = await page.evaluate(() => {
        const rows = document.querySelectorAll('ion-item');
        const data = [];
        rows.forEach(row => {
            const CompanyName = row.querySelector('ion-text.ion-accordion-toggle-icon.normal-font.md')?.innerText.trim();
            //const prices = Array.from(row.querySelectorAll('ion-text.ion-color.ion-color-se-grey.md')).map(el => el.innerText.trim());
            const finalPrice = row.querySelector('ion-text.font-weight-medium.ion-color.ion-color-se.md')?.innerText.trim();
    
            if (CompanyName) {
                data.push({
                    company: CompanyName,
                    //prices: prices,
                    finalPrice: finalPrice
                });
            }
        });
        return data;
    })
    

    console.log('Company Rows:', companiesData);

    companiesData.forEach(comp => {
        console.log(`\n${comp.company}:`);
        /*comp.prices.forEach((val, idx) => {
          console.log(`${dates[idx]}: ${val}`);
        });*/
        console.log(`${dates[dates.length - 1]}: ${comp.finalPrice}`);

      });


  }catch{
    console.log("failed to  extract");
  }


}
scrape();