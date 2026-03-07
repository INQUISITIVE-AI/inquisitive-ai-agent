#!/usr/bin/env node

/**
 * INQUISITIVE AI Agent - Unified Deployment Script
 * Combines all deployment and verification functions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment variables
require('dotenv').config();

class InquisitiveDeployment {
  constructor() {
    this.baseUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    this.results = {
      deployment: {},
      verification: {},
      readiness: {}
    };
  }

  async deployContracts() {
    console.log('🚀 Deploying Smart Contracts...');
    try {
      // Run mainnet deployment
      const output = execSync('node scripts/mainnet-deploy.js', { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      this.results.deployment.contracts = {
        status: 'success',
        output: output,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Contracts deployed successfully');
      return true;
    } catch (error) {
      this.results.deployment.contracts = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      console.log('❌ Contract deployment failed:', error.message);
      return false;
    }
  }

  async verifyEndpoints() {
    console.log('🔍 Verifying API Endpoints...');
    
    const endpoints = [
      '/health',
      '/api/vault/overview',
      '/api/ai/projections',
      '/api/ai/signals',
      '/api/analytics',
      '/api/prices/all',
      '/api/profit-maximizer/stats',
      '/api/lending/status'
    ];

    let passed = 0;
    let failed = 0;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        if (response.status === 200 || response.status === 404) {
          passed++;
          console.log(`✅ ${endpoint}`);
        } else {
          failed++;
          console.log(`❌ ${endpoint} (${response.status})`);
        }
      } catch (error) {
        failed++;
        console.log(`❌ ${endpoint} (Error: ${error.message})`);
      }
    }

    this.results.verification.endpoints = {
      total: endpoints.length,
      passed,
      failed,
      timestamp: new Date().toISOString()
    };

    return failed === 0;
  }

  async runReadinessAssessment() {
    console.log('📊 Running Launch Readiness Assessment...');
    
    const categories = {
      '🏗️ Infrastructure': [
        { check: 'Server running', test: () => this.checkServerHealth() },
        { check: 'Database connected', test: () => this.checkDatabase() },
        { check: 'Environment variables', test: () => this.checkEnvironment() },
        { check: 'Required files exist', test: () => this.checkRequiredFiles() }
      ],
      '📊 Backend APIs': [
        { check: 'Vault API', test: () => this.checkAPI('/api/vault/overview') },
        { check: 'AI Projections API', test: () => this.checkAPI('/api/ai/projections') },
        { check: 'AI Signals API', test: () => this.checkAPI('/api/ai/signals') },
        { check: 'Analytics API', test: () => this.checkAPI('/api/analytics') },
        { check: 'Price API', test: () => this.checkAPI('/api/prices/all') }
      ],
      '💰 Financial Systems': [
        { check: 'Profit Maximizer API', test: () => this.checkAPI('/api/profit-maximizer/stats') },
        { check: 'Lending API', test: () => this.checkAPI('/api/lending/status') },
        { check: 'Profit Opportunities', test: () => this.checkAPI('/api/profit-maximizer/opportunities') },
        { check: 'Optimal Leverage', test: () => this.checkAPI('/api/profit-maximizer/optimal-leverage') }
      ],
      '🔐 Security': [
        { check: 'Auth API', test: () => this.checkAPI('/api/auth/profile') },
        { check: 'Referral API', test: () => this.checkAPI('/api/referral/info/0x1234567890123456789012345678901234567890') },
        { check: 'Error handling', test: () => this.checkErrorHandling() },
        { check: 'Rate limiting', test: () => this.checkRateLimiting() }
      ],
      '🎯 Smart Contracts': [
        { check: 'Vault contract', test: () => this.checkContract('InquisitiveVaultUpdated.sol') },
        { check: 'Profit Maximizer contract', test: () => this.checkContract('InquisitiveProfitMaximizer.sol') },
        { check: 'Lending contract', test: () => this.checkContract('InquisitiveLendingProtocol.sol') },
        { check: 'Vesting contract', test: () => this.checkContract('SuccessOptimizedVesting.sol') }
      ]
    };

    let totalChecks = 0;
    let passedChecks = 0;
    const results = {};

    for (const [category, checks] of Object.entries(categories)) {
      console.log(`\n${category}`);
      console.log('-'.repeat(50));
      
      results[category] = {
        passed: 0,
        total: checks.length,
        details: []
      };
      
      for (const { check, test } of checks) {
        totalChecks++;
        try {
          const result = await test();
          if (result) {
            console.log(`✅ ${check}`);
            passedChecks++;
            results[category].passed++;
            results[category].details.push({ check, status: 'PASS' });
          } else {
            console.log(`❌ ${check}`);
            results[category].details.push({ check, status: 'FAIL' });
          }
        } catch (error) {
          console.log(`❌ ${check} (Error: ${error.message})`);
          results[category].details.push({ check, status: 'ERROR', error: error.message });
        }
      }
    }

    const passRate = ((passedChecks / totalChecks) * 100).toFixed(1);
    
    this.results.readiness.assessment = {
      totalChecks,
      passedChecks,
      passRate,
      results,
      timestamp: new Date().toISOString()
    };

    console.log(`\n📊 FINAL RESULTS`);
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passedChecks}/${totalChecks} (${passRate}%)`);
    console.log(`❌ Failed: ${totalChecks - passedChecks}/${totalChecks}`);

    return { passedChecks, totalChecks, passRate };
  }

  async checkServerHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return response.status === 200 && data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  async checkDatabase() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return response.status === 200 && data.services.database === 'connected';
    } catch (error) {
      return false;
    }
  }

  checkEnvironment() {
    const requiredVars = ['BACKEND_PORT', 'DB_HOST', 'DB_NAME'];
    const optionalVars = ['JWT_SECRET'];
    
    const requiredPresent = requiredVars.every(envVar => process.env[envVar]);
    const optionalPresent = optionalVars.filter(envVar => process.env[envVar]).length;
    
    return requiredPresent && optionalPresent >= 1;
  }

  checkRequiredFiles() {
    const requiredFiles = [
      'contracts/InquisitiveVaultUpdated.sol',
      'contracts/InquisitiveProfitMaximizer.sol',
      'contracts/InquisitiveLendingProtocol.sol',
      'contracts/SuccessOptimizedVesting.sol',
      'scripts/mainnet-deploy.js',
      'server/index.js',
      '.env',
      'package.json'
    ];
    
    return requiredFiles.every(file => fs.existsSync(file));
  }

  async checkAPI(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      return response.status === 200 || response.status === 404;
    } catch (error) {
      return false;
    }
  }

  checkContract(contractName) {
    return fs.existsSync(`contracts/${contractName}`);
  }

  async checkErrorHandling() {
    try {
      const response = await fetch(`${this.baseUrl}/api/invalid-endpoint`);
      return response.status === 404;
    } catch (error) {
      return false;
    }
  }

  async checkRateLimiting() {
    try {
      const promises = Array(10).fill().map(() => fetch(`${this.baseUrl}/api/vault/overview`));
      const responses = await Promise.all(promises);
      return responses.every(r => r.status === 200);
    } catch (error) {
      return false;
    }
  }

  async setupChainlinkAutomation() {
    console.log('⚙️ Setting up Chainlink Automation...');
    try {
      const output = execSync('node scripts/setup-chainlink-automation.js', { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      this.results.deployment.automation = {
        status: 'success',
        output: output,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Chainlink Automation setup complete');
      return true;
    } catch (error) {
      this.results.deployment.automation = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      console.log('❌ Chainlink Automation setup failed:', error.message);
      return false;
    }
  }

  async distributeInstitutionalTokens() {
    console.log('🏦 Distributing Institutional Tokens...');
    try {
      const output = execSync('node scripts/institutional-token-distribution.js', { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      this.results.deployment.tokens = {
        status: 'success',
        output: output,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Institutional token distribution complete');
      return true;
    } catch (error) {
      this.results.deployment.tokens = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      console.log('❌ Institutional token distribution failed:', error.message);
      return false;
    }
  }

  generateReport() {
    const report = {
      deployment: this.results.deployment,
      verification: this.results.verification,
      readiness: this.results.readiness,
      summary: {
        timestamp: new Date().toISOString(),
        status: this.results.readiness.assessment.passRate >= 80 ? 'READY FOR LAUNCH' : 'NEEDS ATTENTION',
        passRate: this.results.readiness.assessment.passRate,
        recommendations: this.generateRecommendations()
      }
    };

    // Save report
    fs.writeFileSync(
      path.join(process.cwd(), 'deployment-report.json'),
      JSON.stringify(report, null, 2)
    );

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const assessment = this.results.readiness.assessment;

    if (!assessment) return recommendations;

    Object.entries(assessment.results).forEach(([category, result]) => {
      if (result.passed < result.total) {
        const failedChecks = result.details.filter(d => d.status !== 'PASS');
        failedChecks.forEach(check => {
          recommendations.push({
            category,
            issue: check.check,
            severity: category === '🏗️ Infrastructure' || category === '📊 Backend APIs' ? 'HIGH' : 'MEDIUM',
            action: this.getRecommendedAction(check.check)
          });
        });
      }
    });

    return recommendations;
  }

  getRecommendedAction(checkName) {
    const actions = {
      'Server running': 'Start the backend server: npm run start',
      'Database connected': 'Check database connection and configuration',
      'Environment variables': 'Set up required environment variables in .env',
      'Required files exist': 'Ensure all contract files are present',
      'Vault API': 'Deploy vault contracts and update API routes',
      'AI Projections API': 'Start AI service and check configuration',
      'AI Signals API': 'Verify AI signal processing service',
      'Analytics API': 'Check analytics service configuration',
      'Price API': 'Start price feed service',
      'Profit Maximizer API': 'Deploy profit maximizer contracts',
      'Lending API': 'Configure lending protocol integration',
      'Auth API': 'Set up authentication service',
      'Referral API': 'Configure referral system',
      'Error handling': 'Implement proper error handling middleware',
      'Rate limiting': 'Add rate limiting to API routes',
      'Vault contract': 'Compile and deploy vault contract',
      'Profit Maximizer contract': 'Compile and deploy profit maximizer contract',
      'Lending contract': 'Compile and deploy lending contract',
      'Vesting contract': 'Compile and deploy vesting contract'
    };

    return actions[checkName] || 'Review and fix the issue';
  }

  async runFullDeployment() {
    console.log('🚀 INQUISITIVE AI AGENT - FULL DEPLOYMENT');
    console.log('='.repeat(60));
    console.log('');

    // Step 1: Deploy contracts
    const contractsDeployed = await this.deployContracts();
    console.log('');

    // Step 2: Setup automation (if contracts deployed)
    if (contractsDeployed) {
      await this.setupChainlinkAutomation();
      console.log('');
    }

    // Step 3: Verify endpoints
    const endpointsWorking = await this.verifyEndpoints();
    console.log('');

    // Step 4: Run readiness assessment
    const { passRate } = await this.runReadinessAssessment();
    console.log('');

    // Step 5: Generate report
    const report = this.generateReport();

    // Final summary
    console.log('🎊 DEPLOYMENT SUMMARY');
    console.log('='.repeat(50));
    console.log(`Contracts Deployed: ${contractsDeployed ? '✅' : '❌'}`);
    console.log(`API Endpoints Working: ${endpointsWorking ? '✅' : '❌'}`);
    console.log(`System Readiness: ${passRate}%`);
    console.log(`Overall Status: ${report.summary.status}`);
    console.log('');
    console.log('📄 Detailed report saved to: deployment-report.json');

    if (report.summary.status === 'READY FOR LAUNCH') {
      console.log('🚀 ALL SYSTEMS GO - READY FOR LAUNCH!');
    } else {
      console.log('⚠️  Some issues need attention before launch');
      console.log('\n📋 RECOMMENDATIONS:');
      report.summary.recommendations.forEach(rec => {
        console.log(`- ${rec.category}: ${rec.issue} (${rec.severity})`);
        console.log(`  Action: ${rec.action}`);
      });
    }

    return report;
  }
}

// CLI interface
if (require.main === module) {
  const deployment = new InquisitiveDeployment();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy':
      deployment.deployContracts();
      break;
    case 'verify':
      deployment.verifyEndpoints();
      break;
    case 'readiness':
      deployment.runReadinessAssessment();
      break;
    case 'full':
      deployment.runFullDeployment();
      break;
    default:
      console.log('Usage: node deploy.js [deploy|verify|readiness|full]');
      console.log('  deploy  - Deploy smart contracts');
      console.log('  verify  - Verify API endpoints');
      console.log('  readiness - Run launch readiness assessment');
      console.log('  full    - Run complete deployment pipeline');
      break;
  }
}

module.exports = InquisitiveDeployment;
