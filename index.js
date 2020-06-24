require('dotenv').config();

const { findLetterIndex, getDataRanges } = require('./util');
const {
  formatSendDate,
  relPath,
  calcBounce,
  getCampaign,
  formatData,
} = require('./report');

const activeCampaign = require('./activeCampaign')(
  process.env.AC_URL,
  process.env.AC_API_TOKEN
);

const googleSheets = require('./googleSheets')(
  process.env.GS_CLIENT_ID,
  process.env.GS_CLIENT_SECRET,
  process.env.GS_PROJECT_ID,
  process.env.GS_SPREADSHEET_ID
);

/**
 * @type {Array.<column: String, prop: String|Function, type?: String>} fieldMap
 */
const fieldMap = [
  { column: 'id', prop: 'sendid' },
  { column: 'sentOn', prop: formatSendDate },
  { column: 'sendDate', prop: relPath('sentOn') },
  { column: 'sendTime', prop: relPath('sentOn') },
  { column: 'name', prop: 'name' },
  { column: 'campaign', prop: 'analytics_campaign_name' },
  { column: 'subject', prop: 'message.subject' },
  { column: 'preheader', prop: 'message.preheader_text' },
  { column: 'fromName', prop: 'message.fromname' },
  { column: 'fromEmail', prop: 'message.fromemail' },
  { column: 'deliveries', prop: 'total_amt', type: 'number' },
  { column: 'opens', prop: 'opens', type: 'number' },
  { column: 'uniqueOpens', prop: 'uniqueopens', type: 'number' },
  { column: 'openRate', prop: relPath('uniqueOpens/deliveries') },
  { column: 'clicks', prop: 'linkclicks', type: 'number' },
  { column: 'uniqueClicks', prop: 'uniquelinkclicks', type: 'number' },
  { column: 'clickThroughRate', prop: relPath('uniqueClicks/deliveries') },
  { column: 'clickToOpenRate', prop: relPath('uniqueClicks/uniqueOpens') },
  { column: 'bounces', prop: calcBounce },
  { column: 'bounceRate', prop: relPath('bounces/deliveries') },
  { column: 'unsubscribes', prop: 'unsubscribes', type: 'number' },
  { column: 'unsubscribeRate', prop: relPath('unsubscribes/deliveries') },
];

/**
 * @todo Change this to batch update
 */
const startProcess = async () => {
  try {
    const { campaigns } = await activeCampaign.campaigns.get({
      filters: { status: 5 },
    });

    if (!campaigns) {
      console.log('no data this time!');
      return;
    }

    console.log('🎣   Fetching Campaign Reports');

    const campaignData = await campaigns.map(async (campaign) => {
      const { message } = await activeCampaign.campaignMessages.get(
        campaign.sendid
      );
      campaign.message = message;
      return campaign;
    });

    const data = (await Promise.all(campaignData)).map(formatData(fieldMap));

    console.log(`📦   ${data.length} Campaign Reports Received`);

    const { sheetId, gridProperties } = (
      await googleSheets.get()
    ).sheets[0].properties;

    const endColumn = findLetterIndex(gridProperties.columnCount);

    console.log(`🔍   Searching for columns to update`);

    const idColumn = { range: 'A:A' };
    const { values: ids } = await googleSheets.read(idColumn);

    // Capture rows to delete
    const deleteValues = ids.reduce((acc, [id], index) => {
      const existing = data?.find(([dataId]) => dataId == id);
      if (existing) acc.push(index + 1);
      return acc;
    }, []);

    const requests = [];

    // Compile and prepare delete request
    if (deleteValues) {
      const { ranges } = getDataRanges(deleteValues.sort());

      ranges.forEach((range) => {
        requests.push({
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: range.start,
              endIndex: range.end,
            },
          },
        });
      });
    }

    if (requests.length) {
      console.log(`♻️   Updating ${deleteValues.length} rows`);
      const batchUpdated = await googleSheets.batchUpdate(requests);
    } else {
      console.log('no requests');
    }

    console.log(`➕   Appending new values`);

    await googleSheets.append({
      resource: { values: data },
      range: `A:${endColumn}`,
    });

    console.log('🏁   Spreadsheet updated');
  } catch (err) {
    console.log(err);
  }
};

startProcess();
