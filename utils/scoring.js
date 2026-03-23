function getAllowedConfidenceValues(round) {
  const r = Number(round);

  if (r === 1) return [1, 2, 3, 4, 5, 6, 7, 8];
  if (r === 2) return [3, 6, 9, 12];
  if (r === 3) return [10, 20];
  if (r === 4) return [20];

  return [];
}

function getSeriesBonus(round, predictedGames, actualGames) {
  const r = Number(round);
  const diff = Math.abs(Number(predictedGames) - Number(actualGames));

  if (r === 1) {
    if (diff === 0) return 4;
    if (diff === 1) return 2;
    if (diff === 2) return 1;
    return 0;
  }

  if (r === 2) {
    if (diff === 0) return 8;
    if (diff === 1) return 4;
    if (diff === 2) return 2;
    return 0;
  }

  if (r === 3) {
    if (diff === 0) return 16;
    if (diff === 1) return 8;
    if (diff === 2) return 4;
    return 0;
  }

  if (r === 4) {
    if (diff === 0) return 40;
    if (diff === 1) return 20;
    if (diff === 2) return 10;
    return 0;
  }

  return 0;
}

function scoreSeriesPick(round, pick, actualWinnerTeam, actualGamesPlayed) {
  const pickedCorrectWinner =
    String(pick.pickTeam || "").trim().toUpperCase() ===
    String(actualWinnerTeam || "").trim().toUpperCase();

  if (!pickedCorrectWinner) {
    return {
      winnerCorrect: false,
      bonusPoints: 0,
      pointsEarned: 0
    };
  }

  const bonusPoints = getSeriesBonus(round, pick.predictedGames, actualGamesPlayed);

  return {
    winnerCorrect: true,
    bonusPoints,
    pointsEarned: Number(pick.confidence || 0) + bonusPoints
  };
}

module.exports = {
  getAllowedConfidenceValues,
  getSeriesBonus,
  scoreSeriesPick
};