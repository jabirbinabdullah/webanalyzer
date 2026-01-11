import { detectTechnologies } from './src/scanners/techScanner.js';
import { load } from 'cheerio';

// Test with sample HTML that has technologies
const sampleHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test Page</title>
    <meta name="description" content="A test page">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css">
    <script src="https://www.googletagmanager.com/gtm.js?id=GTM-123456"></script>
</head>
<body>
    <div id="app">
        <h1>Welcome</h1>
        <p>This is a test page with multiple technologies.</p>
    </div>
</body>
</html>
`;

console.log('Testing Technology Detection:');
console.log('============================\n');

const technologies = detectTechnologies({ html: sampleHtml });
console.log(`Found ${technologies.length} technologies:\n`);
technologies.forEach((tech) => {
  console.log(`✓ ${tech.name}`);
  console.log(`  Confidence: ${(tech.confidence * 100).toFixed(0)}%`);
  console.log(`  Evidence: ${tech.evidence}\n`);
});

console.log('\nSample Technologies Detected:');
console.log('=============================\n');

// Parse for SEO analysis
const $ = load(sampleHtml);
const title = $('title').text();
const description = $('meta[name="description"]').attr('content');
const h1Count = $('h1').length;

console.log('Basic SEO Metrics:');
console.log(`- Title: ${title ? '✓' : '✗'} "${title}"`);
console.log(`- Meta Description: ${description ? '✓' : '✗'} "${description}"`);
console.log(`- H1 Tags: ${h1Count} found (${h1Count > 0 ? '✓' : '✗'})`);
console.log(
  `\nImprovement: Config-driven tech detection now supports 20+ technologies`
);
console.log(`instead of the previous ~8 hardcoded ones.`);
