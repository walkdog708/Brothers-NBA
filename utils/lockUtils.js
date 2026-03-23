function isSeriesLocked(series) {
  if (!series) return true;

  if (series.status === "LOCKED" || series.status === "FINAL") {
    return true;
  }

  if (!series.lockAt) {
    return false;
  }

  const lockTime = new Date(series.lockAt).getTime();
  if (Number.isNaN(lockTime)) {
    return false;
  }

  return Date.now() >= lockTime;
}

function getRoundLockState(seriesList) {
  const list = Array.isArray(seriesList) ? seriesList : [];

  if (!list.length) {
    return {
      locked: false,
      reason: null
    };
  }

  const lockedSeries = list.find(isSeriesLocked);

  if (lockedSeries) {
    return {
      locked: true,
      reason: `Round is locked because series ${lockedSeries.seriesId} is locked, final, or past its lock time.`
    };
  }

  return {
    locked: false,
    reason: null
  };
}

module.exports = {
  isSeriesLocked,
  getRoundLockState
};