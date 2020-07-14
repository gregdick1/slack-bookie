exports.walletSortFunc = (a, b) => {
    if (a.isActiveSeason > b.isActiveSeason) {
        return -1; // a = active, b = not. active seasons first
    } else if (a.isActiveSeason < b.isActiveSeason) {
        return 1; // a = not, b = active, active seasons first
    } else if (!!a.retired < !!b.retired) {
        return -1; // a = not, b = retired, notretired first
    } else if (!!a.retired > !!b.retired) {
        return 1; // a = retired, b = not, notretired first
    } else {
        // if a has more points than b, it should be first
        return b.points - a.points;
    }
}

exports.betSortFunc = (a, b) => {
    return b.dateCreated - a.dateCreated;
}

exports.betAcceptSortFunc = (a, b) => {
    return b.dateAccepted - a.dateAccepted;
}