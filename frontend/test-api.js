// Test script for API endpoint verification
const fs = require('fs');

// Create a sample test image in base64 (1x1 PNG)
const sampleImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const sampleAddress = {
  firstName: 'Test',
  lastName: 'User',
  addressLine1: '123 Test Street',
  addressLine2: 'Apt 4B',
  city: 'Testville',
  provinceOrState: 'TS',
  postalOrZip: '12345',
  country: 'United States',
  countryCode: 'US'
};

const testPostcardSubmission = {
  to: sampleAddress,
  frontHTML: `<html><body><img src="${sampleImageBase64}" alt="Test Image" style="width:100%;height:auto;"></body></html>`,
  backHTML: '<html><body><p>Hello from the test!</p></body></html>',
  message: 'Hello from the test! This is a comprehensive end-to-end verification.',
  size: '6x4',
  imageData: sampleImageBase64,
  messageHTML: '<p>Hello from the test! This is a comprehensive end-to-end verification.</p>',
  fontSelection: {
    family: 'Arial',
    size: '24px'
  }
};

async function testAPI() {
  try {
    console.log('Testing POST /api/postcards endpoint...\n');

    const response = await fetch('http://localhost:6201/api/postcards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPostcardSubmission)
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseData = await response.text();
    console.log('\nResponse Body:', responseData);

    if (response.ok) {
      console.log('\n✅ API endpoint working correctly!');
    } else {
      console.log('\n❌ API endpoint returned error');
    }
  } catch (error) {
    console.error('\n❌ Error testing API:', error.message);
  }
}

async function testAddressValidation() {
  try {
    console.log('\n\nTesting POST /api/address/validate endpoint...\n');

    const response = await fetch('http://localhost:6201/api/address/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleAddress)
    });

    console.log('Response Status:', response.status);

    const responseData = await response.text();
    console.log('\nResponse Body:', responseData);

    if (response.ok) {
      console.log('\n✅ Address validation endpoint working correctly!');
    } else {
      console.log('\n❌ Address validation endpoint returned error');
    }
  } catch (error) {
    console.error('\n❌ Error testing address validation:', error.message);
  }
}

// Run tests
console.log('='.repeat(60));
console.log('FAM MAIL API ENDPOINT VERIFICATION');
console.log('='.repeat(60));

testAPI().then(() => {
  testAddressValidation().then(() => {
    console.log('\n\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
  });
});