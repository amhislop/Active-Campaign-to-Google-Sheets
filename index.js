require('dotenv').config();
const activeCampaign = require('./activeCampaign')(
  process.env.AC_URL,
  process.env.AC_API_TOKEN
);

// Determine sample date (2 weeks prior to now)
const filters = Object.entries({
  status: 5, // 5 = completed
})
  .map(([key, value]) => `filters[${key}]=${value}`)
  .join('&');

const params = [filters].join('&');

function getCampaign(data) {
  if (data.analytics_campaign_name) {
    return data.analytics_campaign_name;
  } else {
    const { name } = data;
    const word = name.match(/^([a-zA-Z0-9])+/)[0]?.toLowerCase();
    const campaignNames = {
      enews: 'eNews',
      churches: 'Stand Together',
      mg: 'Matching Grant Fund',
      cs: 'Child Sponorship',
      btb: 'Behind The Barcode',
      covid: 'COVID-19 Global Emergency',
    };

    for (const prop in campaignNames) {
      if (word === prop) return campaignNames[prop];
    }

    return name;
  }
}

function padTime(hours, minutes, seconds) {
  let [mm, ss] = [minutes, seconds].map(
    (t) => (t.toString().length < 2 ? `0` : '') + t
  );

  return [hours, mm, ss].join(':');
}

const formatSendDate = (sdate) => {
  const dateTime = new Date(sdate);

  const year = dateTime.getFullYear(),
    month = dateTime.getMonth() + 1,
    day = dateTime.getDate(),
    hours = dateTime.getHours(),
    minutes = dateTime.getMinutes(),
    seconds = dateTime.getSeconds();

  const sendDate = [month, day, year].join('/'),
    sendTime = padTime(hours, minutes, seconds),
    sentOn = [sendDate, sendTime].join(' ');

  return { sendDate, sendTime, sentOn };
};

const formatCampaigns = (campaigns) => {
  const x = campaigns.map((campaign) => {
    const { sendDate, sendTime, sentOn } = formatSendDate(campaign.sdate);
    const { name, opens, softbounces, hardbounces, unsubscribes } = campaign;
    const bounces = parseInt(softbounces) + parseInt(hardbounces);

    const data = {
      sentOn,
      sendDate,
      sendTime,
      name,
      opens,
      bounces,
      unsubscribes,
    };

    data.id = campaign.sendid;
    data.campaign = getCampaign(campaign);
    data.deliveries = campaign.total_amt;
    data.uniqueOpensCount = campaign.uniqueopens;
    data.clicks = campaign.linkclicks;
    data.uniqueClicksCount = campaign.uniqueLinkClicks;

    return data;
  });

  return x;
};

const startProcess = async () => {
  try {
    const { campaigns } = await activeCampaign.campaigns.get(params);

    const campaignsData = formatCampaigns(campaigns);

    const messages = await campaignsData.map(async (data) => {
      const { message } = await activeCampaign.campaignMessages.get(data.id);

      data.subject = message.subject;
      data.preheader = message.preheader_text;
      data.fromName = message.fromname;
      data.fromEmail = message.fromemail;
      return data;
    });

    const data = await Promise.all(messages);

    console.log(data);

    // Read google sheets file
    // Check each row for same ID
    // - Update cells for rows with same id
    // - Write remainder of rows as new entries
  } catch (err) {
    console.log(err);
  }
};

startProcess();
