#!/usr/bin/env node

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var soda = require('soda-js');
var program = require('commander');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-santa-rosa-map.json';

program
  .version('0.0.1')
  .option('-p, --password <password>', 'Socrata password')
  .option('-u, --username <username>', 'Socrata username')
  .option('-t, --token <token>', 'Socrata token')
  .parse(process.argv);

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Sheets API.
  authorize(JSON.parse(content), syncSheets);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize (credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken (oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken (token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function syncSheets (auth) {
  var sheets = [{ 
      spreadsheetId: '1fOLC3oZBekNU4W0a1H4KB-EyCdxy-oBtIxC2sekeZVE',
      range: 'Form Responses!A1:U'
    }, {
      spreadsheetId: '1acM40tNCbPYQa2rcOPCpbbTM_E-4rbDsQZuVbssTWcU',
      range: 'Available Homes!A1:M'
    }];

  var destinations = ['swcq-c9ux', 'x5wj-re9i'];
  var sodaOptions = {
    username: program.username,
    password: program.password,
    token: program.token
  }
  for (var i=0; i < sheets.length; i++) {
    var sheetOptions = sheets[i];
    sheetOptions['auth'] = auth;
    sodaOptions['destinationId'] = destinations[i];
    syncData(auth, sheetOptions, sodaOptions);
  }
}

/**
 * 
 * @param {String} auth 
 * @param {Object} sheetOptions
 * @param {Object} sodaOptions
 */

 function syncData (auth, sheetOptions, sodaOptions) {
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.get(sheetOptions, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var rows = response.values;
    if (rows.length == 0) {
      console.log('No data found.');
    } else {
      var keys = generateKeys(rows[0])
      var data = []
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i]
        var json = {}
        for (var j = 0; j < row.length; j++) {
          var value = row[j]
          json[keys[j]] = value
        }
        // if no status field, push data, if status field, only push if approved
        if(typeof json['status'] === 'undefined') { 
          data.push(json); 
        } else if(json['status'] === 'Approved') {
          data.push(json);
        }
      }
      syncToSocrata(data, sodaOptions)
    }
  });
 }

 /**
  * Turn google values array into api safe keys
  *
  * @param {Array} headers array of values to return as api safe keys
  */

 function generateKeys (headers) {
   var keys = [];
   for (var i = 0; i < headers.length; i++) {
     var header = headers[i];
     keys.push(stringToKey(header))
   }
   return keys
 }

 /**
  * 
  * @param {String} str Text to turn into api key
  */

 function stringToKey (str) {
  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  var from = "àáäâèéëêìíïîòóöôùúüûñç·/-,:;";
  var to   = "aaaaeeeeiiiioooouuuunc_______";
  for (var i=0, l=from.length ; i<l ; i++) {
      str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str.replace(/[^a-z0-9 _\/]/g, '') // remove invalid chars
      .replace(/\s+/g, '_') // collapse whitespace and replace by _
      .replace(/_+/g, '_'); // collapse underscores

  return str;
 }

 /**
  * 
  * @param {Array} json Array of json objects to send to socrata
  */

 function syncToSocrata (json, sodaOptions) {
   var producer = new soda.Producer('srrt.demo.socrata.com', sodaOptions);

   producer.operation()
    .withDataset(sodaOptions['destinationId'])
    .truncate()

  producer.operation()
    .withDataset(sodaOptions.destinationId)
    .upsert(json)
 }