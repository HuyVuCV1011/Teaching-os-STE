/**
 * Automated integration test script for Teaching OS APIs.
 * This script pings your active dev server to verify all class code verification flows.
 * 
 * Run using: node scripts/test-api.js
 */

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

// Automatically detect which port Next.js is running on
async function detectPort() {
  const ports = [3000, 3001, 3002, 3003];
  for (const port of ports) {
    try {
      const res = await makeRequest({
        hostname: 'localhost',
        port: port,
        path: '/learn',
        method: 'GET',
        timeout: 500
      });
      if (res.statusCode < 500) {
        console.log(`📡 Detected running Next.js dev server on port ${port}.`);
        return port;
      }
    } catch (e) {
      // Port not active, try next
    }
  }
  throw new Error('Could not find any running Next.js server on port 3000, 3001, 3002, or 3003. Please start it with "npm run dev".');
}

async function runIntegrationTests() {
  console.log('🚀 Starting Automated Integration Tests...');
  let port;
  try {
    port = await detectPort();
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  const baseOptions = {
    hostname: 'localhost',
    port: port,
    path: '/api/v1/verify-code',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  let failed = false;

  // --- TEST CASE 1: Valid Class Code "DATA-2026" ---
  console.log('\n----------------------------------------');
  console.log('🧪 Test Case 1: Verifying active cohort "DATA-2026"...');
  try {
    const res = await makeRequest(baseOptions, { code: 'DATA-2026' });
    
    if (res.statusCode !== 200) {
      throw new Error(`Expected status code 200, got ${res.statusCode}. Body: ${res.body}`);
    }

    const payload = JSON.parse(res.body);
    if (!payload.success || payload.classCode !== 'DATA-2026') {
      throw new Error(`Invalid response payload logic: ${res.body}`);
    }

    // Check cookies
    const cookieHeader = res.headers['set-cookie'] || [];
    const hasSessionCookie = cookieHeader.some(cookie => cookie.startsWith('class_session_DATA-2026='));
    if (!hasSessionCookie) {
      throw new Error('Missing "class_session_DATA-2026" session cookie in headers.');
    }

    console.log('✅ PASS: Successfully validated cohort DATA-2026 and received JWT cookie.');
  } catch (err) {
    console.error(`❌ FAIL: Test Case 1 failed: ${err.message}`);
    failed = true;
  }

  // --- TEST CASE 2: Valid Class Code "SWE-2026" ---
  console.log('\n----------------------------------------');
  console.log('🧪 Test Case 2: Verifying newly created cohort "SWE-2026"...');
  try {
    const res = await makeRequest(baseOptions, { code: 'SWE-2026' });
    
    if (res.statusCode !== 200) {
      throw new Error(`Expected status code 200, got ${res.statusCode}. Body: ${res.body}`);
    }

    const payload = JSON.parse(res.body);
    if (!payload.success || payload.classCode !== 'SWE-2026') {
      throw new Error(`Invalid response payload logic: ${res.body}`);
    }

    // Check cookies
    const cookieHeader = res.headers['set-cookie'] || [];
    const hasSessionCookie = cookieHeader.some(cookie => cookie.startsWith('class_session_SWE-2026='));
    if (!hasSessionCookie) {
      throw new Error('Missing "class_session_SWE-2026" session cookie in headers.');
    }

    console.log('✅ PASS: Successfully validated cohort SWE-2026 and received JWT cookie.');
  } catch (err) {
    console.error(`❌ FAIL: Test Case 2 failed: ${err.message}`);
    failed = true;
  }

  // --- TEST CASE 3: Invalid Class Code "XYZ-9999" ---
  console.log('\n----------------------------------------');
  console.log('🧪 Test Case 3: Verifying invalid cohort rejection...');
  try {
    const res = await makeRequest(baseOptions, { code: 'XYZ-9999' });
    
    if (res.statusCode !== 404) {
      throw new Error(`Expected status code 404 for invalid code, got ${res.statusCode}.`);
    }

    const payload = JSON.parse(res.body);
    if (!payload.error || !payload.error.includes('Invalid code')) {
      throw new Error(`Expected "Invalid code" error message, got: ${res.body}`);
    }

    console.log('✅ PASS: Invalid code rejected correctly with 404.');
  } catch (err) {
    console.error(`❌ FAIL: Test Case 3 failed: ${err.message}`);
    failed = true;
  }

  console.log('\n========================================');
  if (failed) {
    console.error('🔴 INTEGRATION TEST RESULTS: FAILED');
    process.exit(1);
  } else {
    console.log('🟢 ALL API INTEGRATION TESTS PASSED SUCCESSFULLY');
    process.exit(0);
  }
}

runIntegrationTests();
