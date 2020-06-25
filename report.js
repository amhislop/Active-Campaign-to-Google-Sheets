import { formatDate, getIndirectPath } from './util.js';

const formatSendDate = ({ campaign }) => formatDate(campaign.sdate);

const relPath = (query) => (data) => getIndirectPath(data, query);

const calcBounce = ({ campaign }) =>
  parseInt(campaign.softbounces) + parseInt(campaign.hardbounces);

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

export default fieldMap;
