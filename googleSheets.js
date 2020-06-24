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

  _auth;

  _sheets;

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

    return await this.execute({ property: 'values', method: 'get' }, path);
  }

  async update({ range, valueInputOption }, data) {
    // const auth = await this.authenticate();
    // const sheets = google.sheets({ version: 'v4', auth });

    // const { spreadsheetId } = this;
    const resource = {
      values: [[data]],
    };

    const res = await this.execute(
      { property: 'values', method: 'update' },
      { range, valueInputOption, resource }
    );
    console.log('%d cells updated.', res.updatedCells);

    return res;
  }

  /**
   * [description]
   * @todo set default ranges in class defaults property
   */
  async append(props) {
    let { range, valueInputOption, insertDataOption, resource } = props;
    const { spreadsheetId } = this;

    // Defaults
    range = range || 'A-Z';
    valueInputOption = valueInputOption || 'USER_ENTERED';
    insertDataOption = insertDataOption || 'INSERT_ROWS';

    const auth = await this.authenticate();
    const sheets = google.sheets({ version: 'v4', auth });

    const request = {
      spreadsheetId,
      range, // The A1 notation of a range to search for a logical table of data.
      valueInputOption, // How the input data should be interpreted.
      insertDataOption, // How the input data should be inserted.
      resource,
    };

    try {
      const response = (await sheets.spreadsheets.values.append(request)).data;
      // TODO: Change code below to process the `response` object
      return response;
    } catch (err) {
      console.error(err);
    }
  }

  async clear(ranges) {
    const request = {
      resource: { ranges },
    };

    return await this.execute(
      { property: 'values', method: 'batchClear' },
      request
    );
  }

  async batchUpdate(updates) {
    const auth = await this.authenticate();
    const { spreadsheetId } = this;
    const sheets = google.sheets({ version: 'v4', auth });
    const request = {
      spreadsheetId,
      auth,
      resource: { requests: updates },
    };

    try {
      const response = (await sheets.spreadsheets.batchUpdate(request)).data;
      // TODO: Change code below to process the `response` object
      return response;
    } catch (err) {
      console.error(err);
    }
  }

  async get() {
    const request = {
      fields: 'sheets.properties',
    };

    const sheet = await this.execute({ method: 'get' }, request);

    return sheet;
  }

  async execute({ property, method }, resource) {
    const { spreadsheetId } = this;
    const { auth, sheets } = await this.init();

    const request = {
      auth,
      spreadsheetId,
      ...resource,
    };

    try {
      let response;

      if (property) {
        response = (await sheets.spreadsheets[property][method](request)).data;
      } else {
        response = (await sheets.spreadsheets[method](request)).data;
      }

      return response;
    } catch (err) {
      console.error(`The update API returned an error: ${err}`);
    }
  }

  async init() {
    try {
      const auth = await this.authenticate();
      const sheets = google.sheets({ version: 'v4', auth });
      return { auth, sheets };
    } catch (err) {
      console.error('Error during init');
      return false;
    }
  }

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authenticated client.
   */
  async authenticate() {
    if (!this._auth) {
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
        this._auth = oAuth2Client;
      } catch (err) {
        const token = await this.getNewToken(oAuth2Client);
        oAuth2Client.setCredentials(token);

        await fs.writeFile(TOKEN_PATH, JSON.stringify(token));
        console.log('Token stored to', TOKEN_PATH);

        this._auth = oAuth2Client;
      }
    }

    return this._auth;
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
}

// module.exports = GoogleSheets;

module.exports = function (
  client_id,
  client_secret,
  project_id,
  spreadsheet_id
) {
  return new GoogleSheets(client_id, client_secret, project_id, spreadsheet_id);
};
