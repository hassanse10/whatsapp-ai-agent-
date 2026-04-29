const logger = require('../utils/logger');
const { SENTIMENT_THRESHOLD, SENTIMENT_THRESHOLDS } = require('../config/constants');

const analyzeSentimentScore = (score) => {
  return {
    score,
    level: getSentimentLevel(score),
    isNegative: score < SENTIMENT_THRESHOLD,
  };
};

const analyzeSentiment = async (userMessage) => {
  try {
    const claudeService = require('./claudeService');
    const score = await claudeService.analyzeSentiment(userMessage);
    return analyzeSentimentScore(score);
  } catch (error) {
    logger.error('Error analyzing sentiment', { error: error.message });
    return { score: 0, level: 'NEUTRAL', isNegative: false };
  }
};

const getSentimentLevel = (score) => {
  if (score < SENTIMENT_THRESHOLDS.VERY_NEGATIVE) return 'VERY_NEGATIVE';
  if (score < SENTIMENT_THRESHOLDS.NEGATIVE) return 'NEGATIVE';
  if (score < SENTIMENT_THRESHOLDS.NEUTRAL) return 'NEUTRAL';
  if (score < SENTIMENT_THRESHOLDS.POSITIVE) return 'POSITIVE';
  return 'VERY_POSITIVE';
};

const shouldEscalate = (sentiment) => sentiment.score < SENTIMENT_THRESHOLD;

const getEscalationReason = (sentiment) => {
  if (sentiment.score < SENTIMENT_THRESHOLDS.VERY_NEGATIVE)
    return 'Customer expressing severe dissatisfaction (very negative sentiment)';
  return 'Customer expressing dissatisfaction (negative sentiment)';
};

module.exports = {
  analyzeSentiment,
  analyzeSentimentScore,
  getSentimentLevel,
  shouldEscalate,
  getEscalationReason,
};
