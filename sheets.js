require('dotenv').config();
const GoogleSheets = require('./googleSheets');

const {
  GS_CLIENT_ID,
  GS_CLIENT_SECRET,
  GS_PROJECT_ID,
  GS_SPREADSHEET_ID,
} = process.env;

const gSheets = new GoogleSheets(
  GS_CLIENT_ID,
  GS_CLIENT_SECRET,
  GS_PROJECT_ID,
  GS_SPREADSHEET_ID
);

async function updateSheets() {
  const ids = await gSheets.read({ range: 'A:A' });
  console.log(ids);
}
updateSheets();
