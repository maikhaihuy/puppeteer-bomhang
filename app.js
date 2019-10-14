const puppeteer = require('puppeteer');
const { parseAsync } = require('json2csv');
const moment  = require('moment');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const baseUrl = 'https://bomhang.club/';
  let urls = [baseUrl];
  let promises = [];

  // loop on url
  for(let i = 0; i < urls.length && i < 2; i++)
  {
    // random timeout
    let pTimeout = Math.floor(Math.random() * 10) + 2;
    let sTimeout = Math.floor(Math.random() * 1000000) + 1;
    let timeout = pTimeout*1000000 + sTimeout;
    console.log('timeout: ' + timeout);
    console.log('cur url: ' + urls[i]);
    
    try {
      await page.goto(urls[i], {
        timeout: timeout
      });
      await page.waitFor(2000);

      // add next page?
      urls.push(await pushNextPage(baseUrl, page))
      // get info
      
      let aa = await getBher(page, i);
      promises.push.apply(promises, aa);
      
    } catch (error) {
        console.log("Catch : " + error);
    }
  }
  // export csv
  await downloadCSV(promises);

  async function pushNextPage(baseUrl, page)
  {
    const url = await page.evaluate(() => {
      let activePage = document.querySelectorAll("ul.pagination > li.active");
      let nextPage = document.querySelectorAll("ul.pagination > li")[document.querySelectorAll("ul.pagination > li").length - 1];
      if (activePage.innerText === nextPage.innerText)
      {
        return null;
      }
      return nextPage.querySelector('a').getAttribute('href');
    });
    console.log('next url: ' + baseUrl + url);
    return baseUrl + url;
  }

  async function getBher(page, key) {
    const articles = await page.evaluate(() => {
      let elements = document.querySelectorAll('table > tbody > tr');
      let bhers = [];
      elements.forEach(item => {
        bhers.push({
            name: item.getElementsByTagName('td')[0].innerText,
            phone: item.getElementsByTagName('td')[1].innerText,
            address: item.getElementsByTagName('td')[2].innerText,
        })
      });
      return bhers
    });
    console.log(key);
    return articles;
  }
  
  async function downloadCSV(data) {
    // CSV Parser config
    const fields = [
      {
        label: 'Phone',
        value: 'phone',
      },
      {
        label: 'Name',
        value: 'name',
      },
      {
        label: 'Address',
        value: 'address',
      },
    ];
    const options = {fields};

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Parsing
    const csvData = await parseAsync(data, options);
    const date = moment();
    const fileName = `bxh_${date.format('DDMMYYYY')}_${date.valueOf()}.csv`;
    const csv = `data:text/csv;charset=utf-8,${csvData}`;
    const encodedCSV = encodeURI(csv);

    await page._client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      // This path must match the WORKSPACE_DIR in Step 1
      downloadPath: '/home/browserless',
    });

    const res = await page.evaluate((encodedCSV, fileName) => {
      const link = document.createElement("a");
      link.setAttribute("href", encodedCSV);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      console.log(fileName);
      return link.click();
    }, encodedCSV, fileName);
    console.log(res);
  };
  await browser.close();
})();