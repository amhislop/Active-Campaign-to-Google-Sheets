export function findLetterIndex(index) {
  const letters = [...Array(26)].map((_, y) => String.fromCharCode(y + 65));
  return letters[index - 1];
}

export function leadingZeros(num) {
  return (num.toString().length < 2 ? '0' : '') + num;
}

export function formatDate(date) {
  const dateTime = new Date(date);

  const yyyy = dateTime.getFullYear(),
    mm = dateTime.getMonth() + 1,
    dd = dateTime.getDate(),
    hh = dateTime.getHours(),
    min = leadingZeros(dateTime.getMinutes()),
    ss = leadingZeros(dateTime.getSeconds());

  return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
}

export function getCampaign(data) {
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

export function getRelativeColumnIndex(arr, currentIndex, query) {
  return arr.findIndex(({ column }) => column === query) - currentIndex;
}

export function getIndirectPath({ fieldMap, index }, query) {
  if (query.includes('/')) {
    const [queryOne, queryTwo] = query
      .split('/')
      .map((q) => getRelativeColumnIndex(fieldMap, index, q));
    return `=sum(INDIRECT("R[0]C[${queryOne}]", FALSE)/INDIRECT("R[0]C[${queryTwo}]", FALSE))`;
  } else {
    const relativeIndex = getRelativeColumnIndex(fieldMap, index, query);
    return `=INDIRECT("R[0]C[${relativeIndex}]", FALSE)`;
  }
}

export function getDataRanges(values) {
  return values.reduce(
    (acc, curr, i) => {
      // Save start on first iteration
      if (i === 0) {
        acc.ranges.push({ start: curr - 1, end: curr });
      } else {
        // Check if current iteration is consecutive to last iteration
        if (curr === acc.last + 1) {
          // If so save over last item
          acc.ranges[acc.ranges.length - 1].end = curr;
        } else {
          acc.ranges.push({ start: curr - 1, end: curr });
        }
      }
      acc.last = curr;
      return acc;
    },
    { ranges: [] }
  );
}
