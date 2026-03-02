/**
 * n8n Workflow Setup Script
 * 
 * Creates and activates webhook-triggered workflows in n8n for all AI agents.
 * Each workflow: Webhook Trigger → HTTP Request to AI Engine → Respond to Webhook
 * 
 * Usage: node server/utils/n8nSetup.js
 * 
 * Prerequisites:
 *   - n8n running on http://localhost:5678
 *   - Owner account: admin@wms.local / WmsAdmin123!
 *   - AI engine on http://localhost:8001
 */

const http = require('http');
const path = require('path');

const N8N_URL = 'http://localhost:5678';
const AI_ENGINE_URL = 'http://127.0.0.1:8001';
const N8N_EMAIL = 'admin@wms.local';
const N8N_PASSWORD = 'WmsAdmin123!';

// ========== Helper: HTTP request with JSON ==========
function httpRequest(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), cookies: res.headers['set-cookie'] });
        } catch {
          resolve({ status: res.statusCode, data, cookies: res.headers['set-cookie'] });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ========== Login to n8n ==========
async function login() {
  console.log('🔐 Logging in to n8n...');
  const res = await httpRequest(`${N8N_URL}/rest/login`, 'POST', {}, {
    emailOrLdapLoginId: N8N_EMAIL,
    password: N8N_PASSWORD
  });

  if (res.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(res.data)}`);
  }

  const cookie = res.cookies[0].split(';')[0];
  console.log('✅ Logged in successfully');
  return cookie;
}

// ========== Create a workflow ==========
async function createWorkflow(cookie, workflowData) {
  const res = await httpRequest(`${N8N_URL}/rest/workflows`, 'POST', { Cookie: cookie }, workflowData);
  if (res.status !== 200) {
    throw new Error(`Failed to create workflow "${workflowData.name}": ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

// ========== Activate a workflow ==========
async function activateWorkflow(cookie, workflowId) {
  // Get full workflow data to obtain versionId (required by n8n 2.x)
  const detailRes = await httpRequest(`${N8N_URL}/rest/workflows/${workflowId}`, 'GET', { Cookie: cookie });
  const fullWf = detailRes.data.data || detailRes.data;
  const versionId = fullWf.versionId;

  if (fullWf.active) return true; // Already active

  // Activate using POST /activate with versionId
  const res = await httpRequest(
    `${N8N_URL}/rest/workflows/${workflowId}/activate`,
    'POST',
    { Cookie: cookie },
    { versionId }
  );

  const activated = res.data?.data?.active || res.data?.active;
  if (!activated) {
    console.warn(`⚠️  Could not activate workflow ${workflowId}: ${JSON.stringify(res.data)}`);
    return false;
  }
  return true;
}

// ========== Workflow Definitions ==========

function buildWebhookNode(webhookPath, position = [250, 300]) {
  return {
    parameters: {
      httpMethod: 'POST',
      path: webhookPath,
      responseMode: 'responseNode',
      options: {}
    },
    id: `webhook-${webhookPath}`,
    name: 'Webhook',
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2,
    position,
    webhookId: webhookPath
  };
}

function buildHttpRequestNode(name, endpoint, method = 'POST', position = [480, 300]) {
  return {
    parameters: {
      method,
      url: `${AI_ENGINE_URL}${endpoint}`,
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json.body) }}',
      options: {
        timeout: 60000
      }
    },
    id: `http-${endpoint.replace(/\//g, '-')}`,
    name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position
  };
}

function buildRespondNode(position = [720, 300]) {
  return {
    parameters: {
      respondWith: 'json',
      responseBody: '={{ JSON.stringify($json) }}',
      options: {}
    },
    id: 'respond-webhook',
    name: 'Respond to Webhook',
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.1,
    position
  };
}

function buildSimpleWorkflow(name, webhookPath, aiEndpoint, aiMethod = 'POST') {
  const webhook = buildWebhookNode(webhookPath);
  const httpReq = buildHttpRequestNode('Call AI Engine', aiEndpoint, aiMethod);
  const respond = buildRespondNode();

  return {
    name,
    nodes: [webhook, httpReq, respond],
    connections: {
      'Webhook': {
        main: [[{ node: 'Call AI Engine', type: 'main', index: 0 }]]
      },
      'Call AI Engine': {
        main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]]
      }
    },
    settings: {
      executionOrder: 'v1'
    },
    active: false
  };
}

function buildMultiStepWorkflow(name, webhookPath, steps) {
  const webhook = buildWebhookNode(webhookPath, [100, 300]);
  const nodes = [webhook];
  const connections = {};
  let prevNodeName = 'Webhook';

  steps.forEach((step, i) => {
    const xPos = 350 + (i * 280);
    const nodeName = step.name;
    nodes.push({
      parameters: {
        method: step.method || 'POST',
        url: `${AI_ENGINE_URL}${step.endpoint}`,
        sendBody: true,
        specifyBody: 'json',
        jsonBody: JSON.stringify(step.payload || {}),
        options: { timeout: 60000 }
      },
      id: `step-${i}`,
      name: nodeName,
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [xPos, 300]
    });

    connections[prevNodeName] = {
      main: [[{ node: nodeName, type: 'main', index: 0 }]]
    };
    prevNodeName = nodeName;
  });

  // Add merge/set node to collect all results
  const collectPos = [350 + (steps.length * 280), 300];
  nodes.push({
    parameters: {
      mode: 'raw',
      jsonOutput: '={{ { "workflow": "' + name + '", "status": "completed", "results": $json } }}',
      options: {}
    },
    id: 'set-result',
    name: 'Collect Results',
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: collectPos
  });

  connections[prevNodeName] = {
    main: [[{ node: 'Collect Results', type: 'main', index: 0 }]]
  };

  // Add respond node
  const respondPos = [collectPos[0] + 250, 300];
  const respond = buildRespondNode(respondPos);
  nodes.push(respond);

  connections['Collect Results'] = {
    main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]]
  };

  return {
    name,
    nodes,
    connections,
    settings: { executionOrder: 'v1' },
    active: false
  };
}

// ========== All Workflow Definitions ==========

const WORKFLOWS = [
  // 1. Inventory Analysis
  buildSimpleWorkflow(
    'WMS - Inventory Analysis',
    'wms-inventory-analyze',
    '/inventory/analyze',
    'POST'
  ),
  // 2. Market Price Prediction
  buildSimpleWorkflow(
    'WMS - Market Prediction',
    'wms-market-predict',
    '/market/predict',
    'POST'
  ),
  // 3. Anomaly Detection
  buildSimpleWorkflow(
    'WMS - Anomaly Detection',
    'wms-anomaly-detect',
    '/anomaly/detect',
    'POST'
  ),
  // 4. Storage Duration Prediction
  buildSimpleWorkflow(
    'WMS - Storage Duration',
    'wms-predict-duration',
    '/predict-duration',
    'POST'
  ),
  // 5. Loan Risk Assessment
  buildSimpleWorkflow(
    'WMS - Loan Risk Assessment',
    'wms-loan-risk-assess',
    '/loan-risk/assess',
    'POST'
  ),
  // 6. Weighbridge Analysis
  buildSimpleWorkflow(
    'WMS - Weighbridge Analysis',
    'wms-weighbridge-analyze',
    '/weighbridge/analyze',
    'POST'
  ),
  // 7. Chat with AI
  buildSimpleWorkflow(
    'WMS - AI Chat',
    'wms-chat',
    '/chat',
    'POST'
  ),
  // 8. Demand Prediction
  buildSimpleWorkflow(
    'WMS - Demand Prediction',
    'wms-demand-predict',
    '/demand/predict',
    'POST'
  ),
  // 9. Anomaly Alerts (GET)
  buildSimpleWorkflow(
    'WMS - Anomaly Alerts',
    'wms-anomaly-alerts',
    '/anomaly/alerts',
    'GET'
  ),
  // 10. Full AI Analysis (multi-step)
  buildMultiStepWorkflow(
    'WMS - Full AI Analysis',
    'wms-full-analysis',
    [
      { name: 'Market Prediction', endpoint: '/market/predict', method: 'POST', payload: { action: 'predict', grainType: 'all', horizon: '3months' } },
      { name: 'Anomaly Detection', endpoint: '/anomaly/detect', method: 'POST', payload: { action: 'detect' } },
      { name: 'Storage Duration', endpoint: '/predict-duration', method: 'POST', payload: { grain_type: 'rice', total_bags: 100, total_weight_kg: 5000, monthly_rent_per_bag: 50 } },
      { name: 'Inventory Analysis', endpoint: '/inventory/analyze', method: 'POST', payload: { action: 'analyze' } }
    ]
  ),
  // 11. Market + Anomaly Analysis
  buildMultiStepWorkflow(
    'WMS - Market & Anomaly Analysis',
    'wms-market-analysis',
    [
      { name: 'Market Prediction', endpoint: '/market/predict', method: 'POST', payload: { action: 'predict', grainType: 'all', horizon: '3months' } },
      { name: 'Anomaly Detection', endpoint: '/anomaly/detect', method: 'POST', payload: { action: 'detect' } }
    ]
  ),
  // 12. Storage Optimization
  buildMultiStepWorkflow(
    'WMS - Storage Optimization',
    'wms-storage-optimization',
    [
      { name: 'Storage Duration', endpoint: '/predict-duration', method: 'POST', payload: { grain_type: 'rice', total_bags: 100, total_weight_kg: 5000, monthly_rent_per_bag: 50 } },
      { name: 'Inventory Analysis', endpoint: '/inventory/analyze', method: 'POST', payload: { action: 'analyze' } }
    ]
  ),
  // 13. Risk Assessment
  buildMultiStepWorkflow(
    'WMS - Risk Assessment',
    'wms-risk-assessment',
    [
      { name: 'Loan Risk Assessment', endpoint: '/loan-risk/assess', method: 'POST', payload: { action: 'assess' } },
      { name: 'Anomaly Detection', endpoint: '/anomaly/detect', method: 'POST', payload: { action: 'detect' } }
    ]
  )
];

// ========== Webhook Path → n8n URL mapping (for backend integration) ==========
const WEBHOOK_MAP = {};
WORKFLOWS.forEach(wf => {
  const webhookNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
  if (webhookNode) {
    WEBHOOK_MAP[webhookNode.parameters.path] = `${N8N_URL}/webhook/${webhookNode.parameters.path}`;
  }
});

// ========== Main Setup ==========
async function main() {
  console.log('');
  console.log('========================================');
  console.log('  n8n Workflow Setup for WMS');
  console.log('========================================');
  console.log('');

  try {
    // 1. Login
    const cookie = await login();

    // 2. Check existing workflows
    const existingRes = await httpRequest(`${N8N_URL}/rest/workflows`, 'GET', { Cookie: cookie });
    const existing = existingRes.data?.data || [];
    console.log(`📋 Found ${existing.length} existing workflow(s)`);

    // 3. Delete existing WMS workflows to avoid duplicates
    for (const wf of existing) {
      if (wf.name.startsWith('WMS -')) {
        console.log(`🗑️  Deleting old workflow: ${wf.name}`);
        await httpRequest(`${N8N_URL}/rest/workflows/${wf.id}`, 'DELETE', { Cookie: cookie });
      }
    }

    // 4. Create all workflows
    console.log('');
    console.log('📦 Creating workflows...');
    const createdWorkflows = [];

    for (const wfDef of WORKFLOWS) {
      try {
        const result = await createWorkflow(cookie, wfDef);
        const wfData = result.data || result;
        const wfId = wfData.id;
        console.log(`  ✅ Created: ${wfDef.name} (ID: ${wfId})`);
        createdWorkflows.push({ id: wfId, name: wfDef.name, webhookPath: wfDef.nodes[0]?.parameters?.path });
      } catch (err) {
        console.error(`  ❌ Failed: ${wfDef.name} - ${err.message}`);
      }
    }

    // 5. Activate all workflows
    console.log('');
    console.log('⚡ Activating workflows...');
    for (const wf of createdWorkflows) {
      try {
        const activated = await activateWorkflow(cookie, wf.id);
        if (activated) {
          console.log(`  ✅ Activated: ${wf.name}`);
        }
      } catch (err) {
        console.warn(`  ⚠️  Could not activate ${wf.name}: ${err.message}`);
      }
    }

    // 6. Print webhook URLs
    console.log('');
    console.log('========================================');
    console.log('  Webhook URLs (for backend integration)');
    console.log('========================================');
    for (const wf of createdWorkflows) {
      if (wf.webhookPath) {
        console.log(`  ${wf.name}:`);
        console.log(`    POST ${N8N_URL}/webhook/${wf.webhookPath}`);
      }
    }

    // 7. Generate config file for backend
    const configContent = {
      n8nUrl: N8N_URL,
      webhooks: {}
    };
    for (const wf of createdWorkflows) {
      if (wf.webhookPath) {
        const key = wf.webhookPath.replace('wms-', '').replace(/-/g, '_');
        configContent.webhooks[key] = `${N8N_URL}/webhook/${wf.webhookPath}`;
      }
    }

    const configPath = path.join(__dirname, '..', 'config', 'n8nWebhooks.json');
    require('fs').mkdirSync(path.dirname(configPath), { recursive: true });
    require('fs').writeFileSync(configPath, JSON.stringify(configContent, null, 2));
    console.log('');
    console.log(`📄 Webhook config saved to: ${configPath}`);

    console.log('');
    console.log('========================================');
    console.log('  ✅ Setup Complete!');
    console.log('========================================');
    console.log('');
    console.log('  n8n UI:     http://localhost:5678');
    console.log('  Credentials: admin@wms.local / WmsAdmin123!');
    console.log('');
    console.log(`  ${createdWorkflows.length} workflows created and activated.`);
    console.log('  Open n8n UI to see workflow execution history.');
    console.log('');

  } catch (err) {
    console.error('');
    console.error('❌ Setup failed:', err.message);
    console.error('');
    console.error('Make sure:');
    console.error('  1. n8n is running: n8n start --port 5678');
    console.error('  2. Owner account exists: admin@wms.local / WmsAdmin123!');
    console.error('  3. AI engine is running on port 8001');
    process.exit(1);
  }
}

main();
