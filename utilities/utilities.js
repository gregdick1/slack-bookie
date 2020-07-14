exports.sumThing = (arrayToSum, propToSum) => {
    return !arrayToSum ? 0 : arrayToSum.reduce((a, b) => a + (b[propToSum] || 0), 0);
};

exports.strikethroughIfInactive = (strikeIfMeTrue, stringToStrike) => {
    return `${strikeIfMeTrue ? '~' : ''}${stringToStrike}${strikeIfMeTrue ? '~' : ''}`;
}

exports.formatDate = (epochDate) => {
    return epochDate ? new Date(epochDate).toLocaleString() : "?";
};