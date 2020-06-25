import { findLetterIndex, getDataRanges } from './util.js';

class ReportIntergration {
  fieldMap;

  sheets;

  ac;

  constructor(map, googleSheets, activeCampaign) {
    this.fieldMap = map;
    this.sheets = googleSheets;
    this.ac = activeCampaign;
  }

  async process() {
    const { ac, sheets } = this;
    try {
      const { campaigns } = await ac.campaigns.get({
        filters: { status: 5 },
      });

      if (!campaigns) {
        console.log('no data this time!');
        return;
      }

      const campaignData = await campaigns.map(async (campaign) => {
        const { message } = await ac.campaignMessages.get(campaign.sendid);
        campaign.message = message;
        return campaign;
      });

      const data = (await Promise.all(campaignData)).map(
        this._mapFields.bind(this)
      );

      console.log(`📦   ${data.length} Campaign Reports Received`);

      const { sheetId, gridProperties } = (
        await sheets.get()
      ).sheets[0].properties;

      const endColumn = findLetterIndex(gridProperties.columnCount);

      console.log(`🔍   Searching for columns to update`);

      const idColumn = { range: 'A:A' };
      const { values: ids } = await sheets.read(idColumn);

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
        console.log(`♻️    Updating ${deleteValues.length} rows`);
        const batchUpdated = await sheets.batchUpdate(requests);
      } else {
        console.log('no requests');
      }

      console.log(`➕   Appending new values`);

      return sheets.append({
        resource: { values: data },
        range: `A:${endColumn}`,
      });
    } catch (err) {
      console.log(err);
    }
  }

  _mapFields(campaign) {
    const { fieldMap } = this;

    return fieldMap.map((field, index) => {
      let result;

      if (typeof field.prop === 'function') {
        result = field.prop({ campaign, fieldMap, index });
      } else {
        if (field.prop.includes('.')) {
          const [propOne, propTwo] = field.prop.split('.');
          result = campaign[propOne][propTwo];
        } else {
          result = campaign[field.prop];
        }
      }

      if (field?.type === 'number') {
        result = parseInt(result);
      }

      return result;
    });
  }
}

export default function (map, googleSheets, activeCampaign) {
  return new ReportIntergration(map, googleSheets, activeCampaign);
}
