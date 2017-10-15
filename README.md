

**To start:**
- `git clone git@github.com:sfbrigade/sr-shelter-sync.git`
- `cd sr-shelter-sync`
- `npm install` OR `npm install -g` if you want to run as shell script

**Before running:**
- You must get a client_secret file from Google. Follow the directions in Step 1 here: https://developers.google.com/sheets/api/quickstart/nodejs
- Following these results in a downloaded file you'll save as `client_secret.json` in the root folder

**Run as:**
- `node index.js -p <password> -u <username> -t <token>` 
- OR `srsync -p <password> -u <username> -t <token>` if running as global shell script

Where
- -p Socrata Password
- -u Socrata User
- -t Socrata Token

**On first run:**
- Google needs to run through OAuth
- Command line will prompt you to put a link in your browser
- You'll authorize a google user that has access to the target spreadsheet
- You'll copy the code from the browser into the command line
- The script stores the token in ~/.credentials/sheets.googleapis.com-santa-rosa-map.json
- The next time it runs, it will use the stored token file


