const { formatDate, getIndirectPath } = require('./util');

const formatSendDate = ({ campaign }) => formatDate(campaign.sdate);

const relPath = (query) => (data) => getIndirectPath(data, query);

const calcBounce = ({ campaign }) =>
  parseInt(campaign.softbounces) + parseInt(campaign.hardbounces);

// renderColumnStructure
const processFieldMap = (campaign, fieldMap) => {
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
};

const formatData = (map) => (campaign) => processFieldMap(campaign, map);

module.exports = {
  formatSendDate,
  relPath,
  calcBounce,
  formatData,
};
