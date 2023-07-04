var express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
var router = express.Router();
var {Post}= require("../models/post")
var {Donation}= require("../models/donation")

const config=require("config");
const stripe = require('stripe')(config.get("STRIPE_SECRET_KEY"));
const https = require('https');
const NodeCache = require('node-cache');
const puppeteer = require('puppeteer');
const request = require('request');
const ejs = require('ejs');
const cookieParser = require('cookie-parser');
// ...
const app=express()
// Add cookie-parser middleware
app.use(cookieParser());


function getUserLocation(ipAddress, callback) {

  const apiUrl = `http://api.ipstack.com/${ipAddress}?access_key=53af1a23e6d7a40870e99c98d0383e6`;

  axios
    .get(apiUrl)
    .then(response => {
      const { country_name, region, city, latitude, longitude } = response.data;
      const location = {
        country: country_name,
        region: region,
        city: city,
        latitude: latitude,
        longitude: longitude
      };
      callback(null, location);
    })
    .catch(error => {
      callback(error, null);
    });
}



// Function to scrape data
async function scrapeData() {
  try {
    const url = 'https://reliefweb.int/report/pakistan/wfp-pakistan-situation-report-12-september-2022#:~:text=33%20million%20people%20are%20affected,million%20people%20require%20immediate%20assistance.';
    const response = await axios.get(url);

    // Load the HTML content into Cheerio
    const $ = cheerio.load(response.data);

    // Find the div containing the desired information
    const divContent = $('.rw-report__content');

    // Find the paragraph containing the deaths and injuries information
    const paragraph = divContent.find('p:contains("At least")');

    // Extract the died and injured numbers using a regular expression pattern
    const regexDeathsInjuries = /At least (\d+(?:,\d+)*) people have died, and (\d+(?:,\d+)*) have been injured/g;
    const matchesDeathsInjuries = regexDeathsInjuries.exec(paragraph.text());

    // Extract the died and injured numbers from the matches array
    const died = parseInt(matchesDeathsInjuries[1].replace(/,/g, ''));
    const injured = parseInt(matchesDeathsInjuries[2].replace(/,/g, ''));

    // Find the paragraph containing the livestock losses information
    const paragraphLivestock = divContent.find('p:contains("reported livestock losses amount to nearly")');

    // Extract the livestock losses number using a regular expression pattern
    const regexLivestockLosses = /reported livestock losses amount to nearly (\d+(?:,\d+)*)/g;
    const matchesLivestockLosses = regexLivestockLosses.exec(paragraphLivestock.text());

    // Extract the livestock losses number from the matches array
    const livestockLosses = parseInt(matchesLivestockLosses[1].replace(/,/g, ''));

    // Return the extracted numbers
    return { died, injured, livestockLosses };
  } catch (error) {
    console.error('Error scraping data:', error);
  }
}



router.get('/', async function(req, res, next) {
  try {
    Post.find().sort({ date: 'desc' }).limit(4).exec((err, posts) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error retrieving posts');
      }
      
      

      res.render('index', { title: 'Fund For Hope', posts: posts});

    });
  } catch (error) {
    console.error('Error retrieving IP address:', error);
    res.status(500).send(error);
  }
});

router.get('/floodcampaign', async function(req, res, next) {
  try {
    Post.find({ type: 'Flood post' }) // Add filter condition for type 'Flood'
      .sort({ date: 'desc' })
      .limit(4)
      .exec((err, posts) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Error retrieving posts');
        }

        scrapeData()
          .then((result) => {
            console.log('Died:', result.died);
            console.log('Injured:', result.injured);
            console.log('Livestock Losses:', result.livestockLosses);

            let died = result.died;
            let injured = result.injured;
            let liveStockLoses = result.livestockLosses;

            res.render('floodcampaign', {
              title: 'Flood Campaign',
              posts: posts,
              died,
              injured,
              liveStockLoses
            });
          })
          .catch((error) => {
            console.error('Error:', error);
          });
      });
  } catch (error) {
    console.error('Error retrieving IP address:', error);
    res.status(500).send(error);
  }
});



router.get('/earthquakecampaign', async function(req, res, next) {
  try {
    Post.find({ type: 'Earthquake post' }) // Add filter condition for type 'EQ'
      .sort({ date: 'desc' })
      .limit(4)
      .exec((err, posts) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Error retrieving posts');
        }

       res.render('earthquakecampaign', { title: 'Earthquake Campaign', posts: posts});
      });
  } catch (error) {
    console.error('Error retrieving IP address:', error);
    res.status(500).send(error);
  }
});


//get donation page
router.get('/donation', function(req, res, next) {
  console.log(req.session.user)
  res.render('donation', { title: 'Fund For Hope' });
});

//get flood donation page
router.get('/flooddonation', function(req, res, next) {
  console.log(req.session.user)
  res.render('flooddonation', { title: 'Fund For Hope' });
});

//get eq donation page
router.get('/earthquakedonation', function(req, res, next) {
  console.log(req.session.user)
  res.render('earthquakedonation', { title: 'Fund For Hope' });
});

//get water donation page
router.get('/waterplantdonation', function(req, res, next) {
  console.log(req.session.user)
  res.render('waterplantdonation', { title: 'Fund For Hope' });
});



//
router.get('/donation/payment/:amount',async (req, res) => {
  const amount = req.params.amount;




  // Set the amount value in a cookie
  res.cookie('paymentAmount', amount);


  let paymentAmount = req.cookies.paymentAmount; 
  let emailAddress = req.cookies.paymentEmail; 
  let name = req.cookies.paymentName; 

  if(!emailAddress){
    emailAddress="hafizusama747@gmail.com"
  }
  if(!name){
    name="Hafiz Muhammad Usama"
  }

  console.log(paymentAmount)
  console.log(emailAddress)

  console.log(name)

  const donation = new Donation({
    amount: paymentAmount,
    email: emailAddress,
    name: name,
  });

  await donation.save();



  res.render('payment');
});


router.post('/create-payment-intent', async (req, res) => {
  try {
    const paymentAmount = req.cookies.paymentAmount; 
    const emailAddress = req.cookies.paymentEmail; 
    

    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(paymentAmount) * 100, 
      currency: 'usd',
      receipt_email: emailAddress
    });

    res.send({ clientSecret: paymentIntent.client_secret });
    
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Unable to create payment intent.' });
  }
});


router.get('donation/payment/success', async (req, res) => {
  console.log("here")

  res.render(paymentsuccess);
});

const agent = new https.Agent({ rejectUnauthorized: false });

// Create a custom Axios instance with the agent
const httpClient = axios.create({
  httpsAgent: agent
});

// Create a new cache instance
const cache = new NodeCache();


// Function to make a request to the slow-loading site with caching
async function makeCachedRequest(url) {
  // Check if the response is already cached
  const cachedResponse = cache.get(url);
  if (cachedResponse) {
    console.log('Serving from cache:', url);
    return cachedResponse;
  }

  // Make the actual request to the slow-loading site
  const response = await httpClient.get(url);

  // Store the response in the cache
  cache.set(url, response.data);

  return response.data;
}




async function scrapeHTML(url, tableId) {
  try {
    const browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Wait for the table to become visible
    await page.waitForSelector(`table#${tableId}`, { visible: true, timeout: 90000 });

    const tableHTML = await page.$eval(`table#${tableId}`, (element) => element.outerHTML);

    await browser.close();

    return tableHTML;
  } catch (error) {
    console.error('Error scraping HTML:', error);
    throw error;
  }
}



router.get('/floodguide', async (req, res) => {
 res.render("newspost copy")
});

router.get('/aboutus', function(req, res, next) {
  res.render('aboutus',{ title: 'About Us' });
});

module.exports = router;