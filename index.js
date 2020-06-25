import dotenv from 'dotenv';
import googleSheets from './googleSheets.js';
import activeCampaign from './activeCampaign.js';
import fieldMap from './report.js';
import reportIntergration from './intergration.js';

dotenv.config();

const ac = activeCampaign(process.env.AC_URL, process.env.AC_API_TOKEN);

const sheets = googleSheets(
  process.env.GS_CLIENT_ID,
  process.env.GS_CLIENT_SECRET,
  process.env.GS_PROJECT_ID,
  process.env.GS_SPREADSHEET_ID
);

(async () => {
  console.log('🎣   Fetching Campaign Reports');
  const report = reportIntergration(fieldMap, sheets, ac);
  await report.process();
  console.log('🏁   Spreadsheet updated');
})();
