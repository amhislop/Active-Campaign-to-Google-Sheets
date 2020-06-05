const fs = require('fs').promises;
const readline = require('readline');
const { promisify } = require('util');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';

class GoogleSheets {
  client_id;

  client_secret;

  project_id;

  redirect_uris = [];

  spreadsheetId = '';

  constructor(client_id, client_secret, project_id, spreadsheet_id) {
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.project_id = project_id;
    this.redirect_uris = ['urn:ietf:wg:oauth:2.0:oob', 'http://localhost'];
    this.spreadsheetId = spreadsheet_id;
  }

  /**
   * @todo update sheet name
   */
  async read(path = {}, callback, options = {}) {
    // set defaults
    if (!path.spreadsheetId) path.spreadsheetId = this.spreadsheetId;
    if (!path.range) path.range = 'A:Z';

    try {
      const oAuth = await this.authenticate();
      const ids = await this.listCampaignIds(oAuth, path, callback);
      console.log(ids);
      console.log('getting ids');
      return ids;
    } catch (err) {
      console.error('Read had an error: ', err);
    }
  }

  async write(data) {}

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authenticated client.
   */
  async authenticate() {
    const { client_secret, client_id, redirect_uris } = this;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Check if we have previously stored a token.
    try {
      const token = await fs.readFile(TOKEN_PATH);
      oAuth2Client.setCredentials(JSON.parse(token));
      return oAuth2Client;
      // return true;
    } catch (err) {
      const token = await this.getNewToken(oAuth2Client);
      oAuth2Client.setCredentials(token);

      await fs.writeFile(TOKEN_PATH, JSON.stringify(token));
      console.log('Token stored to', TOKEN_PATH);

      return oAuth2Client;
    }
  }

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authenticated OAuth2 client.
   * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
   */
  async getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('authenticate this app by visiting this url:', authUrl);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Prepare functions for async
    rl.question[promisify.custom] = (question) =>
      new Promise((resolve) => {
        rl.question(question, resolve);
      });

    const code = await promisify(rl.question)(
      'Enter the code from that page here: '
    );
    rl.close();

    try {
      const res = await oAuth2Client.getToken(code);
      return res.tokens;
    } catch (err) {
      return console.error('Error while trying to retrieve access token', err);
    }
  }

  /**
   * Prints the Campaign Ids in a sample spreadsheet:
   * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
   * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
   * @param {object} path The path parameters object.
   */
  async listCampaignIds(auth, path) {
    const sheets = google.sheets({ version: 'v4', auth });

    try {
      const response = (await sheets.spreadsheets.values.get(path)).data;
      return response;
    } catch (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    // sheets.spreadsheets.values.get(path, (err, res) => {
    //   if (err) return console.log('The API returned an error: ' + err);
    //   const rows = res.data.values;
    //   if (rows.length) {
    //     rows.map((row) => {
    //       console.log(row);
    //     });
    //   } else {
    //     console.log('No data found.');
    //   }
    // });
  }
}

module.exports = GoogleSheets;
