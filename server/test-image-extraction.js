/**
 * Test script to verify image extraction logic
 * Run with: node server/test-image-extraction.js
 */

// Simulate the DOM extraction logic
function testImageExtraction() {
  // Simulate HTML structure from Rate-X detail page
  const mockHTML = {
    divs: [
      {
        style: 'background-image: url("//static.rate-x.io/img/v1/1c9857/Hylo.svg"); background-size: auto 100%; background-repeat: no-repeat;'
      },
      {
        style: 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);'
      }
    ],
    images: [
      {
        src: '//static.rate-x.io/img/v1/88b8f6/logo_white.svg',
        alt: ''
      },
      {
        src: '//static.rate-x.io/img/v1/361b53/xSOL.svg',
        alt: 'xSOL-2511',
        width: '24',
        height: '24'
      },
      {
        src: '//static.rate-x.io/img/v1/abc123/hyloSOL+.svg',
        alt: 'hyloSOL+-2511'
      }
    ]
  };

  const result = {
    projectBackgroundImage: null,
    projectName: null,
    assetSymbolImage: null
  };

  // Extract Project Background Image
  console.log('\n🔍 Testing Background Image Extraction...');
  for (const div of mockHTML.divs) {
    const styleAttr = div.style;
    if (!styleAttr) continue;

    // Try to match both quoted and unquoted URLs, with or without https://
    const bgImageMatch = styleAttr.match(/background-image:\s*url\s*\(\s*["']?((?:https?:)?\/\/static\.rate-x\.io\/[^"')]+)["']?\s*\)/i);
    if (bgImageMatch) {
      let imageUrl = bgImageMatch[1];
      console.log(`  Found background-image URL: ${imageUrl}`);

      // Ensure URL has https: protocol
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
        console.log(`  Fixed protocol: ${imageUrl}`);
      }

      // Only accept if it looks like a project logo (not logo_white.svg)
      if (!imageUrl.includes('logo_white.svg') && !imageUrl.includes('logo.svg')) {
        result.projectBackgroundImage = imageUrl;

        // Extract project name from the URL filename
        const urlParts = imageUrl.split('/');
        const filename = urlParts[urlParts.length - 1]; // "Hylo.svg"
        const projectName = filename.replace(/\.(svg|png|jpg|jpeg|gif|webp)$/i, ''); // "Hylo"
        result.projectName = projectName;

        console.log(`  ✅ Accepted as project background`);
        console.log(`  ✅ Project name: ${projectName}`);
        break;
      } else {
        console.log(`  ❌ Rejected (is a logo)`);
      }
    }
  }

  // Extract Asset Symbol Image
  console.log('\n🔍 Testing Asset Symbol Image Extraction...');
  for (const img of mockHTML.images) {
    let src = img.src;
    if (!src) continue;

    console.log(`  Checking image: ${src}`);

    // Ensure URL has https: protocol
    if (src.startsWith('//')) {
      src = 'https:' + src;
      console.log(`    Fixed protocol: ${src}`);
    }

    // Only accept images from static.rate-x.io that are NOT logos
    if (src.includes('static.rate-x.io/img/') &&
      !src.includes('logo_white.svg') &&
      !src.includes('logo.svg') &&
      !src.includes('RateX')) {

      // Additional validation: check if alt attribute contains asset-like pattern
      const alt = img.alt;
      if (alt && alt.match(/[A-Za-z0-9*+\-]+-\d{4}/)) {
        console.log(`    Alt attribute: "${alt}" ✅ Matches asset pattern`);
        result.assetSymbolImage = src;
        console.log(`    ✅ Accepted as asset symbol`);
        break;
      } else {
        console.log(`    Alt attribute: "${alt}" ❌ No asset pattern`);
      }
    } else {
      console.log(`    ❌ Rejected (logo or invalid URL)`);
    }
  }

  // Fallback test
  if (!result.assetSymbolImage) {
    console.log('\n🔄 Trying fallback (no alt attribute required)...');
    for (const img of mockHTML.images) {
      let src = img.src;
      if (!src) continue;

      if (src.startsWith('//')) {
        src = 'https:' + src;
      }

      if (src.includes('static.rate-x.io/img/') &&
        !src.includes('logo_white.svg') &&
        !src.includes('logo.svg') &&
        !src.includes('RateX') &&
        src.match(/\/[A-Za-z0-9*+]+\.svg$/)) { // Ends with AssetName.svg
        console.log(`  ✅ Found via fallback: ${src}`);
        result.assetSymbolImage = src;
        break;
      }
    }
  }

  // Print final result
  console.log('\n📊 FINAL RESULT:');
  console.log(JSON.stringify(result, null, 2));

  // Validate results
  console.log('\n✅ VALIDATION:');
  const checks = {
    'Background Image has https://': result.projectBackgroundImage?.startsWith('https://'),
    'Background Image is Hylo.svg': result.projectBackgroundImage?.includes('Hylo.svg'),
    'Project Name is "Hylo"': result.projectName === 'Hylo',
    'Asset Symbol has https://': result.assetSymbolImage?.startsWith('https://'),
    'Asset Symbol is xSOL.svg': result.assetSymbolImage?.includes('xSOL.svg'),
    'Asset Symbol is NOT logo': !result.assetSymbolImage?.includes('logo')
  };

  for (const [check, passed] of Object.entries(checks)) {
    console.log(`  ${passed ? '✅' : '❌'} ${check}`);
  }

  const allPassed = Object.values(checks).every(v => v === true);
  console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED'}`);

  return result;
}

// Run the test
testImageExtraction();
