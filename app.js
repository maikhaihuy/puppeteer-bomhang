const puppeteer = require('puppeteer');
const { parseAsync } = require('json2csv');
const moment = require('moment');
var fs = require('fs');

// GLOBAL VARIABLE
const BASE_URL = 'https://bomhang.club';
const generalBoomerList = [];
const appendBoomerList = (boomerList) => {
  generalBoomerList.push(...boomerList);
};
const getGeneralBoomerList = () => generalBoomerList;
// ------------------


// ------------------
// HELPERS
// ------------------
const getNextPageUrl = async (baseUrl, page) => {
  const nextPathname = await page.evaluate(() => {
    const activePage = document.querySelector("ul.pagination > li.active");
    const nextPage = document.querySelector("ul.pagination > li:last-of-type");

    // If active page is the last page, then no more next page
    if (activePage.innerText === nextPage.innerText) return null;

    return nextPage.querySelector('a').getAttribute('href');
  });

  return nextPathname
    ? `${baseUrl}${nextPathname}`
    : null;
};

const getBoomerList = async (page) => {
  const articles = await page.evaluate(() => {
    let elements = document.querySelectorAll('table > tbody > tr');
    let boomerList = [];
    elements.forEach(item => {
      boomerList.push({
        phone: item.getElementsByTagName('td')[0].innerText,
        name: item.getElementsByTagName('td')[1].innerText,
        address: item.getElementsByTagName('td')[2].innerText,
      })
    });
    return boomerList
  });

  return articles;
};

const downloadCSV = async () => {
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
  const options = { fields, header: false };

  // Parsing
  console.log('Write csv to file ...');
  const generalBoomerList = getGeneralBoomerList();
  const csvData = await parseAsync(generalBoomerList, options);
  const date = moment();
  const fileName = `blacklist_${date.format('DDMMYYYY')}_${date.valueOf()}.csv`;

  await fs.writeFile(fileName, csvData, 'utf8', (err) => {
    if (err) {
      console.log('Failed to write csv file: ', err);
    } else {
      console.log('Write file successfully');
    }
  });
};

const crawlBoomerListByPage = async (url, idx = 0) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    console.log('\n------------------\n')
    console.log('URL: ', url);
    await page.goto(url);
    console.log('Visit done: ', url);

    // Retrieve bomer list on current page
    const boomerList = await getBoomerList(page);
    console.log('Get boomer list success: ', boomerList.length);

    // Append to general list
    appendBoomerList(boomerList);

    // Retrieve the next page
    const nextUrl = await getNextPageUrl(BASE_URL, page);

    // Closing browser when no more usages
    // Just to make sure current browser is closed before starting a new one below
    await browser.close();
    console.log('Closing browser successfully');

    // Whether start to crawl a new page or export current data to csv
    if (nextUrl) {
      // Range: 2s -> 5s
      const randomTime = 2000 + Math.floor(3000 * Math.random());
      console.log('Wait time until next page: ', randomTime / 1000, 's');
      setTimeout(() => {
        crawlBoomerListByPage(nextUrl, idx + 1);
      }, randomTime);

      // In period of 50, save a temporary blacklist
      // prevent loosing everything when error occurred
      if (idx > 0 && idx % 50 === 0) {
        await downloadCSV(generalBoomerList);
      }
    } else {
      // If no more data to crawl, let export data to a csv file
      await downloadCSV(generalBoomerList);
    }
  } catch (e) {
    console.log('Failed to fetch data from bomhang: ', e);
  }
};


// ------------------
// MAIN
// ------------------
crawlBoomerListByPage(BASE_URL);