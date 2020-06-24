const fetch = require('node-fetch');

class ActiveCamapignAPI {
  _url;

  _token;

  _version = 3;

  constructor(url, token) {
    this._url = `${url}/api/${this._version}`;
    this._token = token;
    this._loadHandlers();
  }

  _loadHandlers() {
    this.campaigns = {
      get: async (params) => this._get('campaigns', params),
    };

    this.campaignMessages = {
      get: async (campaignID) =>
        this._get(`campaignMessages/${campaignID}/message`),
    };
  }

  get requestOptions() {
    return {
      headers: this.getHeaders(),
    };
  }

  getHeaders() {
    return {
      'Api-Token': this._token,
      'Content-Type': 'application/json',
    };
  }

  async _get(endpoint, params = null) {
    let url = `${this._url}/${endpoint}`;

    if (params) url += this._format_params(params);

    try {
      const response = await fetch(url, this.requestOptions);
      const json = await response.json();

      return json;
    } catch (err) {
      console.log(err);
    }
  }

  _format_params(params) {
    return (
      '?' +
      Object.entries(params)
        .map(([key, value]) => {
          if (typeof value === 'object' && value) {
            return Object.entries(value)
              .map(([k, v]) => `${key}[${k}]=${v}`)
              .join('&');
          } else {
            return `${key}=${value}`;
          }
        })
        .join('&')
    );
  }
}

module.exports = function activeCampaign(url, token) {
  return new ActiveCamapignAPI(url, token);
};
