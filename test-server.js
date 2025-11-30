/**
 * Test Server Startup
 * Check if server can start without crashing
 */

console.log('Testing server startup...\n');

try {
  require('dotenv').config();
  console.log('✅ dotenv loaded');
  
  const express = require('express');
  console.log('✅ express loaded');
  
  const cors = require('cors');
  console.log('✅ cors loaded');
  
  console.log('\nTrying to load webhook router...');
  const webhookRouter = require('./webhooks/webhook');
  console.log('✅ webhook router loaded');
  
  console.log('\n✅ ALL MODULES LOADED SUCCESSFULLY');
  console.log('\nStarting actual server...\n');
  
  require('./server.js');
  
} catch (error) {
  console.error('\n❌ ERROR LOADING MODULES:');
  console.error(error);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
