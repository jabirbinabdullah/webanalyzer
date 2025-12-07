/**
 * SEO Score Calculator
 * Calculates comprehensive SEO score based on various factors
 */

export class SEOScoreService {
  /**
   * Calculate overall SEO score (0-100)
   * @param {Object} seoData - SEO analysis data
   * @returns {number} SEO score
   */
  calculateScore(seoData) {
    let score = 0;
    const maxScore = 100;

    // Title optimization (20 points)
    if (seoData.title) {
      const len = seoData.title.length;
      if (len >= 30 && len <= 60) {
        score += 20;
      } else if (len >= 20 && len <= 70) {
        score += 10;
      }
    }

    // Meta description (20 points)
    if (seoData.description) {
      const len = seoData.description.length;
      if (len >= 120 && len <= 160) {
        score += 20;
      } else if (len >= 100 && len <= 180) {
        score += 10;
      }
    }

    // H1 tag (15 points)
    if (seoData.hasH1) score += 15;

    // Canonical URL (15 points)
    if (seoData.canonical?.resolved && !seoData.canonical?.issues?.length) {
      score += 15;
    } else if (seoData.canonical?.resolved) {
      score += 7;
    }

    // JSON-LD Schema (15 points)
    if (seoData.jsonLd?.count > 0) {
      if (!seoData.jsonLd?.errors?.length) {
        score += 15;
      } else {
        score += 8;
      }
    }

    // Word count (10 points)
    if (seoData.wordCount) {
      if (seoData.wordCount >= 300) {
        score += 10;
      } else if (seoData.wordCount >= 150) {
        score += 5;
      }
    }

    // robots.txt (5 points)
    if (seoData.robotsTxtStatus === 'found') {
      score += 5;
    }

    // Hreflang tags (5 points)
    if (seoData.hreflangTags && seoData.hreflangTags > 0) {
      score += 5;
    }

    return Math.min(maxScore, score);
  }

  /**
   * Get SEO score breakdown (detailed)
   * @param {Object} seoData - SEO analysis data
   * @returns {Object} Score breakdown by category
   */
  getScoreBreakdown(seoData) {
    return {
      title: this._scoreTitile(seoData.title),
      description: this._scoreDescription(seoData.description),
      h1: seoData.hasH1 ? 15 : 0,
      canonical: this._scoreCanonical(seoData.canonical),
      schema: this._scoreSchema(seoData.jsonLd),
      content: this._scoreContent(seoData.wordCount),
      robotsTxt: seoData.robotsTxtStatus === 'found' ? 5 : 0,
      hreflang: seoData.hreflangTags > 0 ? 5 : 0,
    };
  }

  /**
   * Get SEO recommendations
   * @param {Object} seoData - SEO analysis data
   * @returns {Array} Array of recommendations
   */
  getRecommendations(seoData) {
    const recommendations = [];

    // Title checks
    if (!seoData.title) {
      recommendations.push({
        priority: 'high',
        category: 'Title',
        message: 'Add a page title meta tag',
      });
    } else if (seoData.title.length < 30) {
      recommendations.push({
        priority: 'medium',
        category: 'Title',
        message: `Title is too short (${seoData.title.length} chars). Aim for 30-60 characters.`,
      });
    } else if (seoData.title.length > 60) {
      recommendations.push({
        priority: 'low',
        category: 'Title',
        message: `Title is too long (${seoData.title.length} chars). Keep it under 60 characters.`,
      });
    }

    // Meta description checks
    if (!seoData.description) {
      recommendations.push({
        priority: 'high',
        category: 'Meta Description',
        message: 'Add a meta description tag',
      });
    } else if (seoData.description.length < 120) {
      recommendations.push({
        priority: 'medium',
        category: 'Meta Description',
        message: `Description is too short (${seoData.description.length} chars). Aim for 120-160 characters.`,
      });
    } else if (seoData.description.length > 160) {
      recommendations.push({
        priority: 'low',
        category: 'Meta Description',
        message: `Description is too long (${seoData.description.length} chars). Keep it under 160 characters.`,
      });
    }

    // H1 checks
    if (!seoData.hasH1) {
      recommendations.push({
        priority: 'high',
        category: 'Heading',
        message: 'Add an H1 heading to your page',
      });
    }

    // Canonical checks
    if (seoData.canonical?.issues?.length) {
      recommendations.push({
        priority: 'medium',
        category: 'Canonical URL',
        message: `Canonical URL issues: ${seoData.canonical.issues.join(', ')}`,
      });
    }

    // Schema checks
    if (!seoData.jsonLd || seoData.jsonLd.count === 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Structured Data',
        message: 'Add JSON-LD structured data (schema.org)',
      });
    } else if (seoData.jsonLd.errors?.length) {
      recommendations.push({
        priority: 'high',
        category: 'Structured Data',
        message: `Fix JSON-LD errors: ${seoData.jsonLd.errors.length} parsing issues found`,
      });
    }

    // Content checks
    if (!seoData.wordCount || seoData.wordCount < 150) {
      recommendations.push({
        priority: 'medium',
        category: 'Content',
        message: `Content is too short (${seoData.wordCount || 0} words). Aim for at least 300 words.`,
      });
    }

    // robots.txt checks
    if (seoData.robotsTxtStatus !== 'found') {
      recommendations.push({
        priority: 'low',
        category: 'robots.txt',
        message: 'Add a robots.txt file to guide search engine crawlers',
      });
    }

    return recommendations.sort((a, b) => {
      const priority = { high: 1, medium: 2, low: 3 };
      return priority[a.priority] - priority[b.priority];
    });
  }

  // Private methods
  _scoreTitile(title) {
    if (!title) return 0;
    const len = title.length;
    return (len >= 30 && len <= 60) ? 20 : (len >= 20 && len <= 70 ? 10 : 0);
  }

  _scoreDescription(description) {
    if (!description) return 0;
    const len = description.length;
    return (len >= 120 && len <= 160) ? 20 : (len >= 100 && len <= 180 ? 10 : 0);
  }

  _scoreCanonical(canonical) {
    if (!canonical?.resolved) return 0;
    return canonical.issues?.length ? 7 : 15;
  }

  _scoreSchema(jsonLd) {
    if (!jsonLd || jsonLd.count === 0) return 0;
    return jsonLd.errors?.length ? 8 : 15;
  }

  _scoreContent(wordCount) {
    if (!wordCount) return 0;
    return wordCount >= 300 ? 10 : (wordCount >= 150 ? 5 : 0);
  }
}

export default new SEOScoreService();
